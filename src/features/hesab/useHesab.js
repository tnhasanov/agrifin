import { useEffect, useRef, useState } from "react";
import { useStore } from "../../state/store.jsx";
import {
  balGonder,
  hesabVeziyyeti,
  saheGonder,
  saheYukle,
  snapshotGonder,
} from "../../services/hesab.js";
import { saheAcari } from "../../services/ndvi.js";

/**
 * Hesab sinxronu — App-də bir dəfə qurulur.
 *
 * Nə edir:
 *   1. Açılışda serverdən "kiməm?" soruşur. Cookie ölübsə saxlanan telefon
 *      silinir; sağdırsa store yenilənir.
 *   1b. Daxil olmuş hesabın serverdəki sahəsi: yerli sahə YOXDURSA qəbul
 *      edilir — bitkisi ilə birlikdə. Həm açılışda, həm də tətbiq işləyərkən
 *      girişdən sonra (əvvəl yalnız açılışda idi: sonradan daxil olan fermer
 *      sahəsini reload-a qədər görmürdü, onu yenidən çəksə serverdəkini
 *      əvəz edirdi).
 *   2. Sahə sinxronu: yerli sahə varsa serverə YAZILIR (bu cihazda çəkilən
 *      kontur həqiqətdir). Bitki dəyişəndə də yazılır — kredit müddəti və
 *      bazar ön yoxlaması serverdəki bitkidən çıxır, ekranla ayrılmamalıdır.
 *   3. Daxil olmuş fermerin tarixçə snapshot-u və hər indeks hesablanması
 *      serverə yazılır (bal jurnalı — kalibrləmə üçün, bax: db/schema.sql).
 *
 * Hamısı SƏSSİZ və İKİNCİLİDİR: heç bir uğursuzluq UI-da xəta göstərmir,
 * tətbiq localStorage ilə işləməyə davam edir.
 */
export function useHesab(indeksHali) {
  const { state, actions } = useStore();
  const telefon = state.hesab.telefon;
  const sahe = state.sahe;
  const bitki = state.chat.crop;

  // Server sahəni tanıyana qədər snapshot/bal göndərilmir (409 olar)
  const [saheServerde, setSaheServerde] = useState(false);
  const yoxlandiRef = useRef(false);
  const sonBalRef = useRef("");

  // 1. Açılış: sessiya kimindir?
  useEffect(() => {
    if (yoxlandiRef.current) return undefined;
    yoxlandiRef.current = true;
    const controller = new AbortController();

    (async () => {
      const veziyyet = await hesabVeziyyeti({ signal: controller.signal });
      if (!veziyyet) return;
      if (veziyyet.telefon) {
        actions.hesabTelefon(veziyyet.telefon);
      } else if (telefon) {
        // Cookie bitib/silinib — köhnə telefonu göstərmək yalan olardı
        actions.hesabCixdi();
      }
    })().catch(() => {});

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 1b. Yerli sahə yoxdursa serverdəki QƏBUL edilir — köhnə cihazın sahəsi
  // yenisində dirilir. Bitki də gəlir: yalnız kontur qəbul edilsəydi, 2-ci
  // effekt bitkisiz PUT göndərib serverdəki seçimi silərdi.
  const saheVar = Boolean(sahe);
  useEffect(() => {
    if (!telefon || saheVar) return undefined;
    const controller = new AbortController();
    saheYukle({ signal: controller.signal })
      .then((server) => {
        if (controller.signal.aborted || !server?.sahe) return;
        actions.saheQebulEt({ noqteler: server.sahe.noqteler, hektar: server.sahe.hektar });
        if (server.sahe.bitki && !bitki) actions.chatSetCrop(server.sahe.bitki);
        setSaheServerde(true);
      })
      .catch(() => {});
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telefon, saheVar]);

  // 2. Yerli sahə (çəkilən və ya dəyişən) və bitki daxil olmuş hesaba yazılır.
  // Bitki null olsa server mövcud bitkini saxlayır (api/sahe.js → COALESCE).
  const acar = sahe ? saheAcari(sahe.noqteler) : "";
  useEffect(() => {
    if (!telefon || !sahe) return;
    saheGonder({ noqteler: sahe.noqteler, hektar: sahe.hektar, bitki })
      .then(() => setSaheServerde(true))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telefon, acar, bitki]);

  // 3a. Tarixçə snapshot-u — sahə serverdə olandan sonra, kontur başına bir dəfə
  useEffect(() => {
    if (!telefon || !saheServerde) return;
    if (indeksHali.hal !== "hazir" || !indeksHali.movsumler.length) return;
    snapshotGonder("tarixce", { acar, movsumler: indeksHali.movsumler }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telefon, saheServerde, indeksHali.hal, acar]);

  // 3b. Bal jurnalı: eyni (kontur, bal) cütü təkrar yazılmır — jurnal
  // hesablama dəyişikliklərini izləyir, hər renderi yox
  const indeks = indeksHali.indeks;
  useEffect(() => {
    // Bal yoxdursa (məlumat keyfiyyəti qapısı) və ya bant verilməyibsə
    // (kritik amil ölçülməyib) jurnal sətri yazılmır: kalibrləmə jurnalı
    // yalnız TAM nəticələri saxlamalıdır
    if (!telefon || !saheServerde || !indeks) return;
    if (indeks.bal == null || !indeks.bant) return;
    const balAcari = `${acar}|${indeks.bal}|${indeks.etibar}`;
    if (sonBalRef.current === balAcari) return;
    sonBalRef.current = balAcari;
    balGonder({
      bal: indeks.bal,
      bant: indeks.bant,
      etibar: indeks.etibar,
      amiller: { setirler: indeks.setirler },
    }).catch(() => {});
  }, [telefon, saheServerde, indeks, acar]);
}
