import { Card } from "../../components/Card.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { ortukFaizi } from "../../services/ndvi.js";

/**
 * VEGETASİYA DİNAMİKASI — sahənin bitki örtüyünün zaman içindəki xətti.
 *
 * "68%" tək başına vəziyyəti demir: 61-dən 68-ə qalxmaq da, 75-dən 68-ə
 * düşmək də eyni rəqəmdir. Fermer ƏYRİni görəndə fərqi bir baxışda tutur —
 * ona görə lent (rəqəm siyahısı) yanında qrafik də lazımdır.
 *
 * ═══ NƏ ÇƏKİLİR, NƏ ÇƏKİLMİR ═════════════════════════════════════════
 * Xətt REAL ölçmələrdəndir (Sentinel-2, ~5 günlük dövrlər). Rayon
 * ortalaması isə TƏK dəyərdir (ətrafın medianı, eyni peyk keçidindən) —
 * ona görə üfüqi kəsikli xətt kimi çəkilir. Onu əyri kimi göstərmək
 * mövcud olmayan tarixçəni uydurmaq olardı.
 *
 * Ölçmə ikidən azdırsa qrafik ÇƏKİLMİR: iki nöqtəsiz "dinamika" yoxdur.
 *
 * ═══ MİQYAS AÇIQ DEYİLİR ═════════════════════════════════════════════
 * Şaquli ox 0-100 deyil, məlumatın öz aralığına yaxınlaşdırılır (yoxsa
 * 61→68 dəyişməsi düz xətt görünür). Yaxınlaşdırma gizli qalmasın deyə
 * oxun alt və üst dəyəri rəqəmlə yazılır.
 */

const EN = 300;
const HUND = 96;
const SOL = 26; // şaquli ox etiketləri üçün yer
const ALT = 16; // ay adları üçün yer

export function VegetasiyaQrafiki({ peyk = { hal: "yoxdur", seriya: [] }, muqayise = null }) {
  const { t } = useI18n();

  const olcmeler = (peyk.seriya ?? []).filter((o) => Number.isFinite(o?.ndvi));
  if (peyk.hal !== "hazir" || olcmeler.length < 2) return null;

  const noqteler = olcmeler.map((o) => ({ faiz: ortukFaizi(o.ndvi), tarix: o.son }));
  const medyanFaiz = Number.isFinite(muqayise?.medyan) ? ortukFaizi(muqayise.medyan) : null;

  // Miqyas: məlumat + (varsa) median, iki tərəfdən bir az hava ilə
  const deyerler = medyanFaiz == null ? noqteler.map((n) => n.faiz) : [...noqteler.map((n) => n.faiz), medyanFaiz];
  const enAz = Math.max(0, Math.floor(Math.min(...deyerler) / 5) * 5 - 5);
  const enCox = Math.min(100, Math.ceil(Math.max(...deyerler) / 5) * 5 + 5);
  const aralik = enCox - enAz || 1;

  const x = (i) => SOL + (i / (noqteler.length - 1)) * (EN - SOL - 4);
  const y = (faiz) => HUND - ALT - ((faiz - enAz) / aralik) * (HUND - ALT - 6);

  const xett = noqteler.map((n, i) => `${x(i)},${y(n.faiz)}`).join(" ");
  const son = noqteler[noqteler.length - 1];
  const ilk = noqteler[0];
  // Başlıqdakı dəyişmə SON 2 HƏFTƏdir, bütün pəncərə deyil: 150 gün əvvəl
  // əkin vaxtıdır, ona görə "ilk vs son" həmişə böyük müsbət rəqəm verir və
  // heç nə demir. 3 dövr = 15 gün — mühərrikin trend tərifi ilə eynidir
  // (bax: services/ndvi.js → xulase).
  const evvel = noqteler[Math.max(0, noqteler.length - 4)];
  const deyisme = son.faiz - evvel.faiz;

  // Ay adları: ilk, orta və son ölçmənin ayı (üçdən çoxu 360 px-də sıxlaşır)
  const ayEtiketi = (tarix) => {
    const t_ = new Date(tarix);
    return Number.isNaN(t_.getTime()) ? "" : t(`ayQisa.${t_.getUTCMonth() + 1}`);
  };
  // Bütün ölçmələr eyni aya düşəndə üç dəfə "avq" yazmaq qüsur kimi görünür
  // (və heç nə demir) — təkrarlanan etiket buraxılır, bir dənəsi qalır.
  const ayEtiketleri = [0, Math.floor((noqteler.length - 1) / 2), noqteler.length - 1]
    .map((i, sira) => ({ i, sira, ad: ayEtiketi(noqteler[i].tarix) }))
    .filter((e, idx, hamisi) => idx === 0 || e.ad !== hamisi[idx - 1].ad);
  const tekAy = ayEtiketleri.length === 1;

  return (
    <Card className="giris" style={{ marginTop: 12, marginBottom: 12 }}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
          {t("veg.basliq")}
        </h3>
        <span
          className="text-xs font-bold"
          style={{ color: deyisme >= 0 ? C.field : C.danger, fontVariantNumeric: "tabular-nums" }}
        >
          {deyisme >= 0 ? "▲" : "▼"} {Math.abs(deyisme)}%
          <span className="ml-1 font-normal" style={{ color: C.muted }}>
            {t("veg.sonIkiHefte")}
          </span>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${EN} ${HUND}`}
        width="100%"
        height={HUND}
        preserveAspectRatio="none"
        role="img"
        // Qrafikin MƏTN XÜLASƏSİ: ekran oxuyucusu əyrini "görmür"
        aria-label={t("veg.xulase", {
          ilk: ilk.faiz,
          son: son.faiz,
          say: noqteler.length,
          rayon: medyanFaiz == null ? "—" : `${medyanFaiz}`,
        })}
      >
        {/* Şaquli ox: yalnız iki dəyər — miqyas gizli qalmasın */}
        <text x="0" y={y(enCox) + 4} style={{ fontSize: 10, fill: C.muted }}>
          {enCox}%
        </text>
        <text x="0" y={y(enAz) + 4} style={{ fontSize: 10, fill: C.muted }}>
          {enAz}%
        </text>

        {/* Rayon ortalaması — TƏK dəyər olduğu üçün üfüqi kəsikli xətt */}
        {medyanFaiz != null && (
          <line
            x1={SOL}
            x2={EN - 4}
            y1={y(medyanFaiz)}
            y2={y(medyanFaiz)}
            stroke={C.muted}
            strokeWidth="1"
            strokeDasharray="4 3"
          />
        )}

        {/* Sahənin öz xətti */}
        <polyline
          points={xett}
          pathLength="1"
          className="cizgi-cek"
          fill="none"
          stroke={C.field}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Son ölçmə nöqtəsi vurğulanır: "bu gün haradayıq" */}
        <circle cx={x(noqteler.length - 1)} cy={y(son.faiz)} r="3.5" fill={C.field} />

        {/* Ay adları — təkrar buraxılır; hamısı eyni aydırsa ortada bir dənə */}
        {ayEtiketleri.map(({ i, sira, ad }) => (
          <text
            key={ad + i}
            x={tekAy ? SOL + (EN - SOL - 4) / 2 : x(i)}
            y={HUND - 3}
            textAnchor={tekAy || sira === 1 ? "middle" : sira === 0 ? "start" : "end"}
            style={{ fontSize: 10, fill: C.muted }}
          >
            {ad}
          </text>
        ))}
      </svg>

      {/* Əfsanə + müqayisə cümləsi. Rəng tək daşıyıcı deyil: hər ikisi yazılır */}
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-1 text-xs" style={{ color: C.muted }}>
          <span style={{ width: 12, height: 2, backgroundColor: C.field, display: "inline-block" }} />
          {t("veg.sizinSahe")}
        </span>
        {medyanFaiz != null && (
          <span className="flex items-center gap-1 text-xs" style={{ color: C.muted }}>
            <span
              style={{
                width: 12,
                height: 0,
                borderTop: `2px dashed ${C.muted}`,
                display: "inline-block",
              }}
            />
            {t("veg.rayonOrtalamasi")}
          </span>
        )}
      </div>

      {/* Fərq faizi: müqayisə mühərrikindən gəlir (median bazalı, bax:
          services/ndvi.js → qonsuMuqayisesi). Median sıfıra yaxındırsa
          faiz mənasız olur və mühərrik null qaytarır — onda cümlə yoxdur */}
      {Number.isFinite(muqayise?.ferq) && (
        <p className="mt-1.5 text-xs" style={{ color: C.muted }}>
          {t(muqayise.ferq >= 0 ? "veg.ferqUst" : "veg.ferqAlt", {
            faiz: Math.abs(muqayise.ferq),
          })}
        </p>
      )}
      <p className="mt-1 text-xs" style={{ color: C.muted, fontSize: 10 }}>
        {t("veg.menbe", { say: noqteler.length })}
      </p>
    </Card>
  );
}
