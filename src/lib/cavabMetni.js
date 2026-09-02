/**
 * AQRONOM CAVABININ FORMATI — markdown-ın ÇOX KİÇİK alt çoxluğu.
 *
 * Cavab telefonda, 12–13 piksel mətnlə oxunur: bir abzas divarı fermeri
 * itirir. Ona görə model iki şey işlədir (bax: api/agronom.js FORMAT bölməsi):
 *   **vurğu**  → ən vacib 1–3 ifadə (problemin adı, vaxt, görüləcək iş);
 *   "- " sətri → addım maddəsi.
 *
 * TAM MARKDOWN QƏSDƏN YOXDUR. Başlıq, cədvəl, link, kod bloku parse
 * olunmur — çünki onları göstərməyəcəyiksə, işarələrini gizlətmək fermerə
 * yalan quruluş vəd etməkdir. Model də həmin işarələri işlətməməyə
 * göstəriş alır; gəlsə, olduğu kimi mətn olaraq görünür (təhlükəsiz).
 *
 * HTML EMAL OLUNMUR: parçalar React mətn düyünü kimi qayıdır, ona görə
 * modelin (və ya şəkil altyazısının) içindəki `<script>` yalnız mətndir.
 */

// "- ", "• ", "1) ", "2. " — maddə nişanları. Ulduz (*) QƏSDƏN yoxdur:
// "**Sarı pas**" ilə başlayan sətir maddə deyil, vurğulu abzasdır.
const MADDE = /^(?:[-•]\s+|(\d+)[).]\s+)/;

/**
 * Cavabı sətir-sətir bloklara ayırır. Boş sətirlər atılır — aralıqları
 * CSS verir, ona görə modelin bir və ya iki boş sətir qoyması görünüşü
 * dəyişmir.
 *
 * @returns {Array<{nov:"abzas"|"madde", metn:string, nisan?:string}>}
 */
export function bloklaraBol(metn) {
  return String(metn ?? "")
    .split("\n")
    .map((setir) => setir.trim())
    .filter(Boolean)
    .map((setir) => {
      const uygunluq = setir.match(MADDE);
      if (!uygunluq) return { nov: "abzas", metn: setir };
      return {
        nov: "madde",
        // Nömrəli addım öz nömrəsini saxlayır: "1) suvarmanı saxlayın"
        // sırasını itirsə, məsləhət də mənasını itirir
        nisan: uygunluq[1] ?? "•",
        metn: setir.slice(uygunluq[0].length),
      };
    });
}

/**
 * Sətri `**...**` cütlərinə görə adi və vurğulu parçalara bölür.
 *
 * AXIN HALI: cavab hərf-hərf gəlir, ona görə sonuncu ulduz cütü hələ
 * bağlanmamış ola bilər ("**Sarı p"). Tək qalan parça VURĞULU sayılır —
 * əks halda fermer yazı gələnə qədər ekranda çılpaq ulduzları görərdi.
 *
 * @returns {Array<{metn:string, vurgu:boolean}>}
 */
export function vurguParcalari(setir) {
  return String(setir ?? "")
    .split("**")
    .map((metn, sira) => ({ metn, vurgu: sira % 2 === 1 }))
    .filter((parca) => parca.metn !== "");
}
