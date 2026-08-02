// Rənglər SVG və inline style üçün JS-dən lazımdır; Tailwind sinifləri isə
// src/index.css içindəki @theme blokundan gəlir. İki yeri birlikdə dəyişin.
export const C = {
  pine: "#14351F",
  pineDeep: "#0E2818",
  field: "#2E7D4F",
  fieldSoft: "#E9F5EE",
  gold: "#E9B54A",
  goldDeep: "#C9932B",
  goldSoft: "#FBF1DA",
  blue: "#3E7BFA",
  blueSoft: "#EAF1FD",
  mist: "#EFF2EC",
  card: "#FFFFFF",
  ink: "#1A211C",
  muted: "#6B7568",
  line: "#E3E8E0",
  danger: "#C24A3F",
  dangerSoft: "#FBEAE7",
};

export const font = {
  display: "var(--font-display)",
  body: "var(--font-body)",
};

// Tövsiyə/bildiriş kartlarının rəng cütləri — məzmun növünə görə seçilir
export const tone = {
  satellite: { color: C.blue, bg: C.blueSoft },
  weather: { color: "#2C5BC7", bg: C.blueSoft },
  market: { color: C.field, bg: C.fieldSoft },
  agronomy: { color: C.goldDeep, bg: C.goldSoft },
};
