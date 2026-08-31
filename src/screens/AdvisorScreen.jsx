import { Icon } from "../components/Icon.jsx";
import { Aqronom } from "../components/Aqronom.jsx";
import { SectionTitle } from "../components/SectionTitle.jsx";
import { C, font } from "../theme/tokens.js";
import { useI18n } from "../i18n/index.jsx";
import { useStore } from "../state/store.jsx";
import { SiqnalKarti } from "../features/signals/SiqnalKarti.jsx";
import { TovsiyeKarti } from "../features/tovsiye/TovsiyeKarti.jsx";
import { SaheLenti } from "../features/lent/SaheLenti.jsx";
import { useRouter } from "../lib/router.jsx";
import { pathFor } from "../routes.js";

export function AdvisorScreen({ onOpenChat, onOpenHesab, siqnallar = [], tovsiyeler = [], peyk, radar, indeksHali = null }) {
  const { t } = useI18n();
  const { state, actions } = useStore();
  const { navigate } = useRouter();

  // Sürətli suallar (PDF mockup) — hərəsi çatı HƏMİN SUALLA açır:
  // sual giriş xanasına yazılır, göndərməyi fermer özü təsdiqləyir
  const suallar = ["komek.sual1", "komek.sual2", "komek.sual3"];

  // "Açıq tapşırıqlar" — yalnız HƏQİQİ işlər: uydurma tapşırıq siyahısı yox.
  // Hesab girişi əvvəl ana səhifənin tünd hero-sunda idi — evi indi buradır.
  const tecili = siqnallar.find((s) => s.ciddilik === "tecili");
  const tapsiriqlar = [
    !state.hesab.telefon && {
      acar: "hesab",
      ikon: "ShieldCheck",
      metn: t("hesab.cta"),
      icra: onOpenHesab,
    },
    tecili && {
      acar: "sahe",
      ikon: "MapPin",
      metn: t("komek.tapsiriqSahe"),
      icra: () => navigate(pathFor("sahe")),
    },
  ].filter(Boolean);

  return (
    <div className="px-4 pb-4">
      <SectionTitle>{t("chat.title")}</SectionTitle>
      {/* AI girişi: fırlanan haşiyə + parıltı (bax: index.css "AI kartı") */}
      <div className="ai-halqa giris">
        <button
          type="button"
          onClick={onOpenChat}
          aria-label={t("chat.open")}
          className="ai-kart w-full p-4 text-left"
        >
          <div className="flex items-center gap-3">
            {/* Mücərrəd "parıltı" ikonu əvəzinə personaj: kartın nəyi
                açdığını üzü ilə deyir. TAM BOY buradadır — bütün başqa
                yuvalar dar olduğundan baş medalyonu göstərir, personajın
                "evi" isə məsləhət ekranıdır: fermer onu burada bütöv görür.
                NARAHAT İFADƏ DƏ BURADADIR, əsas ekranda yox: aşağıda siqnal
                kartları dayanır və duruşun niyə belə olduğunu izah edir.
                İzahsız qaşqabaq fermeri yalnız narahat edir.
                ai-ikon sinfi QƏSDƏN yoxdur: onun nəfəs animasiyası riqin
                öz nəfəsi ilə üst-üstə düşüb ikiqat yellənmə verirdi. */}
            <Aqronom
              /* Üz vəziyyəti daşıyır: təcili iş → narahat; iş yoxdur və
                 indeks yüksəkdir → sevincli (əvvəl bu, ana səhifədə idi) */
              hal={
                siqnallar.some((s) => s.ciddilik === "tecili")
                  ? "narahat"
                  : siqnallar.length === 0 && indeksHali?.indeks?.bant === "yuksek"
                    ? "sevincli"
                    : "sakit"
              }
              bitki={state.chat.crop}
              olcu={104}
              gorunus="tam"
              className="shrink-0"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white" style={{ fontFamily: font.display }}>
                  {t("chat.open")}
                </p>
                <span
                  className="flex items-center gap-1 rounded-full px-1.5 py-0.5 font-bold"
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.06em",
                    color: C.gold,
                    border: "1px solid rgba(233,181,74,0.45)",
                    backgroundColor: "rgba(233,181,74,0.1)",
                  }}
                >
                  <span
                    className="ai-nokta inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: C.gold }}
                  />
                  AI
                </span>
              </div>
              <p className="mt-0.5 text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
                {t("chat.openDesc")}
              </p>
            </div>
            <Icon name="ChevronRight" size={18} color="rgba(255,255,255,0.5)" />
          </div>
        </button>
      </div>

      {/* Sürətli suallar — çatı hazır sualla açır (mock: 03 Visual ref) */}
      <div className="mt-3 space-y-2">
        {suallar.map((acar, sira) => (
          <button
            key={acar}
            type="button"
            onClick={() => onOpenChat?.(t(acar))}
            className="giris flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left"
            style={{ backgroundColor: C.fieldSoft, "--i": sira, minHeight: 48 }}
          >
            <span className="rounded-xl bg-white p-2">
              <Icon
                name={sira === 0 ? "Calendar" : sira === 1 ? "Leaf" : "CreditCard"}
                size={15}
                color={C.field}
              />
            </span>
            <span className="flex-1 text-sm font-semibold" style={{ color: C.ink }}>
              {t(acar)}
            </span>
            <Icon name="ChevronRight" size={15} color={C.muted} />
          </button>
        ))}
      </div>

      {/* Açıq tapşırıqlar — brief-in mandatoryTasks siyahısı. Yalnız həqiqi
          işlər görünür; boşdursa bölmə də yoxdur (uydurma sıra qadağandır) */}
      {tapsiriqlar.length > 0 && (
        <>
          <SectionTitle>{t("komek.tapsiriqlar")}</SectionTitle>
          {tapsiriqlar.map((tapsiriq, sira) => (
            <button
              key={tapsiriq.acar}
              type="button"
              onClick={tapsiriq.icra}
              className="giris mb-2 flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left"
              style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, "--i": sira, minHeight: 48 }}
            >
              <span className="rounded-xl p-2" style={{ backgroundColor: C.mist }}>
                <Icon name={tapsiriq.ikon} size={15} color={C.pine} />
              </span>
              <span className="flex-1 text-sm font-semibold" style={{ color: C.ink }}>
                {tapsiriq.metn}
              </span>
              <Icon name="ChevronRight" size={15} color={C.muted} />
            </button>
          ))}
        </>
      )}

      {/* Bütün siyahı BU sahənin ölçmələrindən çıxır. Əvvəl burada nümunə
          tövsiyələr də vardı — uydurma rəqəmlərlə, üstəlik həqiqi siqnallarla
          eyni görkəmdə. Fermer hansının ölçülmüş olduğunu ayıra bilmirdi. */}
      <SectionTitle>{t("siqnal.title")}</SectionTitle>
      <p className="-mt-1 mb-3 px-1 text-xs" style={{ color: C.muted }}>
        {t("siqnal.subtitle")}
      </p>

      {siqnallar.length === 0 ? (
        <div
          className="giris rounded-2xl p-4 text-center"
          style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}
        >
          {/* Quru işarə əvəzinə sevinən personaj: "iş yoxdur" tətbiqin ən
              yaxşı xəbəridir və bunu üz deyir. Tullanma birdəfəlikdir
              (bax: index.css fermer-tullan), sonra sakit nəfəsə keçir. */}
          <div className="flex justify-center">
            <Aqronom hal="sevincli" bitki={state.chat.crop} olcu={110} gorunus="tam" />
          </div>
          <p className="mt-1.5 text-sm font-semibold" style={{ color: C.ink }}>
            {t("siqnal.bosBasliq")}
          </p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: C.muted }}>
            {t("siqnal.bosMetn")}
          </p>
        </div>
      ) : (
        siqnallar.map((siqnal, index) => (
          <SiqnalKarti
            key={siqnal.id}
            siqnal={siqnal}
            onBagla={actions.siqnaliBagla}
            onHereket={onOpenChat}
            style={{ marginBottom: 10, "--i": index + 1 }}
          />
        ))
      )}

      {/* Lent siqnallardan sonra: siqnal bu gün görüləcək işdir, lent isə
          tarixçədir — iş həmişə xronologiyadan öndə gəlir. */}
      <SaheLenti peyk={peyk} radar={radar} />

      {/* Tövsiyələr siqnallardan SONRA gəlir: siqnal bu gün görülməli işdir,
          tövsiyə isə mövsümün bu mərhələsinin planıdır. */}
      {tovsiyeler.length > 0 && (
        <>
          <SectionTitle>{t("tovsiye.title")}</SectionTitle>
          <p className="-mt-1 mb-3 px-1 text-xs" style={{ color: C.muted }}>
            {t("tovsiye.subtitle")}
          </p>
          {tovsiyeler.map((tovsiye, index) => (
            <TovsiyeKarti key={tovsiye.id} tovsiye={tovsiye} style={{ "--i": index + 1 }} />
          ))}

          {/* Bir sətir. Əvvəl burada abzas vardı və hər kartın altında da
              ayrıca qeyd — hamısı bərabər xəbərdarlıq olanda heç biri
              oxunmur. İndi yalnız pul xərclənə bilən yer vurğulanır. */}
          <p className="mt-1 px-1 text-xs leading-relaxed" style={{ color: C.muted }}>
            {t("tovsiye.kalibrleme")}
          </p>
        </>
      )}
    </div>
  );
}
