import { Chip } from "../../components/Chip.jsx";
import { C } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";

/** Sifariş halının çipi — rəng mənadır: yeni/baxılır qızılı, yolda mavi, tamam yaşıl, ləğv qırmızı */
const GORUNUS = {
  new: { color: "goldInk", bg: "goldSoft" },
  confirmed: { color: "info", bg: "infoSoft" },
  preparing: { color: "info", bg: "infoSoft" },
  delivering: { color: "info", bg: "infoSoft" },
  completed: { color: "success", bg: "successSoft" },
  cancelled: { color: "danger", bg: "dangerSoft" },
};

export function HalCipi({ hal }) {
  const { t } = useI18n();
  const g = GORUNUS[hal] ?? GORUNUS.new;
  return <Chip label={t(`bazar.hal.${hal}`)} color={C[g.color]} bg={C[g.bg]} />;
}
