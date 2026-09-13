import { useMemo, useState } from "react";
import { useI18n } from "../i18n/index.jsx";
import { useRouter } from "../lib/router.jsx";
import { useStore } from "../state/store.jsx";
import { BOS_SUZGEC } from "../../lib/bazar/axtaris.js";
import { ekinPlani } from "../../lib/bazar/tovsiye.js";
import { mehsulTap } from "../../lib/bazar/kataloq.js";
import { useSebet } from "../features/bazar/useSebet.js";
import { altYolOxu, bazarYolu, valideynYolu } from "../features/bazar/yollar.js";
import { BazarEvi } from "../features/bazar/ekranlar/BazarEvi.jsx";
import { KateqoriyaEkrani } from "../features/bazar/ekranlar/KateqoriyaEkrani.jsx";
import { AxtarisEkrani } from "../features/bazar/ekranlar/AxtarisEkrani.jsx";
import { MehsulEkrani } from "../features/bazar/ekranlar/MehsulEkrani.jsx";
import { TedarukcuEkrani } from "../features/bazar/ekranlar/TedarukcuEkrani.jsx";
import { SebetEkrani } from "../features/bazar/ekranlar/SebetEkrani.jsx";
import { SifarisEkrani } from "../features/bazar/ekranlar/SifarisEkrani.jsx";
import { SifarislerEkrani } from "../features/bazar/ekranlar/SifarislerEkrani.jsx";
import { SifarisDetali } from "../features/bazar/ekranlar/SifarisDetali.jsx";
import { TovsiyeEkrani } from "../features/bazar/ekranlar/TovsiyeEkrani.jsx";

const AKTIV_HALLAR = new Set(["new", "confirmed", "preparing", "delivering"]);

/**
 * BAZAR — tətbiqin ticarət qatı, on alt-səhifə bir marşrutda.
 *
 * Bu komponent tab dəyişməyənə qədər YENİDƏN QURULMUR (App: key=route.id),
 * ona görə axtarış mətni, süzgəc, sıra və "sifariş üçün seçilmiş ödəniş
 * üsulu" burada yaşayır: məhsula gedib "geri" qayıdan fermer süzgəcini
 * itirmir.
 *
 * Alt-səhifələr arasında keçid dərinliyə görə soldan/sağdan gəlir
 * (ekran-giris + --dir), tablar arasındakı ilə eyni hərəkət dili.
 */
export function BazarScreen({ sifarisHali, onOpenLoan, onOpenHesab, onDrawField, onOpenBitki }) {
  const { t } = useI18n();
  const { path, navigate } = useRouter();
  const { state, actions } = useStore();
  const sebet = useSebet();

  const alt = altYolOxu(path);
  const [sorgu, setSorgu] = useState("");
  const [suzgec, setSuzgec] = useState(BOS_SUZGEC);
  const [sira, setSira] = useState("tovsiye");
  const [secilenOdenis, setSecilenOdenis] = useState("on_delivery");
  // Yenicə yaradılan sifariş — detal səhifəsi əvvəl uğur ekranı göstərir
  const [yeniSifarisId, setYeniSifarisId] = useState(null);

  // Keçid istiqaməti: dərinə gedəndə sağdan, geri qayıdanda soldan
  const [kecid, setKecid] = useState({ derinlik: alt.derinlik, dir: 0 });
  if (kecid.derinlik !== alt.derinlik) {
    setKecid({ derinlik: alt.derinlik, dir: Math.sign(alt.derinlik - kecid.derinlik) });
  }

  const rayon = state.location;
  const bitki = state.chat.crop;
  const sahe = state.sahe;

  const plan = useMemo(
    () => ekinPlani({ bitki, hektar: sahe?.hektar ?? null, sifarisler: sifarisHali.sifarisler }),
    [bitki, sahe?.hektar, sifarisHali.sifarisler],
  );

  // Naviqasiya köməkçisi — hər ekran eyni obyekti alır
  const get = useMemo(
    () => ({
      ev: () => navigate(bazarYolu.ev()),
      kateqoriya: (kod) => navigate(bazarYolu.kateqoriya(kod)),
      axtar: () => navigate(bazarYolu.axtar()),
      mehsul: (kod) => navigate(bazarYolu.mehsul(kod)),
      tedarukcu: (kod) => navigate(bazarYolu.tedarukcu(kod)),
      sebet: () => navigate(bazarYolu.sebet()),
      sifaris: () => navigate(bazarYolu.sifaris()),
      sifarisler: () => navigate(bazarYolu.sifarisler()),
      sifarisDetal: (id) => navigate(bazarYolu.sifarisDetal(id)),
      tovsiye: () => navigate(bazarYolu.tovsiye()),
    }),
    [navigate],
  );

  const aktivSifarisSayi = sifarisHali.sifarisler.filter((s) => AKTIV_HALLAR.has(s.hal)).length;
  const mehsulKateqoriyasi = alt.ekran === "mehsul" ? (mehsulTap(alt.param)?.kateqoriya ?? null) : null;
  const geri = () => navigate(valideynYolu(alt, { kateqoriya: mehsulKateqoriyasi }));

  const sifarisBasla = (odenis) => {
    setSecilenOdenis(odenis);
    get.sifaris();
  };

  // Uğurlu sifariş: səbət boşalır, çatdırılma məlumatı növbəti dəfə üçün qalır
  const sifarisUgurlu = (sifaris, catdirilma) => {
    sebet.temizle();
    actions.catdirilmaSet(catdirilma);
    setSecilenOdenis("on_delivery");
    setYeniSifarisId(sifaris.id);
    navigate(bazarYolu.sifarisDetal(sifaris.id), { replace: true });
  };

  // Maliyyə: mövcud kredit paneli sifarişin məbləğində açılır, müraciət
  // sifarişə bağlanır (App → LoanSheet → api/bazar maliyye-bagla)
  const muracieteKec = (sifaris) => {
    onOpenLoan({ mebleg: sifaris.maliyye?.mebleg ?? sifaris.cemi, sifarisId: sifaris.id });
  };

  let ekran;
  switch (alt.ekran) {
    case "kateqoriya":
      ekran = (
        <KateqoriyaEkrani kod={alt.param} get={get} geri={geri} sebetSayi={sebet.sayCemi} rayon={rayon} bitki={bitki} suzgec={suzgec} onSuzgec={setSuzgec} sira={sira} onSira={setSira} />
      );
      break;
    case "axtar":
      ekran = (
        <AxtarisEkrani get={get} geri={geri} sebetSayi={sebet.sayCemi} rayon={rayon} bitki={bitki} sorgu={sorgu} onSorgu={setSorgu} suzgec={suzgec} onSuzgec={setSuzgec} sira={sira} onSira={setSira} />
      );
      break;
    case "mehsul":
      ekran = (
        <MehsulEkrani key={alt.param} kod={alt.param} get={get} geri={geri} sebet={sebet} rayon={rayon} bitki={bitki} onOpenHesab={onOpenHesab} onMaliyyeIleDavam={() => sifarisBasla("agrofin_financing")} />
      );
      break;
    case "tedarukcu":
      ekran = <TedarukcuEkrani key={alt.param} kod={alt.param} get={get} geri={geri} sebetSayi={sebet.sayCemi} rayon={rayon} bitki={bitki} />;
      break;
    case "sebet":
      ekran = <SebetEkrani get={get} geri={geri} sebet={sebet} rayon={rayon} onSifaris={sifarisBasla} />;
      break;
    case "sifaris":
      ekran = sebet.bos ? (
        <SebetEkrani get={get} geri={() => get.ev()} sebet={sebet} rayon={rayon} onSifaris={sifarisBasla} />
      ) : (
        <SifarisEkrani
          geri={geri}
          sebet={sebet}
          rayon={rayon}
          sonRayonlar={state.sonRayonlar}
          hesabTelefon={state.hesab.telefon}
          sonCatdirilma={state.catdirilma}
          sifarisHali={sifarisHali}
          ilkOdenis={secilenOdenis}
          onUgur={sifarisUgurlu}
          onOpenHesab={onOpenHesab}
        />
      );
      break;
    case "sifarisler":
      ekran = <SifarislerEkrani get={get} geri={geri} sifarisHali={sifarisHali} onOpenHesab={onOpenHesab} />;
      break;
    case "sifarisDetal":
      ekran = (
        <SifarisDetali
          key={alt.param}
          id={alt.param}
          get={get}
          geri={geri}
          sifarisHali={sifarisHali}
          yeni={String(yeniSifarisId) === String(alt.param)}
          onYeniBagla={() => setYeniSifarisId(null)}
          onMuraciet={muracieteKec}
        />
      );
      break;
    case "tovsiye":
      ekran = <TovsiyeEkrani get={get} geri={geri} sebet={sebet} sahe={sahe} bitki={bitki} rayon={rayon} plan={plan} onDrawField={onDrawField} onOpenBitki={onOpenBitki} />;
      break;
    default:
      ekran = (
        <BazarEvi get={get} sebetSayi={sebet.sayCemi} aktivSifarisSayi={aktivSifarisSayi} sahe={sahe} bitki={bitki} rayon={rayon} plan={plan} onDrawField={onDrawField} onOpenBitki={onOpenBitki} />
      );
  }

  return (
    <div key={path} className="ekran-giris" style={{ "--dir": kecid.dir }} aria-label={t("nav.bazar")}>
      {ekran}
    </div>
  );
}
