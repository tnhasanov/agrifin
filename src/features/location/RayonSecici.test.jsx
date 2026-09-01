import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RayonSecici } from "./RayonSecici.jsx";
import { renderApp } from "../../test/render.jsx";
import { hadiseleriOxu, hadiseleriTemizle } from "../../lib/analytics.js";
import { DISTRICTS } from "../../services/location.js";

function ciz({ secilen = null, sonKodlar = [], onSec = vi.fn() } = {}) {
  const netice = renderApp(
    <RayonSecici secilen={secilen} sonKodlar={sonKodlar} onSec={onSec} />,
  );
  return { ...netice, onSec };
}

/** navigator.geolocation-u verilmiş cavabla əvəz edir */
function gpsQur(cavab) {
  vi.stubGlobal("navigator", {
    ...navigator,
    onLine: true,
    geolocation: {
      getCurrentPosition: (ugur, xeta) => {
        if (cavab.coords) ugur({ coords: cavab.coords });
        else xeta({ code: cavab.code });
      },
    },
  });
}

const vereqiAc = async (user) => {
  await user.click(screen.getByRole("button", { name: /Rayon seçin və ya axtarın/ }));
  return screen.findByRole("dialog", { name: "Rayon seçin" });
};

beforeEach(() => {
  window.localStorage.setItem("agrifin:lang", JSON.stringify("az"));
  hadiseleriTemizle();
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("bağlı hal", () => {
  it("ilk ekranda TAM siyahı göstərilmir — 47 sətir ekranı doldurmur", () => {
    ciz();
    // Yalnız GPS və axtarış düymələri var; rayon düyməsi yoxdur
    expect(screen.queryByRole("button", { name: "Ağcabədi" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cari yerimi istifadə et/ })).toBeInTheDocument();
  });

  it("tarixçə yoxdursa çip GÖSTƏRİLMİR — uydurma «tez-tez seçilənlər» olmur", () => {
    ciz();
    expect(screen.queryByText("Tez-tez seçilənlər")).not.toBeInTheDocument();
  });

  it("tarixçə varsa ən çox üç çip göstərilir", () => {
    ciz({ sonKodlar: ["berde", "quba", "xacmaz", "seki"] });
    expect(screen.getByText("Tez-tez seçilənlər")).toBeInTheDocument();
    for (const ad of ["Bərdə", "Quba", "Xaçmaz"]) {
      expect(screen.getByRole("button", { name: ad })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Şəki" })).not.toBeInTheDocument();
  });

  it("seçilmiş rayonun adı xanada görünür", () => {
    ciz({ secilen: { kod: "seki", name: "Şəki", lat: 41.19, lon: 47.17 } });
    expect(screen.getByRole("button", { name: /Şəki/ })).toBeInTheDocument();
  });
});

describe("vərəq: axtarış və siyahı", () => {
  it("açılanda bütün rayonlar və əlifba bölmələri görünür", async () => {
    const user = userEvent.setup();
    ciz();
    const vereq = await vereqiAc(user);

    expect(within(vereq).getByRole("button", { name: "Ağcabədi" })).toBeInTheDocument();
    expect(within(vereq).getByRole("button", { name: "Zərdab" })).toBeInTheDocument();
  });

  it("iki hərfdən sonra süzülür", async () => {
    const user = userEvent.setup();
    ciz();
    const vereq = await vereqiAc(user);
    const xana = within(vereq).getByRole("searchbox", { name: "Rayon seçin və ya axtarın" });

    await user.type(xana, "q");
    expect(within(vereq).getByRole("button", { name: "Ağcabədi" })).toBeInTheDocument();

    await user.type(xana, "əbələ");
    expect(within(vereq).getByRole("button", { name: "Qəbələ" })).toBeInTheDocument();
    expect(within(vereq).queryByRole("button", { name: "Ağcabədi" })).not.toBeInTheDocument();
  });

  it("aksentsiz yazılış da tapır", async () => {
    const user = userEvent.setup();
    ciz();
    const vereq = await vereqiAc(user);

    await user.type(within(vereq).getByRole("searchbox"), "gence");
    expect(within(vereq).getByRole("button", { name: "Gəncə" })).toBeInTheDocument();
  });

  it("nəticə yoxdursa dürüst mesaj verir — yaxın rayon təklif etmir", async () => {
    const user = userEvent.setup();
    ciz();
    const vereq = await vereqiAc(user);

    await user.type(within(vereq).getByRole("searchbox"), "zzzz");
    expect(within(vereq).getByText("Nəticə tapılmadı")).toBeInTheDocument();
    expect(within(vereq).getByText("Rayon adını yoxlayın")).toBeInTheDocument();
    expect(within(vereq).queryByRole("button", { name: "Zərdab" })).not.toBeInTheDocument();
  });

  it("seçim vərəqi bağlayır və KODU verir", async () => {
    const user = userEvent.setup();
    const { onSec } = ciz();
    const vereq = await vereqiAc(user);

    await user.click(within(vereq).getByRole("button", { name: "Şəki" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Rayon seçin" })).not.toBeInTheDocument(),
    );
    expect(onSec).toHaveBeenCalledWith(expect.objectContaining({ kod: "seki", gps: false }));
  });

  it("son seçilənlər bölməsi tarixçə olanda görünür", async () => {
    const user = userEvent.setup();
    ciz({ sonKodlar: ["quba"] });
    const vereq = await vereqiAc(user);

    expect(within(vereq).getByText("Son seçilənlər")).toBeInTheDocument();
    expect(within(vereq).getByText("Bütün rayonlar")).toBeInTheDocument();
  });

  it("axtarış gedəndə tarixçə bölməsi qapını kəsmir", async () => {
    const user = userEvent.setup();
    ciz({ sonKodlar: ["quba"] });
    const vereq = await vereqiAc(user);

    await user.type(within(vereq).getByRole("searchbox"), "berde");
    expect(within(vereq).queryByText("Son seçilənlər")).not.toBeInTheDocument();
  });

  it("bütün rayonlar siyahıda mövcuddur", async () => {
    const user = userEvent.setup();
    ciz();
    const vereq = await vereqiAc(user);
    const duymeler = within(vereq).getAllByRole("button");
    for (const rayon of DISTRICTS) {
      expect(duymeler.some((d) => d.textContent.includes(rayon.name))).toBe(true);
    }
  });
});

describe("GPS bərpa halları", () => {
  it("icazə İSTƏNMİR — yalnız düyməyə toxunandan sonra soruşulur", () => {
    const cagirildi = vi.fn();
    vi.stubGlobal("navigator", {
      ...navigator,
      onLine: true,
      geolocation: { getCurrentPosition: cagirildi },
    });
    ciz();
    expect(cagirildi).not.toHaveBeenCalled();
  });

  it("icazə verilsə rayonu KODLA qaytarır", async () => {
    const user = userEvent.setup();
    gpsQur({ coords: { latitude: 40.3705, longitude: 47.1265 } });
    const { onSec } = ciz();

    await user.click(screen.getByRole("button", { name: /Cari yerimi istifadə et/ }));
    await waitFor(() =>
      expect(onSec).toHaveBeenCalledWith(expect.objectContaining({ kod: "berde", gps: true })),
    );
  });

  it("icazə rədd ediləndə siyahıya yönəldir və TƏKRAR təklif etmir", async () => {
    const user = userEvent.setup();
    gpsQur({ code: 1 });
    ciz();

    await user.click(screen.getByRole("button", { name: /Cari yerimi istifadə et/ }));
    const xeta = await screen.findByRole("alert");
    expect(xeta).toHaveTextContent("Məkan icazəsi verilmədi. Rayonu siyahıdan seçin.");
    expect(within(xeta).queryByRole("button", { name: "Yenidən cəhd et" })).not.toBeInTheDocument();
  });

  it("vaxt bitəndə TƏKRAR cəhd təklif olunur", async () => {
    const user = userEvent.setup();
    gpsQur({ code: 3 });
    ciz();

    await user.click(screen.getByRole("button", { name: /Cari yerimi istifadə et/ }));
    const xeta = await screen.findByRole("alert");
    expect(xeta).toHaveTextContent("Məkan vaxtında müəyyən edilmədi.");
    expect(within(xeta).getByRole("button", { name: "Yenidən cəhd et" })).toBeInTheDocument();
  });

  it("oflayn halda GPS gözlətmir, siyahı işlək qalır", async () => {
    const user = userEvent.setup();
    const cagirildi = vi.fn();
    vi.stubGlobal("navigator", {
      ...navigator,
      onLine: false,
      geolocation: { getCurrentPosition: cagirildi },
    });
    ciz();

    await user.click(screen.getByRole("button", { name: /Cari yerimi istifadə et/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("İnternet yoxdur");
    expect(cagirildi).not.toHaveBeenCalled();
    // Siyahı yolu bağlanmır
    expect(screen.getByRole("button", { name: /Rayon seçin və ya axtarın/ })).toBeEnabled();
  });

  it("heç bir halda DEMO rayon seçilmir", async () => {
    const user = userEvent.setup();
    gpsQur({ code: 1 });
    const { onSec } = ciz();

    await user.click(screen.getByRole("button", { name: /Cari yerimi istifadə et/ }));
    await screen.findByRole("alert");
    expect(onSec).not.toHaveBeenCalled();
  });

  it("analitikaya KOORDİNAT yazılmır — yalnız üsul və rayon kodu", async () => {
    const user = userEvent.setup();
    gpsQur({ coords: { latitude: 40.3705, longitude: 47.1265 } });
    ciz();

    await user.click(screen.getByRole("button", { name: /Cari yerimi istifadə et/ }));
    await waitFor(() => expect(hadiseleriOxu()).toHaveLength(1));

    const hadise = hadiseleriOxu()[0];
    expect(hadise).toEqual({ ad: "onb.gps", netice: "ugurlu", rayon: "berde" });
    expect(JSON.stringify(hadise)).not.toContain("40.37");
    expect(JSON.stringify(hadise)).not.toContain("47.12");
  });
});
