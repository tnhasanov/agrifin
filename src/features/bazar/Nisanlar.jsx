import { Icon } from "../../components/Icon.jsx";
import { C } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";

/**
 * NİŞANLAR — kiçik, sakit, ən çox iki-üç dənə bir kartda.
 *
 * Etibar nişanı (təsdiqli satıcı) yaşıl, maliyyə nişanı bənövşəyi
 * (maliyyə = bənövşəyi qaydası, bax: theme/tokens.js → mal), qalanları
 * neytral. Böyük rəngli etiket yığını "ucuz bazar" görünüşü verir — ona
 * görə hamısı 11 px, kontur yox, yumşaq fon.
 */
export function Nisan({ ikon, label, color = C.muted, bg = C.mist, kicik = false }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full font-semibold"
      style={{
        color,
        backgroundColor: bg,
        fontSize: kicik ? 10 : 11,
        lineHeight: "14px",
        padding: kicik ? "2px 6px" : "3px 8px",
        whiteSpace: "nowrap",
      }}
    >
      {ikon && <Icon name={ikon} size={kicik ? 10 : 12} strokeWidth={2.5} color={color} />}
      {label}
    </span>
  );
}

/** ✓ Təsdiqli satıcı — sənədləri yoxlanılıb */
export function TedarukcuNisani({ tesdiqli, tam = false, kicik = false }) {
  const { t } = useI18n();
  if (!tesdiqli) return null;
  return (
    <Nisan
      ikon="BadgeCheck"
      label={tam ? t("bazar.nisan.tesdiqliSatici", { app: { key: "app.name" } }) : t("bazar.nisan.tesdiqli")}
      color={C.field}
      bg={C.fieldSoft}
      kicik={kicik}
    />
  );
}

/** AgriFin maliyyəsi — məhsul kreditlə alına bilər */
export function MaliyyeNisani({ maliyye, kicik = false }) {
  const { t } = useI18n();
  if (!maliyye) return null;
  return <Nisan ikon="Wallet" label={t("bazar.nisan.maliyye", { app: { key: "app.name" } })} color={C.mal} bg={C.malSoft} kicik={kicik} />;
}

export function OrijinalNisani({ orijinal, kicik = false }) {
  const { t } = useI18n();
  if (!orijinal) return null;
  return <Nisan ikon="ShieldCheck" label={t("bazar.nisan.orijinal")} kicik={kicik} />;
}

export function PulsuzCatdirilmaNisani({ pulsuz, kicik = false }) {
  const { t } = useI18n();
  if (!pulsuz) return null;
  return <Nisan ikon="Truck" label={t("bazar.nisan.pulsuz")} kicik={kicik} />;
}

/** Stok halı — yalnız "az"/"yoxdur" göstərilir; "var" səs-küydür */
export function StokNisani({ stok, kicik = false }) {
  const { t } = useI18n();
  if (stok === "az") return <Nisan label={t("bazar.stok.az")} color={C.goldInk} bg={C.goldSoft} kicik={kicik} />;
  if (stok === "yoxdur") return <Nisan label={t("bazar.stok.yoxdur")} color={C.danger} bg={C.dangerSoft} kicik={kicik} />;
  return null;
}
