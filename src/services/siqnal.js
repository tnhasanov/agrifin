import { necheGunEvvel, ortukFaizi } from "./ndvi.js";

/**
 * Sahə siqnalları — proqnozla peyk ölçməsini birləşdirib fermerə RƏQƏM yox,
 * QƏRAR verir.
 *
 * Niyə ayrıca modul: qaydalar saf funksiyadır (React yoxdur, şəbəkə yoxdur),
 * ona görə hər həddi ayrıca test etmək olur. Ekranlar yalnız nəticəni çəkir.
 *
 * Niyə birləşdirilir: "NDVI düşür" tək başına fermerə heç nə demir. Düşmə +
 * quraq torpaq = suvar. Düşmə + kifayət su = su deyil, yarpağa bax. Eyni
 * ölçmə, iki tamam fərqli iş. Ayrı-ayrı göstərilən rəqəmlər bu fərqi
 * fermerin öz üzərinə atır.
 */

/**
 * Hədlər bir yerdədir ki, aqronom baxanda dəyişdirə bilsin.
 * DİQQƏT: bunlar ümumi kənd təsərrüfatı praktikasıdır, bitkiyə görə
 * dəqiqləşdirilməyib — aqronom təsdiqindən sonra bitkiyə görə ayrılmalıdır.
 */
export const HEDDLER = {
  // Hava stansiyası 2 m hündürlükdə ölçür; yer səthində şaxta hava +2°-də
  // başlaya bilər, ona görə xəbərdarlıq 0-dan yox, 2-dən verilir
  saxtaTecili: 0,
  saxtaDiqqet: 2,
  istiTecili: 40,
  istiDiqqet: 35,
  // Bu qədər yağışdan sonra gübrə və dərman yuyulur
  yagisMm: 15,
  // Yağış bundan çoxdursa suvarmağa ehtiyac yoxdur — pul və su qənaəti
  suvarmaSaxlaMm: 8,
  // Dərmanlama üçün: külək zəif, yağış ehtimalı aşağı
  kulekMaxKmS: 12,
  yagisEhtimaliMax: 20,
  dermanlamaSaat: 3,
  // NDVI bu qədər düşübsə səbəb axtarmaq lazımdır
  ndviDusme: -0.05,
  suBalansiMm: 25,
  kohneOlcmeGun: 14,
  baxisGunu: 5,
};

const CIDDILIK_SIRASI = { tecili: 3, diqqet: 2, melumat: 1 };

/**
 * Siqnal növünün öz sırası — eyni ciddilikdə hansı əvvəl gəlsin.
 * Qayda: sahəyə aid olan (peykdən gələn) ümumi hava siqnalından öndədir.
 * "Sizin sahə quraqdır" fermerə "rayona yağış gəlir"dən çox şey deyir.
 */
const NOV_SIRASI = [
  "saxta",
  "suvar",
  "isti",
  "bitkiZeifleyir",
  "qonsu",
  "suvarmaDayan",
  "yagis",
  "dermanlama",
  "olcmeKohne",
];

const topla = (deyerler, say) =>
  (deyerler ?? []).slice(0, say).reduce((cem, deyer) => cem + (deyer || 0), 0);

/** Günün adı tərcümə açarı kimi — mətn dilə bağlıdır, məntiq yox */
export function gunEtiketi(iso, index) {
  if (index === 0) return { key: "common.today" };
  const gun = new Date(iso).getDay();
  return { key: `weather.day.${gun}` };
}

function saxtaSiqnali(daily) {
  const minler = daily?.temperature_2m_min ?? [];
  const gunler = daily?.time ?? [];
  for (let i = 0; i < Math.min(HEDDLER.baxisGunu, minler.length); i += 1) {
    const derece = minler[i];
    if (!Number.isFinite(derece) || derece > HEDDLER.saxtaDiqqet) continue;
    const tecili = derece <= HEDDLER.saxtaTecili;
    return {
      id: `saxta:${gunler[i]}`,
      nov: "saxta",
      ciddilik: tecili ? "tecili" : "diqqet",
      icon: "CloudSnow",
      basliqKey: "siqnal.saxta.basliq",
      metnKey: tecili ? "siqnal.saxta.tecili" : "siqnal.saxta.diqqet",
      vars: { gun: gunEtiketi(gunler[i], i), derece: Math.round(derece) },
      menbeKey: "siqnal.menbe.hava",
    };
  }
  return null;
}

function istiSiqnali(daily) {
  const maxlar = daily?.temperature_2m_max ?? [];
  const gunler = daily?.time ?? [];
  const bax = Math.min(HEDDLER.baxisGunu, maxlar.length);

  for (let i = 0; i < bax; i += 1) {
    if (maxlar[i] >= HEDDLER.istiTecili) {
      return {
        id: `isti:${gunler[i]}`,
        nov: "isti",
        ciddilik: "tecili",
        icon: "Sun",
        basliqKey: "siqnal.isti.basliq",
        metnKey: "siqnal.isti.tecili",
        vars: { gun: gunEtiketi(gunler[i], i), derece: Math.round(maxlar[i]) },
        menbeKey: "siqnal.menbe.hava",
      };
    }
  }

  // Bir isti gün hadisə deyil; ardıcıl iki gün bitkiyə stresdir
  for (let i = 0; i < bax - 1; i += 1) {
    if (maxlar[i] >= HEDDLER.istiDiqqet && maxlar[i + 1] >= HEDDLER.istiDiqqet) {
      return {
        id: `isti:${gunler[i]}`,
        nov: "isti",
        ciddilik: "diqqet",
        icon: "Sun",
        basliqKey: "siqnal.isti.basliq",
        metnKey: "siqnal.isti.diqqet",
        vars: {
          gun: gunEtiketi(gunler[i], i),
          derece: Math.round(Math.max(maxlar[i], maxlar[i + 1])),
        },
        menbeKey: "siqnal.menbe.hava",
      };
    }
  }
  return null;
}

function yagisSiqnali(daily, yagis3) {
  if (yagis3 < HEDDLER.yagisMm) return null;
  return {
    id: `yagis:${daily?.time?.[0] ?? "?"}`,
    nov: "yagis",
    ciddilik: "diqqet",
    icon: "CloudRain",
    basliqKey: "siqnal.yagis.basliq",
    metnKey: "siqnal.yagis.metn",
    vars: { mm: Math.round(yagis3) },
    menbeKey: "siqnal.menbe.hava",
  };
}

/**
 * Suvarma qərarı — peyk nəmliyi ilə proqnozun kəsişməsi.
 * Ən qiymətli siqnal budur: quraq sahəyə yağış gəlirsə suvarmamaq fermerə
 * birbaşa pul qazandırır.
 */
function suvarmaSiqnali(xulase, yagis3, balans, daily) {
  if (!xulase) return null;
  const tarix = xulase.tarix ?? "?";

  if (xulase.suSeviyyesi === "az") {
    if (yagis3 >= HEDDLER.suvarmaSaxlaMm) {
      return {
        id: `suvarmaDayan:${tarix}`,
        nov: "suvarmaDayan",
        ciddilik: "diqqet",
        icon: "CloudRain",
        basliqKey: "siqnal.suvarmaDayan.basliq",
        metnKey: "siqnal.suvarmaDayan.metn",
        vars: { mm: Math.round(yagis3), gun: gunEtiketi(daily?.time?.[0], 0) },
        menbeKey: "siqnal.menbe.hamisi",
      };
    }
    return {
      id: `suvar:${tarix}`,
      nov: "suvar",
      ciddilik: "tecili",
      icon: "Droplets",
      basliqKey: "siqnal.suvar.basliq",
      metnKey: "siqnal.suvar.tecili",
      // Xam NDMI mətndən çıxarıldı: "-0,05" fermerə heç nə demir, cümlə isə
      // qərarı onsuz da deyir (bax: services/ndvi.js — faizə çevirmə qeydi)
      vars: {},
      menbeKey: "siqnal.menbe.hamisi",
    };
  }

  if (xulase.suSeviyyesi === "orta" && balans > HEDDLER.suBalansiMm) {
    return {
      id: `suvar:${tarix}`,
      nov: "suvar",
      ciddilik: "diqqet",
      icon: "Droplets",
      basliqKey: "siqnal.suvar.basliq",
      metnKey: "siqnal.suvar.balans",
      vars: { mm: Math.round(balans) },
      menbeKey: "siqnal.menbe.hamisi",
    };
  }
  return null;
}

/**
 * NDVI düşür, amma su kifayətdir. Su səbəb deyilsə səbəb xəstəlik, zərərverici
 * və ya qida çatışmazlığıdır — bunları peyk görmür, yarpağın şəkli görür.
 */
function zeifləməSiqnali(xulase) {
  if (!xulase || xulase.suSeviyyesi === "az") return null;
  if (xulase.istiqamet !== "azalir") return null;
  if (!Number.isFinite(xulase.ferq) || xulase.ferq > HEDDLER.ndviDusme) return null;
  return {
    id: `bitkiZeifleyir:${xulase.tarix ?? "?"}`,
    nov: "bitkiZeifleyir",
    ciddilik: "diqqet",
    icon: "Camera",
    basliqKey: "siqnal.bitkiZeifleyir.basliq",
    metnKey: "siqnal.bitkiZeifleyir.metn",
    // İki səviyyə göstərilir, fərq yox: "0,07 azalıb" da, "7 vahid azalıb" da
    // fermerə heç nə demir; "68%-dən 61%-ə düşüb" isə dərhal oxunur
    vars: { evvel: ortukFaizi(xulase.ndvi - xulase.ferq), indi: ortukFaizi(xulase.ndvi) },
    menbeKey: "siqnal.menbe.peyk",
    // Bu siqnalın işi çatda görülür — düymə birbaşa ora aparır
    hereket: "chat",
  };
}

/**
 * Sahə ətrafdakı əkinlərin alt çeyrəyindədirsə səbəb sahəyə xasdır: hava
 * hamıya eynidir, ona görə problem torpaqda, suvarmada və ya idarəetmədədir.
 *
 * Yalnız alt çeyrək siqnal doğurur. "Üst çeyrəkdəsiniz" xoş xəbərdir, amma
 * bildiriş deyil — zəngi təbrik mesajı ilə doldurmaq onu dəyərsizləşdirir.
 */
function qonsuSiqnali(muqayise, xulase) {
  // Sahənin öz ölçməsi olmasa müqayisə cümləsi yarımçıq qalır
  if (muqayise?.pille !== "alt" || !Number.isFinite(muqayise.ferq)) return null;
  if (!Number.isFinite(xulase?.ndvi) || !Number.isFinite(muqayise.medyan)) return null;
  return {
    id: `qonsu:${muqayise.tarix ?? xulase?.tarix ?? "?"}`,
    nov: "qonsu",
    ciddilik: "diqqet",
    icon: "BarChart3",
    basliqKey: "siqnal.qonsu.basliq",
    metnKey: "siqnal.qonsu.metn",
    vars: {
      sizin: ortukFaizi(xulase?.ndvi),
      medyan: ortukFaizi(muqayise.medyan),
    },
    menbeKey: "siqnal.menbe.peyk",
    hereket: "chat",
  };
}

function kohneOlcmeSiqnali(xulase, indi) {
  if (!xulase?.tarix) return null;
  const gun = necheGunEvvel(xulase.tarix, indi);
  if (!Number.isFinite(gun) || gun <= HEDDLER.kohneOlcmeGun) return null;
  return {
    id: `olcmeKohne:${xulase.tarix}`,
    nov: "olcmeKohne",
    ciddilik: "melumat",
    icon: "Satellite",
    basliqKey: "siqnal.olcmeKohne.basliq",
    metnKey: "siqnal.olcmeKohne.metn",
    vars: { gun },
    menbeKey: "siqnal.menbe.peyk",
  };
}

function dermanlamaSiqnali(hourly) {
  const vaxtlar = hourly?.time ?? [];
  let ardicil = 0;
  for (let i = 0; i < Math.min(48, vaxtlar.length); i += 1) {
    const kulek = hourly?.wind_speed_10m?.[i];
    const ehtimal = hourly?.precipitation_probability?.[i];
    const uygun =
      Number.isFinite(kulek) &&
      kulek < HEDDLER.kulekMaxKmS &&
      (ehtimal == null || ehtimal < HEDDLER.yagisEhtimaliMax);

    if (!uygun) {
      ardicil = 0;
      continue;
    }
    ardicil += 1;
    if (ardicil < HEDDLER.dermanlamaSaat) continue;

    const basla = i - HEDDLER.dermanlamaSaat + 1;
    const iso = vaxtlar[basla];
    return {
      id: `dermanlama:${String(iso).slice(0, 10)}`,
      nov: "dermanlama",
      ciddilik: "melumat",
      icon: "Wind",
      basliqKey: "siqnal.dermanlama.basliq",
      metnKey: "siqnal.dermanlama.metn",
      vars: { gun: gunEtiketi(iso, basla < 12 ? 0 : 1) },
      menbeKey: "siqnal.menbe.hava",
    };
  }
  return null;
}

/**
 * @param {object}  arg
 * @param {object}  arg.daily    Open-Meteo günlük massivləri
 * @param {object}  arg.hourly   Open-Meteo saatlıq massivləri
 * @param {object}  arg.xulase   NDVI xülasəsi (bax: services/ndvi.js)
 * @param {number}  arg.indi     Test üçün "indi" — standart Date.now()
 * @returns {Array} ciddiliyə görə sıralanmış siqnallar
 */
export function siqnallariQur({ daily, hourly, xulase, muqayise, indi = Date.now() } = {}) {
  const yagis3 = topla(daily?.precipitation_sum, 3);
  const yagis7 = topla(daily?.precipitation_sum, 7);
  const buxar7 = topla(daily?.et0_fao_evapotranspiration, 7);
  const balans = buxar7 - yagis7;

  const suvarma = suvarmaSiqnali(xulase, yagis3, balans, daily);
  const yagisli = yagisSiqnali(daily, yagis3);

  const hamisi = [
    saxtaSiqnali(daily),
    istiSiqnali(daily),
    suvarma,
    zeifləməSiqnali(xulase),
    qonsuSiqnali(muqayise, xulase),
    yagisli,
    kohneOlcmeSiqnali(xulase, indi),
    // Yağış gələndə dərmanlama pəncərəsi məsləhət deyil — ziddiyyət olmasın
    yagisli ? null : dermanlamaSiqnali(hourly),
  ].filter(Boolean);

  return hamisi.sort((a, b) => {
    const fərq = CIDDILIK_SIRASI[b.ciddilik] - CIDDILIK_SIRASI[a.ciddilik];
    if (fərq !== 0) return fərq;
    return NOV_SIRASI.indexOf(a.nov) - NOV_SIRASI.indexOf(b.nov);
  });
}

/** Bağlanmış siqnalları çıxarır — fermer bir dəfə oxuyub bağlaya bilsin */
export function acigSiqnallar(siqnallar, bagliIdler = []) {
  const bagli = new Set(bagliIdler);
  return siqnallar.filter((siqnal) => !bagli.has(siqnal.id));
}
