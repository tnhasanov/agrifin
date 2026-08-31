import { sorgu } from "./db.js";
import { sahəHektar } from "./geo.js";
import { konturHash } from "./konturHash.js";
import { tarixceGetir } from "./tarixceGetir.js";
import { CEDVEL, mehsuldarliqIndeksi } from "./mehsuldarliq.js";

/**
 * SAHƏ SÜBUTU — anderraytinqin oxumağa İCAZƏSİ OLAN yeganə mənbə.
 *
 * ═══ NİYƏ AYRICA MODUL ═══════════════════════════════════════════════
 * Kredit qərarı iki rəqəmə söykənir: sahənin ÖLÇÜSÜ (gəlir ona vurulur)
 * və mövsüm TARİXÇƏSİ (FarmScore ondan çıxır). Əvvəl hər ikisi klientdən
 * gəlirdi:
 *   • hektar sorğu gövdəsindən yazılırdı (api/sahe.js);
 *   • mövsüm tarixçəsi brauzerin göndərdiyi snapshot idi.
 * Yəni limitin girişini fermerin öz cihazı yazırdı. Bu modul həmin girişi
 * bağlayır: ölçü konturdan hesablanır, tarixçəni server ÖZÜ gətirir,
 * FarmScore serverdə hesablanır.
 *
 * ═══ TƏZƏLİK QAYDASI ═════════════════════════════════════════════════
 * Hər müraciətdə Copernicus-a sorğu göndərmək həm baha, həm yavaşdır
 * (tarixçə ~2 emal vahidi, cavab saniyələrlə ölçülür). Ona görə serverin
 * öz yazdığı snapshot MAX_YAS_GUN qədər təzə sayılır. Tarixçə onsuz da
 * ildə bir dəfə mənalı dəyişir (mövsüm zirvəsi) — 14 gün təhlükəsizdir.
 *
 * ═══ UĞURSUZLUQ = AVTOMATİK TƏSDİQ DEYİL ═════════════════════════════
 * Copernicus əlçatmazdırsa və təzə server snapshot-u yoxdursa, qərar
 * AVTOMATİK VERİLMİR: `hal: "subutYoxdur"` qayıdır və müraciət əl ilə
 * baxışa düşür. Klientin snapshot-una keçmək qapını yenidən açardı.
 */

/** Serverin yazdığı snapshot bu qədər gündən sonra təzələnir */
export const MAX_YAS_GUN = 14;

/** Bal cədvəli dəyişəndə versiya da dəyişir — jurnal hansı çəkiləri bilməlidir */
export const CEDVEL_VERSIYASI = `v1-${CEDVEL.map((a) => `${a.key}${a.maxXal}`).join(".")}`;

/**
 * İstifadəçinin sahəsi üçün SERVER TƏSDİQLİ sübut toplayır.
 *
 * @param {object} p
 * @param {number} p.istifadeciId
 * @param {Date}   [p.indi]
 * @param {boolean} [p.mecburiTezele] true olsa keş yaşına baxmadan yenidən gətirir
 * @returns {Promise<
 *   | {hal: "yoxdur"}                                   sahə çəkilməyib
 *   | {hal: "subutYoxdur", sebeb: string, sahe}         peyk sübutu alınmadı
 *   | {hal: "hazir", sahe, hektar, konturHash, movsumler, indeks, menbe}
 * >}
 */
export async function saheSubutu({ istifadeciId, indi = new Date(), mecburiTezele = false }) {
  const [sahe] = await sorgu(
    "SELECT id, noqteler, hektar, hektar_server, kontur_hash, bitki FROM saheler WHERE istifadeci_id=$1",
    [istifadeciId],
  );
  if (!sahe) return { hal: "yoxdur" };

  const noqteler = typeof sahe.noqteler === "string" ? JSON.parse(sahe.noqteler) : sahe.noqteler;

  // ── Ölçü: HƏMİŞƏ konturdan yenidən hesablanır ──────────────────────
  // Saxlanmış hektar_server-ə də güvənmirik: kontur köhnə sətirdə
  // backfill-dən əvvəlki ola bilər. Hesablama ucuzdur (saf funksiya).
  const hektar = sahəHektar(noqteler);
  const hash = konturHash(noqteler);

  // ── Tarixçə: yalnız SERVERİN öz yazdığı, KONTURA UYĞUN, TƏZƏ sətir ──
  const [saxlanan] = await sorgu(
    `SELECT mezmun, yaradilib FROM peyk_snapshotlar
      WHERE sahe_id=$1 AND nov='tarixce' AND menbe='server' AND kontur_hash=$2`,
    [sahe.id, hash],
  );
  const yas = saxlanan ? (indi - new Date(saxlanan.yaradilib)) / 86_400_000 : Infinity;
  let movsumler = Array.isArray(saxlanan?.mezmun?.movsumler) ? saxlanan.mezmun.movsumler : null;
  let menbe = "keş";

  if (mecburiTezele || !movsumler || yas > MAX_YAS_GUN) {
    const netice = await tarixceGetir({ noqteler }).catch((xeta) => {
      console.error("saheSubutu tarixce:", xeta?.message);
      return { ok: false, sebeb: "peykXetasi" };
    });
    if (netice.ok) {
      movsumler = netice.movsumler;
      menbe = "peyk";
      await snapshotYaz({ saheId: sahe.id, hash, netice });
    } else if (!movsumler) {
      // Nə təzə sorğu, nə köhnə server snapshot-u — qərar verilə bilməz.
      // KLİENT SNAPSHOT-UNA KEÇMİRİK: bağladığımız qapı elə odur.
      return { hal: "subutYoxdur", sebeb: netice.sebeb ?? "peykXetasi", sahe: { ...sahe, hektar } };
    }
    // Sorğu alınmadı, amma köhnə SERVER snapshot-u var — onunla davam
    // edilir: köhnə server ölçməsi klient məlumatından etibarlıdır.
  }

  // ── FarmScore SERVERDƏ ─────────────────────────────────────────────
  // Eyni saf funksiya klientdə də işləyir (ekranda göstərmək üçün), amma
  // QƏRARA gedən dəyər yalnız buradakıdır.
  const indeks = mehsuldarliqIndeksi({ movsumler });

  return {
    hal: "hazir",
    sahe: { id: sahe.id, bitki: sahe.bitki },
    hektar,
    konturHash: hash,
    movsumler,
    indeks,
    menbe,
  };
}

/** Server snapshot-unu yazır — klient sətrini əvəz etmir (menbe ayrıdır) */
async function snapshotYaz({ saheId, hash, netice }) {
  await sorgu(
    `INSERT INTO peyk_snapshotlar
       (sahe_id, nov, mezmun, menbe, kontur_hash, hesablama_versiyasi, dovr_son)
     VALUES ($1, 'tarixce', $2, 'server', $3, $4, CURRENT_DATE)
     ON CONFLICT (sahe_id, nov, menbe) DO UPDATE
       SET mezmun=$2, kontur_hash=$3, hesablama_versiyasi=$4,
           dovr_son=CURRENT_DATE, yaradilib=now()`,
    [
      saheId,
      JSON.stringify({ movsumler: netice.movsumler, ilkIl: netice.ilkIl, menbe: netice.menbe }),
      hash,
      CEDVEL_VERSIYASI,
    ],
  ).catch((xeta) => {
    // Snapshot yazıla bilmədisə qərar yenə verilə bilər — sübut əlimizdədir.
    // Ancaq loga düşməlidir: növbəti müraciət yenidən Copernicus çağıracaq.
    console.error("saheSubutu snapshot yazılmadı:", xeta?.message);
  });
}

/** Qərarın balını jurnala SERVER damğası ilə yazır (audit izi) */
export async function balJurnalinaYaz({ saheId, indeks, hash }) {
  if (!indeks || indeks.hal !== "hazir") return;
  await sorgu(
    `INSERT INTO bal_jurnali
       (sahe_id, bal, bant, etibar, amiller, cedvel_versiyasi, menbe, kontur_hash)
     VALUES ($1, $2, $3, $4, $5, $6, 'server', $7)`,
    [
      saheId,
      indeks.bal,
      indeks.bant,
      indeks.etibar,
      JSON.stringify(indeks.amiller ?? {}),
      CEDVEL_VERSIYASI,
      hash,
    ],
  ).catch((xeta) => console.error("bal jurnalı yazılmadı:", xeta?.message));
}
