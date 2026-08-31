import { beforeEach, describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderApp } from "../../test/render.jsx";
import { VegetasiyaQrafiki } from "./VegetasiyaQrafiki.jsx";

const SERIYA = [
  { baslangic: "2026-06-01", son: "2026-06-05", ndvi: 0.52 },
  { baslangic: "2026-06-06", son: "2026-06-10", ndvi: 0.58 },
  { baslangic: "2026-07-01", son: "2026-07-05", ndvi: 0.61 },
  { baslangic: "2026-08-01", son: "2026-08-05", ndvi: 0.68 },
];

const HAZIR = { hal: "hazir", seriya: SERIYA };
const MUQAYISE = { medyan: 0.6, ferq: 13, pille: "yuxari" };

beforeEach(() => {
  window.localStorage.setItem("agrifin:lang", JSON.stringify("az"));
});

describe("vegetasiya dinamikası qrafiki", () => {
  it("başlıq, dəyişmə və mənbə sətri göstərilir", () => {
    renderApp(<VegetasiyaQrafiki peyk={HAZIR} muqayise={MUQAYISE} />);

    expect(screen.getByText("Vegetasiya dinamikası")).toBeInTheDocument();
    // 52% → 68%: dəyişmə 16 vahiddir
    expect(screen.getByText(/▲ 16%/)).toBeInTheDocument();
    expect(screen.getByText("4 peyk ölçməsi · Sentinel-2")).toBeInTheDocument();
  });

  // Brief tələbi: hər qrafikin MƏTN xülasəsi olmalıdır
  it("ekran oxuyucusu üçün mətn xülasəsi var", () => {
    renderApp(<VegetasiyaQrafiki peyk={HAZIR} muqayise={MUQAYISE} />);

    const qrafik = screen.getByRole("img");
    expect(qrafik).toHaveAccessibleName(
      "Bitki örtüyü qrafiki: 4 ölçmə, 52%-dən 68%-ə. Rayon ortalaması 60%.",
    );
  });

  it("rayon ortalaması ilə fərq yazılır və əfsanə göstərilir", () => {
    renderApp(<VegetasiyaQrafiki peyk={HAZIR} muqayise={MUQAYISE} />);

    expect(screen.getByText("Rayon ortalamasından 13% yuxarı")).toBeInTheDocument();
    expect(screen.getByText("Sizin sahə")).toBeInTheDocument();
    expect(screen.getByText("Rayon ortalaması")).toBeInTheDocument();
  });

  it("aşağı olanda düzgün cümlə seçilir", () => {
    renderApp(<VegetasiyaQrafiki peyk={HAZIR} muqayise={{ medyan: 0.75, ferq: -9 }} />);
    expect(screen.getByText("Rayon ortalamasından 9% aşağı")).toBeInTheDocument();
  });

  // ── UYDURMA MƏLUMAT YOXDUR ────────────────────────────────────────
  it("bir ölçmə ilə qrafik çəkilmir — dinamika yoxdur", () => {
    const { container } = renderApp(
      <VegetasiyaQrafiki peyk={{ hal: "hazir", seriya: [SERIYA[0]] }} muqayise={MUQAYISE} />,
    );
    expect(container.textContent).toBe("");
  });

  it("ölçmə gəlməyibsə qrafik çəkilmir", () => {
    const { container } = renderApp(
      <VegetasiyaQrafiki peyk={{ hal: "yuklenir", seriya: [] }} muqayise={MUQAYISE} />,
    );
    expect(container.textContent).toBe("");
  });

  // Ətraf məlumatı yoxdursa xətt çəkilmir, amma sahənin öz əyrisi qalır
  it("rayon ortalaması yoxdursa yalnız sahənin xətti göstərilir", () => {
    renderApp(<VegetasiyaQrafiki peyk={HAZIR} muqayise={null} />);

    expect(screen.getByText("Vegetasiya dinamikası")).toBeInTheDocument();
    expect(screen.queryByText("Rayon ortalaması")).not.toBeInTheDocument();
    expect(screen.queryByText(/Rayon ortalamasından/)).not.toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(/Rayon ortalaması —%/);
  });

  // Median sıfıra yaxın olanda mühərrik faizi null qaytarır (bax: ndvi.js)
  it("faiz mənasızdırsa müqayisə cümləsi yazılmır", () => {
    renderApp(<VegetasiyaQrafiki peyk={HAZIR} muqayise={{ medyan: 0.02, ferq: null }} />);
    expect(screen.queryByText(/Rayon ortalamasından/)).not.toBeInTheDocument();
  });
});

describe("ox etiketləri", () => {
  it("bütün ölçmələr eyni aydırsa etiket bir dəfə yazılır", () => {
    const eyniAy = [
      { son: "2026-08-05", ndvi: 0.6 },
      { son: "2026-08-15", ndvi: 0.63 },
      { son: "2026-08-25", ndvi: 0.68 },
    ];
    renderApp(<VegetasiyaQrafiki peyk={{ hal: "hazir", seriya: eyniAy }} muqayise={null} />);
    expect(screen.getAllByText("avq")).toHaveLength(1);
  });

  it("aylar fərqlidirsə hər ay öz etiketini alır", () => {
    renderApp(<VegetasiyaQrafiki peyk={{ hal: "hazir", seriya: SERIYA }} muqayise={null} />);
    // iyn (ilk), iyl (orta), avq (son)
    expect(screen.getByText("iyn")).toBeInTheDocument();
    expect(screen.getByText("avq")).toBeInTheDocument();
  });
});

describe("başlıqdakı dəyişmə", () => {
  // 150 günlük pəncərədə "ilk vs son" əkin vaxtı ilə müqayisədir və
  // həmişə böyük müsbət rəqəm verir — mənasızdır. Son 2 həftə göstərilir.
  it("bütün pəncərəni yox, son 2 həftəni göstərir", () => {
    const movsum = [0.2, 0.3, 0.45, 0.6, 0.68, 0.7, 0.72].map((ndvi, i) => ({
      son: `2026-0${4 + Math.floor(i / 3)}-0${(i % 3) + 1}`,
      ndvi,
    }));
    renderApp(<VegetasiyaQrafiki peyk={{ hal: "hazir", seriya: movsum }} muqayise={null} />);

    // Son (72%) vs 3 dövr əvvəl (60%) = 12 vahid — 20-dən (ilk ölçmə) yox
    expect(screen.getByText(/▲ 12%/)).toBeInTheDocument();
    expect(screen.getByText("· 2 həftə")).toBeInTheDocument();
    expect(screen.queryByText(/52%/)).not.toBeInTheDocument();
  });
});
