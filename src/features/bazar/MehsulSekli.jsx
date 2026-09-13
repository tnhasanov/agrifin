import { useState } from "react";
import { Icon } from "../../components/Icon.jsx";
import { BitkiSekli } from "../crop/BitkiSekli.jsx";
import { kateqoriyaTap } from "../../../lib/bazar/kataloq.js";
import { ton } from "./tonlar.js";

/**
 * MƏHSUL ŞƏKLİ — üç mənbə, bir ölçü (layout shift olmur):
 *   1) `src/assets/bazar/<kod>.webp` varsa — məhsulun öz fotosu;
 *   2) toxum/ting → mövcud bitki fotosu (crop mozaikası);
 *   3) qalanlar → neytral yer tutucu: kateqoriya tonu + ikon.
 *
 * Yer tutucu QƏSDƏN sadədir: uydurma "kisə" illüstrasiyası kartı ucuz
 * göstərir; sakit ton isə real foto gələnə qədər yeri saxlayır
 * (bax: src/assets/bazar/MENBE.md).
 *
 * Şəkil bəzəkdir — məhsulun adı kartın özündədir, ona görə `aria-hidden`.
 */
const ASSETLER = import.meta.glob("../../assets/bazar/*.webp", { eager: true, query: "?url", import: "default" });
const ASSET_XERITESI = Object.fromEntries(
  Object.entries(ASSETLER).map(([yol, url]) => [yol.split("/").pop().replace(".webp", ""), url]),
);

export function MehsulSekli({ mehsul, olcu = 84, radius = 14, ikonOlcu }) {
  const [dusdu, setDusdu] = useState(false);
  const foto = mehsul ? ASSET_XERITESI[mehsul.kod] : null;
  const kateqoriya = kateqoriyaTap(mehsul?.kateqoriya);
  const t = ton(kateqoriya?.ton);

  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center overflow-hidden"
      style={{ width: olcu, height: olcu, borderRadius: radius, backgroundColor: t.bg }}
    >
      {foto && !dusdu ? (
        <img
          src={foto}
          alt=""
          width={olcu}
          height={olcu}
          loading="lazy"
          decoding="async"
          onError={() => setDusdu(true)}
          style={{ width: olcu, height: olcu, objectFit: "cover", display: "block" }}
        />
      ) : mehsul?.sekil?.nov === "bitki" ? (
        <BitkiSekli kod={mehsul.sekil.kod} en={olcu} hund={olcu} />
      ) : (
        <span
          className="flex items-center justify-center rounded-full"
          style={{
            width: Math.round(olcu * 0.5),
            height: Math.round(olcu * 0.5),
            backgroundColor: "rgba(255,255,255,0.55)",
          }}
        >
          <Icon name={kateqoriya?.ikon ?? "Package"} size={ikonOlcu ?? Math.round(olcu * 0.26)} color={t.fg} strokeWidth={1.8} />
        </span>
      )}
    </span>
  );
}
