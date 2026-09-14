import { expect, test } from "@playwright/test";
import { BERDE, SAHE, sebekeniQur, veziyyetEk } from "./kome.js";
import { BAZAR_FERMERI, bazarServeri } from "./bazarKome.js";

/**
 * BAZAR — uçdan-uca: tab → kateqoriya → məhsul → səbət → sifariş → uğur →
 * detal → ləğv. Server yaddaşda təqlid olunur (bazarKome.js), yekunlar isə
 * real domen modulundan gəlir.
 *
 * Konsol xətaları YIĞILIR və testin sonunda boş olmalıdır: brief-in
 * "check browser console for errors" tələbi elə burada icra olunur.
 */

const ufuqiDasir = (page) =>
  page.evaluate(() => {
    const kok = document.scrollingElement;
    return kok.scrollWidth - kok.clientWidth > 1;
  });

let konsolXetalari;

test.beforeEach(async ({ page }) => {
  konsolXetalari = [];
  page.on("console", (m) => {
    // Şəbəkə status logları (501 təqlidi, kənar şrift sorğusu) tətbiq xətası
    // deyil — brauzer onları da "error" kimi yazır; yalnız JS xətaları sayılır
    if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) konsolXetalari.push(m.text());
  });
  page.on("pageerror", (e) => konsolXetalari.push(String(e)));
  await sebekeniQur(page);
  await veziyyetEk(page, BAZAR_FERMERI(BERDE, SAHE));
});

test.afterEach(() => {
  expect(konsolXetalari).toEqual([]);
});

test("Bazar tabı var, ana səhifə təsərrüfatdan başlayır", async ({ page }) => {
  await bazarServeri().qur(page);
  await page.goto("/");

  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("button")).toHaveText(["Ana səhifə", "Sahələr", "Bazar", "Maliyyə", "Kömək"]);
  await nav.getByRole("button", { name: "Bazar" }).click();
  await expect(page).toHaveURL(/\/bazar$/);

  await expect(page.getByRole("heading", { name: "AgriFin Bazar" })).toBeVisible();
  await expect(page.getByText("Təsərrüfatınız üçün məhsul və xidmətlər")).toBeVisible();
  // Şəxsi kart: fermerin öz bitkisi və sahəsi
  await expect(page.getByText("Sizin təsərrüfatınız üçün")).toBeVisible();
  await expect(page.getByText("Pomidor", { exact: true })).toBeVisible();
  await expect(page.getByText("10,02 ha · Bərdə")).toBeVisible();
  // Kateqoriyalar və nümunə qeydi
  await expect(page.getByRole("button", { name: "Gübrə", exact: true })).toBeVisible();
  await expect(page.getByText(/Bazar nişanlı qiymətlər/)).toBeVisible();
  expect(await ufuqiDasir(page)).toBe(false);
});

test("kateqoriya → məhsul → miqdar → səbət: say yararsız ola bilmir", async ({ page }) => {
  await bazarServeri().qur(page);
  await page.goto("/bazar");
  await page.getByRole("button", { name: "Gübrə", exact: true }).click();
  await expect(page).toHaveURL(/\/bazar\/kateqoriya\/gubre$/);
  await expect(page.getByRole("heading", { name: "Gübrə" })).toBeVisible();

  await page.getByRole("button", { name: /Karbamid 46% — 45 kq/ }).first().click();
  await expect(page).toHaveURL(/\/bazar\/mehsul\/karbamid-46-50kq$/);
  await expect(page.getByRole("heading", { name: "Karbamid 46% — 45 kq" })).toBeVisible();
  await expect(page.getByText("22,50 ₼").first()).toBeVisible();
  await expect(page.getByText("Son görünən bazar qiyməti")).toBeVisible();
  await expect(page.getByText("AgroSupply MMC").first()).toBeVisible();

  // Miqdar: minimumda "−" sönükdür; 20 yazanda yekun 450
  const miqdar = page.getByRole("spinbutton").or(page.getByRole("textbox", { name: "Miqdar" }));
  await expect(page.getByRole("button", { name: "−" })).toBeDisabled();
  await miqdar.fill("20");
  await miqdar.press("Enter");
  await expect(page.getByText("20 kisə × 22,50 ₼")).toBeVisible();
  await expect(page.getByText("Yekun: 450 ₼")).toBeVisible();
  // Maksimumdan çox yazılsa sərhədə sıxılır (maxSay 500)
  await miqdar.fill("9999");
  await miqdar.press("Enter");
  await expect(miqdar).toHaveValue("500");
  await expect(page.getByRole("button", { name: "+" })).toBeDisabled();
  await miqdar.fill("20");
  await miqdar.press("Enter");

  // Əsas CTA ekranda görünür (sürüşdürmədən), sonra səbətə əlavə
  await expect(page.getByRole("button", { name: "Səbətə əlavə et" })).toBeInViewport();
  await page.getByRole("button", { name: "Səbətə əlavə et" }).click();
  await expect(page.getByText("Səbətə əlavə olundu")).toBeVisible();
  await expect(page.getByRole("button", { name: "Səbət (20)" })).toBeVisible();
  expect(await ufuqiDasir(page)).toBe(false);
});

test("axtarış, süzgəc və sıralama", async ({ page }) => {
  await bazarServeri().qur(page);
  await page.goto("/bazar/axtar");
  const xana = page.getByRole("searchbox");
  await xana.fill("gubre");
  await expect(page.getByRole("button", { name: /Karbamid 46%/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Pomidor toxumu/ })).toHaveCount(0);

  // Süzgəc: yalnız maliyyələşdirilə bilənlər → maye humat (maliyye: false) itir
  await page.getByRole("button", { name: /^Süzgəc/ }).click();
  const vereq = page.getByRole("dialog", { name: "Süzgəclər" });
  await vereq.getByRole("switch", { name: /AgriFin maliyyəsi/ }).click();
  await vereq.getByRole("button", { name: /məhsulu göstər/ }).click();
  await expect(vereq).toBeHidden();
  await expect(page.getByRole("button", { name: /Maye humat/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Süzgəc (1)" })).toBeVisible();

  // Sıra: qiymət azalan → ilk nəticə ən bahalı gübrə (Ammofos 87)
  await page.getByRole("button", { name: /Tövsiyə olunan/ }).click();
  await page.getByRole("radio", { name: "Qiymət: yuxarıdan aşağı" }).click();
  const ilk = page.locator("[class*=giris]").filter({ has: page.getByRole("button") }).first();
  await expect(ilk).toContainText("Ammofos 12:52");
});

test("tam sifariş axını: səbət → çatdırılma → təsdiq → uğur → detal → ləğv", async ({ page }) => {
  // Yeddi ekran bir axında — standart 30 s büdcəsi kifayət etmir
  test.setTimeout(90_000);
  const server = bazarServeri();
  await server.qur(page);
  await page.goto("/bazar/mehsul/karbamid-46-50kq");
  const miqdar = page.getByRole("textbox", { name: "Miqdar" });
  await miqdar.fill("20");
  await miqdar.press("Enter");
  await page.getByRole("button", { name: "Səbətə əlavə et" }).click();

  await page.goto("/bazar/mehsul/pomidor-toxumu-f1");
  await page.getByRole("button", { name: "+" }).click();
  await page.getByRole("button", { name: "Səbətə əlavə et" }).click();

  // Səbət: iki sətir, yekun 685 ₼ (15 ₼ çatdırılma daxil)
  await page.getByRole("button", { name: "Səbət (22)" }).click();
  await expect(page).toHaveURL(/\/bazar\/sebet$/);
  await expect(page.getByText("20 × 22,50 ₼")).toBeVisible();
  await expect(page.getByText("2 × 110 ₼")).toBeVisible();
  await expect(page.getByText("685 ₼").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Sifarişi tamamla" })).toBeInViewport();
  expect(await ufuqiDasir(page)).toBe(false);

  // Çatdırılma: rayon və telefon artıq doludur — yalnız ad soruşulur
  await page.getByRole("button", { name: "Sifarişi tamamla" }).click();
  await expect(page).toHaveURL(/\/bazar\/sifaris$/);
  await expect(page.getByRole("button", { name: /Bərdə/ })).toBeVisible();
  await expect(page.getByLabel("Əlaqə telefonu")).toHaveValue("+994501234567");
  await page.getByRole("button", { name: "Davam et" }).click();
  await expect(page.getByText("Ad ən azı 2 hərf olmalıdır")).toBeVisible();
  await page.getByLabel("Alıcının adı").fill("Tural Həsənov");
  await page.getByRole("button", { name: "Davam et" }).click();

  // Təsdiq: yekun serverdən
  await expect(page.getByText("Yekun server tərəfindən hesablanıb")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Çatdırılmada ödəniş/ })).toBeChecked();
  await page.getByRole("button", { name: "Sifarişi təsdiqlə" }).click();

  // Uğur ekranı
  await expect(page.getByRole("heading", { name: "Sifarişiniz qəbul edildi" })).toBeVisible();
  await expect(page.getByText("AF-000001")).toBeVisible();
  await expect(page.getByText("AgroSupply MMC, AzərToxum ASC")).toBeVisible();
  expect(server.oxu()).toHaveLength(1);
  expect(server.oxu()[0].cemi).toBe(685);

  // Detal: zaman xətti "Yeni", ləğv
  await page.getByRole("button", { name: "Sifarişə bax" }).click();
  await expect(page.getByRole("heading", { name: "Sifariş AF-000001" })).toBeVisible();
  await expect(page.getByText("Statuslar tədarükçü tərəfindən yenilənir.")).toBeVisible();
  await page.getByRole("button", { name: "Sifarişi ləğv et" }).click();
  await page.getByRole("button", { name: "Bəli, ləğv et" }).click();
  await expect(page.getByText("Ləğv edildi").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Sifarişi ləğv et" })).toHaveCount(0);

  // Səbət boşalıb, sifarişlər siyahısında görünür
  await page.goto("/bazar/sifarisler");
  await expect(page.getByText("AF-000001")).toBeVisible();
  await page.goto("/bazar/sebet");
  await expect(page.getByText("Səbətiniz boşdur")).toBeVisible();
});

test("maliyyələşdirmə: yoxlama vərəqi → maliyyə ilə sifariş → müraciətə keçid", async ({ page }) => {
  const server = bazarServeri({ maliyyeHal: "uygun" });
  await server.qur(page);
  await page.goto("/bazar/mehsul/damci-lenti-16mm-500m");
  await page.getByRole("textbox", { name: "Miqdar" }).fill("10");
  await page.getByRole("textbox", { name: "Miqdar" }).press("Enter");
  await page.getByRole("button", { name: "Maliyyələşdirmə imkanını yoxla" }).click();

  const vereq = page.getByRole("dialog", { name: "Maliyyələşdirməni yoxla" });
  await expect(vereq.getByText("Sahəniz bu məbləği daşıya bilər")).toBeVisible();
  await expect(vereq.getByText("950 ₼").first()).toBeVisible();
  await vereq.getByRole("button", { name: "Səbətə əlavə et və sifarişə keç" }).click();

  await expect(page).toHaveURL(/\/bazar\/sifaris$/);
  await page.getByLabel("Alıcının adı").fill("Tural Həsənov");
  await page.getByRole("button", { name: "Davam et" }).click();
  await expect(page.getByRole("radio", { name: /AgriFin ilə maliyyələşdir/ })).toBeChecked();
  await expect(page.getByText("Sahəniz bu məbləği daşıya bilər")).toBeVisible();
  await page.getByRole("button", { name: "Sifarişi təsdiqlə" }).click();

  await expect(page.getByRole("heading", { name: "Sifarişiniz qəbul edildi" })).toBeVisible();
  await expect(page.getByText("Kredit müraciətini tamamlayın")).toBeVisible();
  expect(server.oxu()[0].odenisUsulu).toBe("agrofin_financing");
  expect(server.oxu()[0].maliyye.mebleg).toBe(950);
  // Müraciətə keçid mövcud kredit panelini açır (kredit serveri qurulmayıb → dürüst mesaj)
  await page.getByRole("button", { name: "Müraciətə keç" }).click();
  await expect(page.getByRole("dialog", { name: /Məhsul dövrü krediti|Kredit/ })).toBeVisible();
});

test("giriş olmadan səbət işləyir, sifariş hesab istəyir", async ({ page }) => {
  await bazarServeri({ girisVar: false }).qur(page);
  await page.goto("/bazar/mehsul/karbamid-46-50kq");
  await page.getByRole("button", { name: "Səbətə əlavə et" }).click();
  await page.goto("/bazar/sifaris");
  await expect(page.getByText("Sifariş üçün hesab lazımdır")).toBeVisible();
  await page.getByRole("button", { name: "Hesaba daxil ol" }).click();
  await expect(page.getByRole("dialog", { name: "Hesab" })).toBeVisible();
});

test("toxunma hədəfləri və üfüqi sürüşmə — kateqoriya, məhsul, səbət", async ({ page }) => {
  await bazarServeri().qur(page);
  for (const yol of ["/bazar", "/bazar/kateqoriya/suvarma", "/bazar/mehsul/nasos-1-5kvt", "/bazar/tovsiye"]) {
    await page.goto(yol);
    await page.waitForTimeout(400);
    expect(await ufuqiDasir(page), yol).toBe(false);
    // Yalnız bazarın öz məzmunu (main): tətbiq başlığı və alt naviqasiya
    // ortaq komponentlərdir və bu tapşırığın hüdudundan kənardır
    const kicikler = await page.evaluate(() => {
      const pis = [];
      for (const d of document.querySelectorAll("main button")) {
        const r = d.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (r.height < 40 || r.width < 40) pis.push(`${d.getAttribute("aria-label") ?? d.textContent.trim().slice(0, 30)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
      return pis;
    });
    expect(kicikler, yol).toEqual([]);
  }
});

test("mövcud axınlar toxunulmayıb: Ana səhifə, Sahələr, Maliyyə, Kömək açılır", async ({ page }) => {
  await bazarServeri().qur(page);
  await page.goto("/");
  await expect(page.getByText(/Sabahınız xeyir/)).toBeVisible();
  await page.getByRole("navigation").getByRole("button", { name: "Sahələr" }).click();
  await expect(page).toHaveURL(/\/fields$/);
  await page.getByRole("navigation").getByRole("button", { name: "Maliyyə" }).click();
  await expect(page.getByText("Maliyyələşmə")).toBeVisible();
  await page.getByRole("navigation").getByRole("button", { name: "Kömək" }).click();
  await expect(page.getByText("Aqronom köməkçisi")).toBeVisible();
});
