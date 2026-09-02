import { jsPDF } from "jspdf";
import { SRIFT_ADI, SRIFT_NORMAL, SRIFT_QALIN } from "./sriftler.js";

/**
 * SAHƏ PASPORTU — PDF çəkilişi.
 *
 * Bu modul YALNIZ çəkir: nəyin göstəriləcəyinə hesabatMelumati.js qərar verir.
 * Ona görə burada "əgər ölçmə varsa" məntiqi minimumdur — gələn məlumat
 * onsuz da süzülüb.
 *
 * QRAFİKLƏR VEKTORDUR (xətt, düzbucaq, dairə), şəkil deyil: fayl kiçik qalır,
 * çap keyfiyyəti isə itmir. Yeganə rastr — sahənin peyk şəkli, o da elə
 * ölçmənin özüdür (10×10 m piksel).
 *
 * ŞRİFT: PDF-in daxili Helvetica-sı "ə, ş, ğ, ı" hərflərini tanımır və qara
 * qutu çəkir. Ona görə alt çoxluğa salınmış DejaVu yerləşdirilir
 * (bax: sriftler.js). Modul dinamik idxal olunur — şrift yalnız hesabat
 * düyməsinə basılanda yüklənir.
 */

// A4, millimetr
const EN = 210;
const HUND = 297;
const KENAR = 14;
const SUTUN = EN - KENAR * 2;

const RENG = {
  pine: [20, 53, 31],
  field: [46, 125, 79],
  fieldSoft: [233, 245, 238],
  ink: [26, 33, 28],
  muted: [107, 117, 104],
  line: [227, 232, 224],
  mist: [239, 242, 236],
  gold: [201, 147, 43],
  goldSoft: [251, 241, 218],
  mal: [75, 44, 163],
  malSoft: [242, 238, 245],
  danger: [194, 74, 63],
  ag: [255, 255, 255],
};

/** Bant → rəng (bal kartı üçün) */
const BANT_RENGI = {
  yuksek: RENG.field,
  yaxsi: RENG.field,
  orta: RENG.gold,
  zeif: RENG.danger,
};

function sriftQur(doc) {
  doc.addFileToVFS("AgriFinAz.ttf", SRIFT_NORMAL);
  doc.addFont("AgriFinAz.ttf", SRIFT_ADI, "normal");
  doc.addFileToVFS("AgriFinAz-Bold.ttf", SRIFT_QALIN);
  doc.addFont("AgriFinAz-Bold.ttf", SRIFT_ADI, "bold");
  doc.setFont(SRIFT_ADI, "normal");
}

const metn = (doc, s, x, y, { olcu = 9, qalin = false, reng = RENG.ink, sag = false } = {}) => {
  doc.setFont(SRIFT_ADI, qalin ? "bold" : "normal");
  doc.setFontSize(olcu);
  doc.setTextColor(...reng);
  doc.text(String(s), x, y, sag ? { align: "right" } : undefined);
};

/** Yumşaq künclü kart — ekrandakı səthlərin PDF qarşılığı */
function kart(doc, x, y, en, hund, { fon = RENG.ag, kenar = RENG.line } = {}) {
  doc.setFillColor(...fon);
  doc.setDrawColor(...kenar);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, en, hund, 2.5, 2.5, "FD");
}

function bolmeBasligi(doc, s, y) {
  metn(doc, s, KENAR, y, { olcu: 11, qalin: true, reng: RENG.pine });
  doc.setDrawColor(...RENG.line);
  doc.setLineWidth(0.4);
  doc.line(KENAR, y + 1.8, EN - KENAR, y + 1.8);
  return y + 8;
}

/** Səhifə başlığı: tünd yaşıl zolaq, ad və tarix */
function basliqZolagi(doc, { basliq, altyazi, tarix }) {
  doc.setFillColor(...RENG.pine);
  doc.rect(0, 0, EN, 26, "F");
  // Marka nişanı — yarpaq əvəzi sadə dairə + qövs
  doc.setFillColor(...RENG.field);
  doc.circle(KENAR + 4, 13, 4, "F");
  doc.setDrawColor(...RENG.ag);
  doc.setLineWidth(0.8);
  doc.line(KENAR + 2, 14.5, KENAR + 6, 10.5);

  metn(doc, "AgriFin", KENAR + 11, 11.5, { olcu: 13, qalin: true, reng: RENG.ag });
  metn(doc, basliq, KENAR + 11, 17.5, { olcu: 9, reng: [201, 220, 208] });
  metn(doc, altyazi, EN - KENAR, 11.5, { olcu: 8, reng: [201, 220, 208], sag: true });
  metn(doc, tarix, EN - KENAR, 17.5, { olcu: 8, reng: RENG.ag, sag: true });
}

function altbilgi(doc, { sehife, cemi, qeyd }) {
  doc.setDrawColor(...RENG.line);
  doc.setLineWidth(0.3);
  doc.line(KENAR, HUND - 16, EN - KENAR, HUND - 16);
  metn(doc, qeyd, KENAR, HUND - 11, { olcu: 7, reng: RENG.muted });
  metn(doc, `${sehife} / ${cemi}`, EN - KENAR, HUND - 11, { olcu: 7, reng: RENG.muted, sag: true });
}

/** Mərkəzləşdirilmiş mətn */
function ortaMetn(doc, s, mərkəz, y, secim = {}) {
  doc.setFont(SRIFT_ADI, secim.qalin ? "bold" : "normal");
  doc.setFontSize(secim.olcu ?? 9);
  doc.setTextColor(...(secim.reng ?? RENG.ink));
  doc.text(String(s), mərkəz, y, { align: "center" });
}

/**
 * Vegetasiya qrafiki: sahənin əyrisi + rayon medianı (varsa) üfüqi kəsik xətt.
 * Y oxu 0…0.9 NDVI, X oxu ölçmə sırası.
 */
function vegetasiyaQrafiki(doc, x, y, en, hund, { seriya, medyan, etiketler }) {
  kart(doc, x, y, en, hund);
  const pad = { sol: 12, sag: 4, ust: 6, alt: 9 };
  const qx = x + pad.sol;
  const qy = y + pad.ust;
  const qEn = en - pad.sol - pad.sag;
  const qHund = hund - pad.ust - pad.alt;

  const MAX = 0.9;
  const yer = (ndvi) => qy + qHund - (Math.min(Math.max(ndvi, 0), MAX) / MAX) * qHund;

  // Şəbəkə və şkala
  doc.setDrawColor(...RENG.line);
  doc.setLineWidth(0.2);
  [0.2, 0.4, 0.6, 0.8].forEach((v) => {
    doc.line(qx, yer(v), qx + qEn, yer(v));
    metn(doc, `${Math.round(v * 100)}%`, qx - 2, yer(v) + 1, { olcu: 6.5, reng: RENG.muted, sag: true });
  });

  if (Number.isFinite(medyan)) {
    doc.setDrawColor(...RENG.muted);
    doc.setLineWidth(0.4);
    doc.setLineDashPattern([1.2, 1.2], 0);
    doc.line(qx, yer(medyan), qx + qEn, yer(medyan));
    doc.setLineDashPattern([], 0);
    // Etiket SOLDA qalır: son ölçmənin nöqtəsi sağ ucdadır, üst-üstə düşərdi
    metn(doc, etiketler.medyan, qx + 1.5, yer(medyan) - 1.5, { olcu: 6.5, reng: RENG.muted });
  }

  if (seriya.length > 1) {
    const addim = qEn / (seriya.length - 1);
    doc.setDrawColor(...RENG.field);
    doc.setLineWidth(0.9);
    seriya.forEach((s, i) => {
      if (i === 0) return;
      doc.line(qx + (i - 1) * addim, yer(seriya[i - 1].ndvi), qx + i * addim, yer(s.ndvi));
    });
    // Son nöqtə vurğulanır — "bu gün buradayıq"
    doc.setFillColor(...RENG.field);
    doc.circle(qx + (seriya.length - 1) * addim, yer(seriya.at(-1).ndvi), 1.1, "F");
  }

  metn(doc, etiketler.sol, qx, y + hund - 3, { olcu: 6.5, reng: RENG.muted });
  metn(doc, etiketler.sag, qx + qEn, y + hund - 3, { olcu: 6.5, reng: RENG.muted, sag: true });
  return y + hund + 5;
}

/** Mövsümlər üzrə zirvə — sütun qrafiki, boş illər qırmızı */
function movsumQrafiki(doc, x, y, en, hund, { movsumler, etiketler }) {
  kart(doc, x, y, en, hund);
  const pad = { sol: 10, sag: 4, ust: 6, alt: 10 };
  const qx = x + pad.sol;
  const qy = y + pad.ust;
  const qEn = en - pad.sol - pad.sag;
  const qHund = hund - pad.ust - pad.alt;
  const MAX = 0.9;

  doc.setDrawColor(...RENG.line);
  doc.setLineWidth(0.2);
  [0.3, 0.6, 0.9].forEach((v) => {
    const yy = qy + qHund - (v / MAX) * qHund;
    doc.line(qx, yy, qx + qEn, yy);
    metn(doc, `${Math.round(v * 100)}%`, qx - 2, yy + 1, { olcu: 6.5, reng: RENG.muted, sag: true });
  });

  if (!movsumler.length) {
    metn(doc, etiketler.bos, x + en / 2, y + hund / 2, { olcu: 8, reng: RENG.muted });
    return y + hund + 5;
  }

  const addim = qEn / movsumler.length;
  const sutunEn = Math.min(addim * 0.6, 9);
  movsumler.forEach((m, i) => {
    const h = Math.max(1, (Math.min(m.zirve, MAX) / MAX) * qHund);
    const sx = qx + i * addim + (addim - sutunEn) / 2;
    const reng = m.bos ? RENG.danger : m.davamEdir ? RENG.muted : RENG.field;
    doc.setFillColor(...reng);
    doc.roundedRect(sx, qy + qHund - h, sutunEn, h, 0.6, 0.6, "F");
    ortaMetn(doc, String(m.il).slice(2), sx + sutunEn / 2, y + hund - 3.5, {
      olcu: 6.5,
      reng: RENG.muted,
    });
    // Rayon medianı varsa sütunun üstündə kiçik tire ilə göstərilir
    if (Number.isFinite(m.etrafMedyan)) {
      const my = qy + qHund - (Math.min(m.etrafMedyan, MAX) / MAX) * qHund;
      doc.setDrawColor(...RENG.muted);
      doc.setLineWidth(0.5);
      doc.line(sx - 0.8, my, sx + sutunEn + 0.8, my);
    }
  });
  return y + hund + 5;
}

/** Bir amil sətrinin tutduğu hündürlük — kartın ölçüsü buradan hesablanır */
const AMIL_HUND = 7.8;

/** Üfüqi zolaq — FarmScore amilləri üçün */
function amilZolagi(doc, x, y, en, { ad, xal, maxXal }) {
  const nisbet = xal == null ? 0 : Math.max(0, Math.min(1, xal / maxXal));
  metn(doc, ad, x, y, { olcu: 8 });
  metn(doc, xal == null ? "—" : `${xal}/${maxXal}`, x + en, y, {
    olcu: 8,
    qalin: true,
    reng: xal == null ? RENG.muted : RENG.ink,
    sag: true,
  });
  const zy = y + 1.8;
  doc.setFillColor(...RENG.mist);
  doc.roundedRect(x, zy, en, 2, 1, 1, "F");
  if (nisbet > 0) {
    doc.setFillColor(...(nisbet >= 0.75 ? RENG.field : nisbet >= 0.5 ? RENG.gold : RENG.danger));
    doc.roundedRect(x, zy, en * nisbet, 2, 1, 1, "F");
  }
  return y + AMIL_HUND;
}

/** Gəlir aralığı: uclar + orta ssenarinin nişanı */
function araliqZolagi(doc, x, y, en, { asagi, yuxari, orta, etiketler, money }) {
  const genislik = yuxari - asagi;
  const nisbet = genislik > 0 ? (orta - asagi) / genislik : 0.5;
  doc.setFillColor(...RENG.fieldSoft);
  doc.roundedRect(x, y, en, 3, 1.5, 1.5, "F");
  doc.setFillColor(...RENG.field);
  doc.circle(x + en * nisbet, y + 1.5, 2, "F");
  doc.setDrawColor(...RENG.ag);
  doc.setLineWidth(0.5);
  doc.circle(x + en * nisbet, y + 1.5, 2, "S");

  metn(doc, money(asagi), x, y + 8, { olcu: 7.5, reng: RENG.muted });
  metn(doc, money(yuxari), x + en, y + 8, { olcu: 7.5, reng: RENG.muted, sag: true });
  ortaMetn(doc, `${etiketler.orta}: ${money(orta)}`, x + en / 2, y + 8, {
    olcu: 7.5,
    qalin: true,
    reng: RENG.ink,
  });
  return y + 12;
}

/**
 * Ad–dəyər cədvəli. Sətirlər bir-birinin ardınca düzülür və SON KURSOR
 * qaytarılır — hər çağırışın nəticəsini ayrıca dəyişənə yazmaq lazım
 * gəlmir, ona görə sətirlərin üst-üstə düşməsi mümkün deyil.
 */
function cedvel(doc, x, y, en, setirler) {
  let cy = y;
  for (const [ad, deyer, secim] of setirler) {
    if (deyer == null) continue;
    cy = setir(doc, x, cy, en, ad, deyer, secim ?? {});
  }
  return cy;
}

/** Ad–dəyər sətri (cədvəl) */
function setir(doc, x, y, en, ad, deyer, { vurgu = false } = {}) {
  metn(doc, ad, x, y, { olcu: 8.5, reng: RENG.muted });
  metn(doc, deyer, x + en, y, {
    olcu: 8.5,
    qalin: true,
    reng: vurgu ? RENG.field : RENG.ink,
    sag: true,
  });
  doc.setDrawColor(...RENG.line);
  doc.setLineWidth(0.2);
  doc.line(x, y + 2, x + en, y + 2);
  return y + 7;
}

/**
 * Sənədi qurur.
 *
 * @param {object} arg
 * @param {object} arg.melumat  hesabatMelumati() nəticəsi
 * @param {Function} arg.t      i18n
 * @param {Function} arg.money  məbləğ formatlayıcı
 * @returns {jsPDF}
 */
export function pdfQur({ melumat, t, money, formatNumber, lang = "az" }) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  sriftQur(doc);

  const say = (v, d = 0) => (Number.isFinite(v) ? formatNumber(Number(v.toFixed(d)), lang) : "—");
  const tarixQisa = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join(".") : "—");
  const bitkiAdi = melumat.sahe.bitkiKey ? t(`kbcrop.${melumat.sahe.bitkiKey}`) : t("pdf.bitkiYox");

  doc.setProperties({
    title: `AgriFin — ${t("pdf.basliq")}`,
    subject: t("pdf.altyazi"),
    creator: "AgriFin",
  });

  // ══ SƏHİFƏ 1 ══════════════════════════════════════════════════════
  basliqZolagi(doc, {
    basliq: t("pdf.basliq"),
    altyazi: t("pdf.yaradilib"),
    tarix: tarixQisa(melumat.yaradilib),
  });

  let y = 36;

  // ── Kimlik + peyk şəkli ───────────────────────────────────────────
  const solEn = SUTUN * 0.56;
  const sagX = KENAR + solEn + 6;
  const sagEn = SUTUN - solEn - 6;

  kart(doc, KENAR, y, solEn, 46);
  let ky = y + 8;
  metn(doc, bitkiAdi, KENAR + 5, ky, { olcu: 14, qalin: true, reng: RENG.pine });
  ky += 6;
  metn(doc, `${say(melumat.sahe.hektar, 2)} ha · ${melumat.fermer.rayon ?? "—"}`, KENAR + 5, ky, {
    olcu: 9,
    reng: RENG.muted,
  });
  ky += 8;
  const kEn = solEn - 10;
  cedvel(doc, KENAR + 5, ky, kEn, [
    [t("pdf.fermer"), melumat.fermer.ad],
    [t("pdf.telefon"), melumat.fermer.telefon],
    [t("pdf.koordinat"), melumat.fermer.koordinat],
  ]);

  // Peyk şəkli — sənəddəki yeganə rastr. Yoxdursa konturun özü çəkilir.
  kart(doc, sagX, y, sagEn, 46, { fon: RENG.mist });
  if (melumat.sahe.sekil) {
    try {
      doc.addImage(melumat.sahe.sekil, "PNG", sagX + 3, y + 3, sagEn - 6, 34, undefined, "FAST");
    } catch {
      // Şəkil pozulubsa sənəd yenə çıxsın — sübutun qalanı yerindədir
    }
  }
  ortaMetn(doc, t("pdf.sekilAlt"), sagX + sagEn / 2, y + 43, { olcu: 6.5, reng: RENG.muted });

  y += 52;

  // ── Cari vəziyyət ─────────────────────────────────────────────────
  y = bolmeBasligi(doc, t("pdf.cariVeziyyet"), y);

  const faktlar = [
    {
      etiket: t("home.cropHealth"),
      deyer: melumat.olculen.faiz != null ? `${say(melumat.olculen.faiz)}%` : "—",
      reng: RENG.field,
    },
    {
      etiket: t("pano.torpaqRutubeti"),
      deyer: melumat.olculen.suSeviyyesi ? t(`pano.su.${melumat.olculen.suSeviyyesi}`) : "—",
    },
    {
      etiket: t("pano.sonYenilenme"),
      deyer:
        melumat.olculen.gunEvvel == null
          ? "—"
          : melumat.olculen.gunEvvel === 0
            ? t("pano.buGun")
            : t("pano.gunEvvel", { gun: melumat.olculen.gunEvvel }),
    },
  ];
  kart(doc, KENAR, y, SUTUN, 20, { fon: RENG.mist, kenar: RENG.mist });
  faktlar.forEach((f, i) => {
    const en = SUTUN / faktlar.length;
    const x = KENAR + i * en;
    if (i > 0) {
      doc.setDrawColor(...RENG.line);
      doc.setLineWidth(0.3);
      doc.line(x, y + 4, x, y + 16);
    }
    ortaMetn(doc, f.etiket, x + en / 2, y + 8, { olcu: 7.5, reng: RENG.muted });
    ortaMetn(doc, f.deyer, x + en / 2, y + 15, { olcu: 12, qalin: true, reng: f.reng ?? RENG.ink });
  });
  y += 26;

  // ── Vegetasiya dinamikası ─────────────────────────────────────────
  y = bolmeBasligi(doc, t("veg.basliq"), y);
  y = vegetasiyaQrafiki(doc, KENAR, y, SUTUN, 44, {
    seriya: melumat.olculen.seriya,
    medyan: melumat.muqayise?.medyan ?? null,
    etiketler: {
      medyan: t("pdf.rayonMedyani"),
      sol: tarixQisa(melumat.olculen.seriya[0]?.son),
      sag: tarixQisa(melumat.olculen.seriya.at(-1)?.son),
    },
  });

  // ── Mövsüm tarixçəsi ──────────────────────────────────────────────
  // Ölçmələr bir səhifədə toplanır: birinci vərəq "sahə nə vəziyyətdədir",
  // ikincisi "bu nə deməkdir" sualına cavab verir.
  y = bolmeBasligi(doc, t("pdf.movsumTarixcesi"), y);
  y = movsumQrafiki(doc, KENAR, y, SUTUN, 38, {
    movsumler: melumat.olculen.movsumler,
    etiketler: { bos: t("pdf.movsumYoxdur") },
  });

  // ── Rayonla müqayisə ──────────────────────────────────────────────
  if (melumat.muqayise) {
    y = bolmeBasligi(doc, t("pdf.muqayise"), y);
    kart(doc, KENAR, y, SUTUN, 24);
    const zEn = SUTUN - 20;
    const zx = KENAR + 10;
    const zy = y + 10;
    doc.setFillColor(...RENG.mist);
    doc.roundedRect(zx, zy, zEn, 3, 1.5, 1.5, "F");
    const medyanFaiz = melumat.muqayise.medyanFaiz ?? 0;
    const sizinFaiz = melumat.olculen.faiz ?? 0;
    const maxFaiz = Math.max(medyanFaiz, sizinFaiz, 1);
    doc.setDrawColor(...RENG.muted);
    doc.setLineWidth(0.6);
    doc.line(zx + zEn * (medyanFaiz / maxFaiz), zy - 2, zx + zEn * (medyanFaiz / maxFaiz), zy + 5);
    doc.setFillColor(...RENG.field);
    doc.circle(zx + zEn * (sizinFaiz / maxFaiz), zy + 1.5, 2, "F");
    metn(doc, `${t("pdf.sizinSahe")}: ${say(sizinFaiz)}%`, zx, zy + 10, { olcu: 8, qalin: true });
    metn(doc, `${t("pdf.rayonMedyani")}: ${say(medyanFaiz)}%`, zx + zEn, zy + 10, {
      olcu: 8,
      reng: RENG.muted,
      sag: true,
    });
    y += 30;
  }

  altbilgi(doc, { sehife: 1, cemi: 2, qeyd: t("pdf.altQeyd") });

  // ══ SƏHİFƏ 2 ══════════════════════════════════════════════════════
  doc.addPage();
  basliqZolagi(doc, {
    basliq: t("pdf.basliq2"),
    altyazi: t("pdf.yaradilib"),
    tarix: tarixQisa(melumat.yaradilib),
  });
  y = 36;

  // ── FarmScore ─────────────────────────────────────────────────────
  y = bolmeBasligi(doc, t("indeks.basliq"), y);
  if (melumat.bal) {
    const balHund = 33 + melumat.bal.setirler.length * AMIL_HUND;
    kart(doc, KENAR, y, SUTUN, balHund);
    const bReng = BANT_RENGI[melumat.bal.bant] ?? RENG.muted;
    doc.setFillColor(...bReng);
    doc.circle(KENAR + 16, y + 16, 11, "F");
    ortaMetn(doc, String(melumat.bal.bal), KENAR + 16, y + 19, {
      olcu: 17,
      qalin: true,
      reng: RENG.ag,
    });
    metn(
      doc,
      melumat.bal.bant ? t(`indeks.bant.${melumat.bal.bant}`) : t("indeks.bantYoxdur"),
      KENAR + 32,
      y + 12,
      { olcu: 11, qalin: true, reng: RENG.pine },
    );
    metn(
      doc,
      `${t("indeks.etibarEtiket")}: ${t(`indeks.etibar.${melumat.bal.etibar}`)} · ${t("indeks.movsum", { say: melumat.bal.movsumSayi })}`,
      KENAR + 32,
      y + 18,
      { olcu: 8, reng: RENG.muted },
    );
    if (melumat.bal.natamam) {
      metn(doc, t("indeks.natamam", { xal: melumat.bal.elcatanXal }), KENAR + 32, y + 23, {
        olcu: 7.5,
        reng: RENG.gold,
      });
    }

    let ay = y + 30;
    melumat.bal.setirler.forEach((s) => {
      ay = amilZolagi(doc, KENAR + 5, ay, SUTUN - 10, {
        ad: t(`indeks.amil.${s.id}`),
        xal: s.xal,
        maxXal: s.maxXal,
      });
    });
    y += balHund + 6;
  } else {
    kart(doc, KENAR, y, SUTUN, 16);
    metn(doc, t("pdf.balYoxdur"), KENAR + 5, y + 10, { olcu: 8.5, reng: RENG.muted });
    y += 22;
  }

  // ── Məhsuldarlıq və gəlir ─────────────────────────────────────────
  y = bolmeBasligi(doc, t("pdf.mehsuldarliq"), y);
  if (melumat.gelir) {
    const gHund = 56;
    kart(doc, KENAR, y, SUTUN, gHund);
    const gEn = SUTUN - 10;
    const gy = cedvel(doc, KENAR + 5, y + 8, gEn, [
      [
        t("pdf.gozlenilenMehsul"),
        melumat.gelir.mehsuldarliq
          ? `${say(melumat.gelir.mehsuldarliq.deyer, 1)} ${melumat.gelir.mehsuldarliq.vahid}`
          : null,
      ],
      [
        t("pdf.qiymet"),
        melumat.gelir.qiymet ? `${say(melumat.gelir.qiymet.deyer)} ${melumat.gelir.qiymet.vahid}` : null,
      ],
      [t("movsumPulu.xerc"), Number.isFinite(melumat.gelir.xerc) ? money(melumat.gelir.xerc) : null],
    ]);

    metn(doc, t("movsumPulu.gelir"), KENAR + 5, gy + 4, { olcu: 8.5, reng: RENG.muted });
    araliqZolagi(doc, KENAR + 5, gy + 7, gEn, {
      asagi: Math.max(0, melumat.gelir.pessimist ?? 0),
      yuxari: Math.max(0, melumat.gelir.optimist ?? 0),
      orta: Math.max(0, melumat.gelir.baza ?? 0),
      etiketler: { orta: t("pdf.ortaSsenari") },
      money,
    });

    metn(doc, t("pdf.modelQeydi"), KENAR + 5, y + gHund - 4, { olcu: 7, reng: RENG.gold });
    y += gHund + 6;
  } else {
    kart(doc, KENAR, y, SUTUN, 16);
    metn(doc, t("pdf.gelirYoxdur"), KENAR + 5, y + 10, { olcu: 8.5, reng: RENG.muted });
    y += 22;
  }

  // ── Kredit (yalnız serverdə aktiv kredit varsa) ───────────────────
  if (melumat.kredit) {
    y = bolmeBasligi(doc, t("maliyye.aktiv"), y);
    kart(doc, KENAR, y, SUTUN, 24, { fon: RENG.malSoft, kenar: RENG.malSoft });
    cedvel(doc, KENAR + 5, y + 8, SUTUN - 10, [
      [t("maliyye.esasQaliq"), money(melumat.kredit.qaliqBorc)],
      [t("maliyye.novbetiOdenis"), melumat.kredit.novbetiTarix ? tarixQisa(melumat.kredit.novbetiTarix) : null],
    ]);
    y += 30;
  }

  // ── Məlumat keyfiyyəti ────────────────────────────────────────────
  y = bolmeBasligi(doc, t("sahe.melumatKeyfiyyeti"), y);
  kart(doc, KENAR, y, SUTUN, 24, { fon: RENG.fieldSoft, kenar: RENG.fieldSoft });
  cedvel(doc, KENAR + 5, y + 8, SUTUN - 10, [
    [t("pdf.menbe"), "Sentinel-2 · Copernicus"],
    [t("pdf.olcmeSayi"), say(melumat.olculen.olcmeSayi)],
    [t("pdf.sonOlcme"), tarixQisa(melumat.olculen.tarix)],
  ]);

  altbilgi(doc, { sehife: 2, cemi: 2, qeyd: t("pdf.altQeyd") });

  return doc;
}
