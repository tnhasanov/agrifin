import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/Icon.jsx";
import { Sheet } from "../../components/Sheet.jsx";
import { C, RADIUS, TOXUNMA, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { formatQiymet } from "../../lib/format.js";
import { maliyyeYoxla } from "../../services/bazar.js";

function Setir({ etiket, deger, vurgu = false }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-xs" style={{ color: C.mal }}>
        {etiket}
      </span>
      <span
        className={vurgu ? "text-lg font-extrabold" : "text-sm font-bold"}
        style={{ color: vurgu ? C.mal : C.ink, fontFamily: vurgu ? font.display : undefined, fontVariantNumeric: "tabular-nums" }}
      >
        {deger}
      </span>
    </div>
  );
}

/**
 * "AGRİFİN İLƏ AL" KARTI — məhsul dəyəri, maliyyələşdirilən məbləğ, CTA.
 *
 * Maliyyə BƏNÖVŞƏYİDİR (theme/tokens.js → mal): fermer rəngdən hansı
 * dünyada olduğunu bilir. Kart HEÇ NƏ VƏD ETMİR: müddət və faiz yalnız
 * yoxlama nəticəsi gələndən sonra görünür; o vaxta qədər CTA
 * "Maliyyələşdirməni yoxla"dır.
 *
 * @param {number} mebleg          məhsul/səbət dəyəri
 * @param {number} maliyyeMeblegi  maliyyələşdirilə bilən hissə
 */
export function MaliyyeKarti({ mebleg, maliyyeMeblegi, onYoxla }) {
  const { t, lang } = useI18n();
  const q = (v) => formatQiymet(v, lang);
  return (
    <section className="rounded-2xl p-4" style={{ backgroundColor: C.malSoft }} aria-label={t("bazar.maliyye.basliq", { app: { key: "app.name" } })}>
      <p className="flex items-center gap-1.5 text-sm font-bold" style={{ color: C.mal, fontFamily: font.display }}>
        <Icon name="Wallet" size={16} color={C.mal} />
        {t("bazar.maliyye.basliq", { app: { key: "app.name" } })}
      </p>
      <div className="mt-2">
        <Setir etiket={t("bazar.maliyye.mehsulDeyeri")} deger={q(mebleg)} />
        <Setir etiket={t("bazar.maliyye.mebleg")} deger={q(maliyyeMeblegi)} vurgu />
      </div>
      <p className="mt-1 text-xs leading-relaxed" style={{ color: C.mal }}>
        {t("bazar.maliyye.qeyd")}
      </p>
      <button
        type="button"
        onClick={onYoxla}
        className="basilir mt-3 w-full rounded-xl text-sm font-bold"
        style={{ minHeight: 46, backgroundColor: C.mal, color: "#fff" }}
      >
        {t("bazar.maliyye.yoxla")}
      </button>
    </section>
  );
}

/** Yoxlama nəticəsinin mətn açarı və tonu */
function halGorunusu(hal) {
  switch (hal) {
    case "uygun":
      return { ikon: "CheckCircle2", reng: C.success, bg: C.successSoft };
    case "qismen":
      return { ikon: "Info", reng: C.goldInk, bg: C.goldSoft };
    default:
      return { ikon: "AlertCircle", reng: C.warn, bg: C.warnSoft };
  }
}

/**
 * MALİYYƏ YOXLAMASI NƏTİCƏSİ — server cavabını göstərir (oxu-yalnız yoxlama).
 * `netice.hal`: uygun | qismen | uygunDeyil | saheYoxdur | bitkiYoxdur |
 * aktivKredit | aciqMuraciet | meblegAzdir | meblegYanlis | uygunMehsulYoxdur
 */
export function MaliyyeNeticesi({ netice }) {
  const { t, lang } = useI18n();
  if (!netice) return null;
  const q = (v) => formatQiymet(v, lang);
  const hal = netice.hal === "meblegYanlis" ? "meblegAzdir" : netice.hal;
  const gorunus = halGorunusu(hal);
  const musbet = hal === "uygun" || hal === "qismen";
  const vars = {
    mebleg: q(netice.mebleg ?? 0),
    tesdiq: q(netice.tesdiq ?? 0),
    min: q(netice.minKredit ?? 0),
    app: { key: "app.name" },
  };

  return (
    <div className="rounded-2xl p-3.5" style={{ backgroundColor: gorunus.bg }} role="status">
      <div className="flex items-start gap-2">
        <Icon name={gorunus.ikon} size={18} color={gorunus.reng} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold" style={{ color: C.ink }}>
            {t(`bazar.maliyye.hal.${hal}`)}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed" style={{ color: C.muted }}>
            {t(`bazar.maliyye.hal.${hal}Izah`, vars)}
          </p>
        </div>
      </div>
      {musbet && (
        <div className="mt-2 grid grid-cols-3 gap-2 rounded-xl bg-white/70 p-2.5">
          <div>
            <p style={{ color: C.muted, fontSize: 10 }}>{t("bazar.maliyye.muddet")}</p>
            <p className="text-xs font-bold" style={{ color: C.ink }}>
              {t("bazar.maliyye.ayDeyeri", { ay: netice.muddetAy })}
            </p>
            <p style={{ color: C.muted, fontSize: 10 }}>{t("bazar.maliyye.bicine")}</p>
          </div>
          <div>
            <p style={{ color: C.muted, fontSize: 10 }}>{t("bazar.maliyye.faiz")}</p>
            <p className="text-xs font-bold" style={{ color: C.ink }}>
              {netice.illikFaiz}%
            </p>
          </div>
          <div>
            <p style={{ color: C.muted, fontSize: 10 }}>{t("bazar.maliyye.ilkAy")}</p>
            <p className="text-xs font-bold" style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>
              ~{q(netice.ilkAyFaiz ?? 0)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * MALİYYƏ VƏRƏQİ — məhsul səhifəsindən açılır, serverdə oxu-yalnız yoxlama
 * aparır və nəticəyə görə BİR hərəkət təklif edir:
 *   müsbət → "Səbətə əlavə et və sifarişə keç" (ödəniş üsulu: maliyyə);
 *   giriş yoxdur → "Hesaba daxil ol";
 *   qurulmayıb / xəta → açıq mətn, uydurma nəticə yox.
 */
export function MaliyyeVereqi({ acilib, onBagla, setirler, mebleg, maliyyeMeblegi, onDavam, onOpenHesab }) {
  const { t, lang } = useI18n();
  const [hal, setHal] = useState("yuklenir");
  const [netice, setNetice] = useState(null);
  const abortRef = useRef(null);
  const acar = JSON.stringify(setirler);

  // Vərəq hər açılanda (və ya sətirlər dəyişəndə) yoxlama sıfırdan başlayır.
  // Render-zamanı vəziyyət uyğunlaşdırması (effektdə sinxron setState yox):
  // hansı sətirlər üçün başladığımız yadda saxlanılır, fərqlidirsə sıfırlanır.
  const [baslananAcar, setBaslananAcar] = useState(null);
  if (acilib && baslananAcar !== acar) {
    setBaslananAcar(acar);
    setHal("yuklenir");
    setNetice(null);
  } else if (!acilib && baslananAcar !== null) {
    setBaslananAcar(null);
  }

  useEffect(() => {
    if (!acilib) return undefined;
    const controller = new AbortController();
    abortRef.current = controller;
    maliyyeYoxla(JSON.parse(acar), { signal: controller.signal })
      .then((cavab) => {
        setNetice(cavab.maliyye);
        setHal("hazir");
      })
      .catch((xeta) => {
        if (xeta?.name === "AbortError") return;
        if (xeta?.status === 401) setHal("girisYox");
        else if (xeta?.status === 404 || xeta?.status === 501) setHal("qurulmayib");
        else setHal("xeta");
      });
    return () => controller.abort();
  }, [acilib, acar]);

  const musbet = netice && (netice.hal === "uygun" || netice.hal === "qismen");
  const q = (v) => formatQiymet(v, lang);

  return (
    <Sheet acilib={acilib} onBagla={onBagla} baslik={t("bazar.maliyye.basliq", { app: { key: "app.name" } })} etiket={t("bazar.maliyye.yoxla")}>
      <div className="rounded-2xl p-4" style={{ backgroundColor: C.malSoft }}>
        <Setir etiket={t("bazar.maliyye.mehsulDeyeri")} deger={q(mebleg)} />
        <Setir etiket={t("bazar.maliyye.mebleg")} deger={q(maliyyeMeblegi)} vurgu />
      </div>

      <div className="mt-3">
        {hal === "yuklenir" && (
          <div className="flex items-center gap-2 py-3" aria-live="polite">
            <Icon name="LoaderCircle" size={16} color={C.muted} />
            <p className="text-xs" style={{ color: C.muted }}>
              {t("bazar.maliyye.yoxlanir")}
            </p>
          </div>
        )}
        {hal === "hazir" && <MaliyyeNeticesi netice={netice} />}
        {hal === "girisYox" && (
          <div className="rounded-2xl p-3.5 text-center" style={{ backgroundColor: C.goldSoft }}>
            <Icon name="ShieldCheck" size={20} color={C.goldDeep} />
            <p className="mt-1 text-sm font-bold" style={{ color: C.ink }}>
              {t("bazar.maliyye.girisLazim")}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: C.muted }}>
              {t("bazar.maliyye.girisIzah")}
            </p>
          </div>
        )}
        {(hal === "qurulmayib" || hal === "xeta") && (
          <p className="rounded-2xl p-3.5 text-xs leading-relaxed" style={{ backgroundColor: C.mist, color: C.muted }}>
            {t(hal === "qurulmayib" ? "bazar.maliyye.qurulmayib" : "bazar.maliyye.xeta")}
          </p>
        )}
      </div>

      <div className="mt-4 pb-2">
        {hal === "girisYox" ? (
          <button
            type="button"
            onClick={() => {
              onBagla();
              onOpenHesab?.();
            }}
            className="basilir w-full text-sm font-bold"
            style={{ minHeight: 48, borderRadius: RADIUS.idare, backgroundColor: C.pine, color: "#fff" }}
          >
            {t("bazar.maliyye.girisCta")}
          </button>
        ) : (
          <button
            type="button"
            disabled={!musbet}
            onClick={() => {
              onBagla();
              onDavam?.(netice);
            }}
            className="basilir w-full text-sm font-bold"
            style={{
              minHeight: 48,
              borderRadius: RADIUS.idare,
              backgroundColor: musbet ? C.mal : C.mist,
              color: musbet ? "#fff" : C.muted,
              border: `1px solid ${musbet ? C.mal : C.line}`,
            }}
          >
            {t("bazar.maliyye.davam")}
          </button>
        )}
        <p className="mt-2 text-center" style={{ color: C.muted, fontSize: 11, minHeight: TOXUNMA / 2 }}>
          {t("bazar.maliyye.qeyd")}
        </p>
      </div>
    </Sheet>
  );
}
