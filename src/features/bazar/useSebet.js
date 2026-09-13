import { useMemo } from "react";
import { useStore } from "../../state/store.jsx";
import { mehsulTap } from "../../../lib/bazar/kataloq.js";
import { sebetiHesabla } from "../../../lib/bazar/sifaris.js";

/**
 * SƏBƏT — store-dakı {kod, say} cütlərini kataloqla doldurur və hesablayır.
 *
 * Hesab YERLİDİR, amma serverlə EYNİ funksiyadır (lib/bazar/sifaris.js):
 * ekranda görünən rəqəm serverin yazacağı rəqəmlə bir mənbədən çıxır.
 * Bağlayıcı olan sifariş anındakı server hesabıdır; təsdiq ekranı onu
 * ayrıca göstərir (bax: ekranlar/SifarisEkrani.jsx).
 */
export function useSebet() {
  const { state, actions } = useStore();
  const rayonKod = state.location?.kod ?? null;

  const setirler = useMemo(
    () =>
      state.sebet
        .map((s) => ({ mehsul: mehsulTap(s.kod), say: s.say }))
        .filter((s) => s.mehsul),
    [state.sebet],
  );

  const hesab = useMemo(() => (setirler.length ? sebetiHesabla(setirler, { rayonKod }) : null), [setirler, rayonKod]);

  return {
    setirler,
    hesab,
    bos: setirler.length === 0,
    sayCemi: hesab?.sayCemi ?? 0,
    /** Serverə gedən forma: yalnız kod və say */
    apiSetirleri: setirler.map((s) => ({ kod: s.mehsul.kod, say: s.say })),
    elave: actions.sebeteElave,
    sayDeyis: actions.sebetSay,
    sil: actions.sebetSil,
    temizle: actions.sebetTemizle,
  };
}
