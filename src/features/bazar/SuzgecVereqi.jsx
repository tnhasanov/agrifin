import { useState } from "react";
import { Sheet } from "../../components/Sheet.jsx";
import { Icon } from "../../components/Icon.jsx";
import { C, RADIUS, TOXUNMA } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { KATEQORIYALAR, TEDARUKCULER } from "../../../lib/bazar/kataloq.js";
import { BOS_SUZGEC, QIYMET_ARALIQLARI, SIRALAMALAR, suzgecSayi, suzgecTetbiq } from "../../../lib/bazar/axtaris.js";

function Cip({ secili, label, onClick, ikon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={secili}
      className="basilir flex items-center gap-1.5 rounded-full px-3 text-xs font-semibold"
      style={{
        minHeight: 44,
        backgroundColor: secili ? C.pine : C.mist,
        color: secili ? "#fff" : C.ink,
        border: `1px solid ${secili ? C.pine : "transparent"}`,
      }}
    >
      {ikon && <Icon name={ikon} size={13} color={secili ? "#fff" : C.muted} />}
      {label}
    </button>
  );
}

function Basliq({ children }) {
  return (
    <p className="mt-4 mb-2 text-xs font-bold tracking-wide" style={{ color: C.muted }}>
      {children}
    </p>
  );
}

function Kecid({ secili, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="switch"
      aria-checked={secili}
      className="basilir flex w-full items-center justify-between gap-3 py-2 text-left text-sm"
      style={{ minHeight: TOXUNMA, color: C.ink }}
    >
      <span>{label}</span>
      <span
        className="relative shrink-0 rounded-full"
        style={{ width: 42, height: 24, backgroundColor: secili ? C.field : C.line, transition: "background-color 150ms" }}
      >
        <span
          className="absolute rounded-full bg-white"
          style={{ top: 2, left: secili ? 20 : 2, width: 20, height: 20, transition: "left 150ms", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }}
        />
      </span>
    </button>
  );
}

/**
 * SÜZGƏC VƏRƏQİ — kateqoriya, qiymət, çatdırılma, tədarükçü, maliyyə, təsdiqli.
 *
 * Seçimlər vərəqin içində YIĞILIR, siyahıya yalnız "Göstər" ilə tətbiq
 * olunur — hər toxunuşda arxadakı siyahının sıçraması fermeri çaşdırır.
 * Düymədə nəticə sayı canlı yazılır ("12 məhsulu göstər"): boş nəticəyə
 * gedib "heç nə tapılmadı" görmək əvəzinə əvvəlcədən bilinir.
 *
 * `kateqoriyaSabit` verilibsə (kateqoriya səhifəsi) kateqoriya bölməsi
 * gizlənir — səhifə onsuz da bir kateqoriyadır.
 */
export function SuzgecVereqi({ acilib, onBagla, suzgec, onTetbiq, mehsullar, rayon = null, kateqoriyaSabit = false }) {
  const { t } = useI18n();
  const [qaralama, setQaralama] = useState(suzgec);

  // Vərəq hər açılanda cari süzgəcdən başlayır
  const [sonAcilis, setSonAcilis] = useState(acilib);
  if (acilib !== sonAcilis) {
    setSonAcilis(acilib);
    if (acilib) setQaralama(suzgec);
  }

  const say = suzgecTetbiq(mehsullar, qaralama).length;
  const deyis = (parca) => setQaralama((q) => ({ ...q, ...parca }));

  return (
    <Sheet acilib={acilib} onBagla={onBagla} baslik={t("bazar.suzgec.basliq")} boy="tam">
      {!kateqoriyaSabit && (
        <>
          <Basliq>{t("bazar.suzgec.kateqoriya")}</Basliq>
          <div className="flex flex-wrap gap-2">
            <Cip secili={!qaralama.kateqoriya} label={t("bazar.hamisi")} onClick={() => deyis({ kateqoriya: null })} />
            {KATEQORIYALAR.map((k) => (
              <Cip
                key={k.kod}
                secili={qaralama.kateqoriya === k.kod}
                label={t(k.adKey)}
                ikon={k.ikon}
                onClick={() => deyis({ kateqoriya: qaralama.kateqoriya === k.kod ? null : k.kod })}
              />
            ))}
          </div>
        </>
      )}

      <Basliq>{t("bazar.suzgec.qiymet")}</Basliq>
      <div className="flex flex-wrap gap-2">
        {QIYMET_ARALIQLARI.map((a) => (
          <Cip
            key={a.kod}
            secili={qaralama.qiymet === a.kod}
            label={t(`bazar.suzgec.qiymet.${a.kod}`)}
            onClick={() => deyis({ qiymet: qaralama.qiymet === a.kod ? null : a.kod })}
          />
        ))}
      </div>

      <Basliq>{t("bazar.suzgec.catdirilma")}</Basliq>
      {rayon?.kod ? (
        <Kecid
          secili={qaralama.rayonKod === rayon.kod}
          label={t("bazar.suzgec.menimRayonum", { rayon: rayon.name })}
          onClick={() => deyis({ rayonKod: qaralama.rayonKod ? null : rayon.kod })}
        />
      ) : (
        <p className="text-xs" style={{ color: C.muted }}>
          {t("bazar.suzgec.rayonYox")}
        </p>
      )}

      <Basliq>{t("bazar.suzgec.tedarukcu")}</Basliq>
      <div className="flex flex-wrap gap-2">
        <Cip secili={!qaralama.tedarukcu} label={t("bazar.hamisi")} onClick={() => deyis({ tedarukcu: null })} />
        {TEDARUKCULER.map((s) => (
          <Cip
            key={s.kod}
            secili={qaralama.tedarukcu === s.kod}
            label={s.ad}
            ikon={s.tesdiqli ? "BadgeCheck" : undefined}
            onClick={() => deyis({ tedarukcu: qaralama.tedarukcu === s.kod ? null : s.kod })}
          />
        ))}
      </div>

      <div className="mt-3">
        <Kecid
          secili={qaralama.maliyye}
          label={t("bazar.suzgec.maliyye", { app: { key: "app.name" } })}
          onClick={() => deyis({ maliyye: !qaralama.maliyye })}
        />
        <Kecid secili={qaralama.tesdiqli} label={t("bazar.suzgec.tesdiqli")} onClick={() => deyis({ tesdiqli: !qaralama.tesdiqli })} />
      </div>

      <div className="mt-4 flex gap-2 pb-2">
        <button
          type="button"
          onClick={() => setQaralama({ ...BOS_SUZGEC, kateqoriya: kateqoriyaSabit ? suzgec.kateqoriya : null })}
          className="basilir px-4 text-sm font-bold"
          style={{ minHeight: 48, borderRadius: RADIUS.idare, color: C.pine, backgroundColor: C.card, border: `1px solid ${C.line}` }}
        >
          {t("bazar.suzgec.sifirla")}
        </button>
        <button
          type="button"
          onClick={() => {
            onTetbiq(qaralama);
            onBagla();
          }}
          className="basilir flex-1 text-sm font-bold"
          style={{ minHeight: 48, borderRadius: RADIUS.idare, backgroundColor: C.pine, color: "#fff" }}
        >
          {t("bazar.suzgec.goster", { say })}
        </button>
      </div>
    </Sheet>
  );
}

/** SIRALAMA VƏRƏQİ — dörd seçim, birbaşa tətbiq */
export function SiraVereqi({ acilib, onBagla, sira, onSec }) {
  const { t } = useI18n();
  return (
    <Sheet acilib={acilib} onBagla={onBagla} baslik={t("bazar.sira")}>
      <div role="radiogroup" aria-label={t("bazar.sira")} className="pb-2">
        {SIRALAMALAR.map((s) => {
          const secili = sira === s;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={secili}
              onClick={() => {
                onSec(s);
                onBagla();
              }}
              className="basilir flex w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm"
              style={{ minHeight: TOXUNMA, color: C.ink, backgroundColor: secili ? C.fieldSoft : "transparent", fontWeight: secili ? 700 : 500 }}
            >
              {t(`bazar.sira.${s}`)}
              {secili && <Icon name="Check" size={18} color={C.field} />}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

/** Siyahı üstündəki alət zolağı: nəticə sayı · sıra · süzgəc */
export function SiyahiAletleri({ say, sira, suzgec, onSira, onSuzgec }) {
  const { t } = useI18n();
  const aktiv = suzgecSayi(suzgec);
  return (
    <div className="mt-3 mb-2 flex items-center justify-between gap-2">
      <p className="text-xs font-semibold" style={{ color: C.muted }}>
        {t("bazar.axtaris.netice", { say })}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onSira}
          className="basilir flex items-center gap-1 rounded-full px-3 text-xs font-bold"
          style={{ minHeight: 44, backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}
        >
          <Icon name="ArrowUpDown" size={14} color={C.muted} />
          {t(`bazar.sira.${sira}`)}
        </button>
        <button
          type="button"
          onClick={onSuzgec}
          aria-label={aktiv > 0 ? `${t("bazar.suzgec")} (${aktiv})` : t("bazar.suzgec")}
          className="basilir flex items-center gap-1 rounded-full px-3 text-xs font-bold"
          style={{
            minHeight: 44,
            backgroundColor: aktiv > 0 ? C.pine : C.card,
            border: `1px solid ${aktiv > 0 ? C.pine : C.line}`,
            color: aktiv > 0 ? "#fff" : C.ink,
          }}
        >
          <Icon name="SlidersHorizontal" size={14} color={aktiv > 0 ? "#fff" : C.muted} />
          {t("bazar.suzgec")}
          {aktiv > 0 && <span>· {aktiv}</span>}
        </button>
      </div>
    </div>
  );
}
