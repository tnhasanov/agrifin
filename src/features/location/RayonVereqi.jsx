import { useMemo, useRef, useState } from "react";
import { Sheet } from "../../components/Sheet.jsx";
import { Icon } from "../../components/Icon.jsx";
import { C, RADIUS, TIPO, TOXUNMA } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import {
  AXTARIS_HEDDI,
  districtByKod,
  normalizeAz,
  searchDistricts,
  vurguParcasi,
} from "../../services/location.js";

/**
 * RAYON VƏRƏQİ — axtarış və siyahı BİR idarəetmədədir.
 *
 * Əvvəl fermer əvvəlcə "yazacağam, yoxsa siyahıdan seçəcəyəm" qərarını
 * verməli idi: axtarış xanası ayrı, siyahı ayrı yerdə idi. Bu, seçim deyil,
 * əlavə maneədir — burada hər ikisi eyni vərəqin içindədir. Axtarış üstdə
 * SABİTDİR (klaviatura qalxanda da yerində qalır), əlifba siyahısı isə
 * onun altında sürüşür.
 */

/** Adın hansı hərfə düşdüyü — qatlanmış formadan alınır ki, Ə/A ayrılmasın */
function herf(name) {
  return normalizeAz(name).charAt(0).toLocaleUpperCase("az");
}

export function RayonVereqi({ acilib, onBagla, secilenKod, sonKodlar = [], onSec }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const girisRef = useRef(null);
  const siyahiRef = useRef(null);

  // Vərəq bağlananda sorğu qalmasın — növbəti açılış təmiz siyahı göstərir.
  // Sıfırlama BAĞLAMA yolundadır (effektdə deyil): Sheet pərdə, Escape və
  // aşağı çəkmə üçün də eyni `onBagla`-nı çağırır, ona görə bir yer bəsdir.
  const bagla = () => {
    setQuery("");
    onBagla();
  };

  const netice = useMemo(() => searchDistricts(query), [query]);
  const axtarilir = normalizeAz(query).length >= AXTARIS_HEDDI;

  // Əlifba blokları: yalnız NƏTİCƏDƏ olan hərflər indeksdə görünür,
  // yoxsa fermer boş hərfə basıb heç yerə getmir
  const bloklar = useMemo(() => {
    const xerite = new Map();
    for (const rayon of netice) {
      const h = herf(rayon.name);
      if (!xerite.has(h)) xerite.set(h, []);
      xerite.get(h).push(rayon);
    }
    return [...xerite.entries()];
  }, [netice]);

  // Son seçilənlər yalnız TAM siyahıda göstərilir — axtarış gedəndə
  // fermer konkret rayonu yazır, tarixçə onun qarşısını kəsməməlidir
  const sonlar = useMemo(
    () => (axtarilir ? [] : sonKodlar.map(districtByKod).filter(Boolean)),
    [axtarilir, sonKodlar],
  );

  const herfeGet = (h) => {
    const hedef = siyahiRef.current?.querySelector(`[data-herf="${h}"]`);
    hedef?.scrollIntoView({ block: "start", behavior: "auto" });
  };

  const sec = (rayon) => {
    onSec(rayon);
    bagla();
  };

  const axtaris = (
    <div
      className="flex items-center gap-2 px-3"
      style={{
        backgroundColor: C.mist,
        borderRadius: RADIUS.idare,
        minHeight: TOXUNMA,
      }}
    >
      <Icon name="Search" size={16} color={C.muted} />
      <input
        ref={girisRef}
        value={query}
        onChange={(hadise) => setQuery(hadise.target.value)}
        placeholder={t("onb.rayon.axtar")}
        aria-label={t("onb.rayon.axtar")}
        type="search"
        autoComplete="off"
        className="w-full bg-transparent outline-none"
        // 16px-dən kiçik giriş iOS-da səhifəni özü böyüdür
        style={{ color: C.ink, ...TIPO.giris }}
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            girisRef.current?.focus();
          }}
          aria-label={t("common.close")}
          className="shrink-0 rounded-full p-1"
          style={{ backgroundColor: C.line }}
        >
          <Icon name="X" size={16} color={C.muted} />
        </button>
      )}
    </div>
  );

  return (
    <Sheet
      acilib={acilib}
      onBagla={bagla}
      boy="tam"
      baslik={t("onb.rayon.vereqBasliq")}
      sabitUst={axtaris}
    >
      <div ref={siyahiRef} className="relative">
        {netice.length === 0 ? (
          <div className="py-10 text-center" role="status">
            <p className="font-semibold" style={{ color: C.ink, ...TIPO.metn }}>
              {t("onb.rayon.neticeYox")}
            </p>
            <p className="mt-1" style={{ color: C.muted, ...TIPO.qeyd }}>
              {t("onb.rayon.neticeYoxIzah")}
            </p>
          </div>
        ) : (
          <>
            {/* Əlifba indeksi yalnız TAM siyahıda lazımdır: süzülmüş
                nəticə onsuz da qısadır */}
            {!axtarilir && (
              <div
                className="absolute top-0 right-0 z-10 flex flex-col items-center gap-0.5 py-1"
                aria-hidden="true"
              >
                {bloklar.map(([h]) => (
                  <button
                    key={h}
                    type="button"
                    tabIndex={-1}
                    onClick={() => herfeGet(h)}
                    className="px-1 leading-none"
                    style={{ color: C.field, fontSize: 10, fontWeight: 700 }}
                  >
                    {h}
                  </button>
                ))}
              </div>
            )}

            {sonlar.length > 0 && (
              <section>
                <h3 className="py-1" style={{ color: C.muted, ...TIPO.qeyd, fontWeight: 700 }}>
                  {t("onb.rayon.sonSecilenler")}
                </h3>
                <ul>
                  {sonlar.map((rayon) => (
                    <li key={rayon.kod}>
                      <button
                        type="button"
                        onClick={() => sec(rayon)}
                        aria-current={rayon.kod === secilenKod ? "true" : undefined}
                        className="basilir flex w-full items-center justify-between gap-2 pr-6"
                        style={{ minHeight: TOXUNMA }}
                      >
                        <span className="flex items-center gap-2" style={{ color: C.ink, ...TIPO.metn }}>
                          <Icon name="Clock" size={16} color={C.muted} />
                          {rayon.name}
                        </span>
                        {rayon.kod === secilenKod && <Icon name="Check" size={16} color={C.field} />}
                      </button>
                    </li>
                  ))}
                </ul>
                <h3
                  className="pt-3 pb-1"
                  style={{ color: C.muted, ...TIPO.qeyd, fontWeight: 700 }}
                >
                  {t("onb.rayon.butunRayonlar")}
                </h3>
              </section>
            )}

            {bloklar.map(([h, rayonlar]) => (
              <section key={h} data-herf={h}>
                <h3
                  className="sticky top-0 py-1"
                  style={{ backgroundColor: C.card, color: C.muted, ...TIPO.qeyd, fontWeight: 700 }}
                >
                  {h}
                </h3>
                <ul>
                  {rayonlar.map((rayon) => {
                    const [evvel, uygun, sonra] = vurguParcasi(rayon.name, query);
                    const secilib = rayon.kod === secilenKod;
                    return (
                      <li key={rayon.kod}>
                        <button
                          type="button"
                          onClick={() => sec(rayon)}
                          aria-current={secilib ? "true" : undefined}
                          className="basilir flex w-full items-center justify-between gap-2 pr-6"
                          style={{ minHeight: TOXUNMA }}
                        >
                          <span style={{ color: C.ink, ...TIPO.metn }}>
                            {evvel}
                            {uygun && (
                              <mark style={{ backgroundColor: C.fieldSoft, color: C.field }}>
                                {uygun}
                              </mark>
                            )}
                            {sonra}
                          </span>
                          {secilib && <Icon name="Check" size={16} color={C.field} />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </>
        )}
      </div>
    </Sheet>
  );
}

