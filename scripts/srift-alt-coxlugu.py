#!/usr/bin/env python3
"""PDF hesabatı üçün şrift alt çoxluğunu yaradır (src/features/hesabat/sriftler.js).

NİYƏ LAZIMDIR: PDF-in daxili Helvetica-sı "ə, ş, ğ, ı" hərflərini tanımır və
qara qutu çəkir. Tam DejaVu isə 700 KB-dır — hesabat düyməsi üçün çox. Ona görə
yalnız tətbiqin üç dilinin (az/en/ru) hərfləri saxlanılır: nəticə hər üz üçün
~28 KB, base64-də ~38 KB.

MANAT (₼, U+20BC) DejaVu-da YOXDUR — məbləğ valyutasız çıxırdı. İşarə
FreeSans-dan köçürülür və DejaVu-nun em ölçüsünə (2048) miqyaslanır.

İşlətmək:  python3 scripts/srift-alt-coxlugu.py
Tələb:     pip install fonttools  ·  DejaVu və FreeFont paketləri
"""

import base64
import io
import os

from fontTools.misc.transform import Scale
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

DEJAVU = "/usr/share/fonts/truetype/dejavu"
FREE = "/usr/share/fonts/truetype/freefont"
CIXIS = os.path.join(
    os.path.dirname(__file__), "..", "src", "features", "hesabat", "sriftler.js"
)

MANAT = 0x20BC
MANAT_ADI = "manatsign"

I18N = os.path.join(os.path.dirname(__file__), "..", "src", "i18n")
DILLER = ["az.js", "en.js", "ru.js"]

# Baza dəst: rəqəm, latın, Azərbaycan və rus hərfləri, durğu və ölçü işarələri.
BAZA = (
    "".join(chr(c) for c in range(0x20, 0x7F))
    # Latın-1: fermerin adı və rayon adı sənədə olduğu kimi düşür, ona görə
    # gündəlik diakritiklər (é, ü, ñ…) də saxlanılır
    + "".join(chr(c) for c in range(0xA0, 0x100))
    + "əƏıİöÖüÜçÇşŞğĞ"
    + "".join(chr(c) for c in range(0x410, 0x450))
    + "Ёё"
    + "–—―‐·•…«»“”„‘’′″×÷≈≤≥≠±°%‰↑↓→←№"
    + "   "  # qırılmayan və nazik boşluqlar — məbləğlərdə var
    + "₼"
)


def i18n_herfleri() -> str:
    """Tərcümə lüğətlərində işlənən bütün hərflər.

    NİYƏ: alt çoxluqda OLMAYAN hərf PDF-də sətri KƏSİR — "8 mövsüm ölçülüb ·
    Sentinel-2 arxivi" sətri qırılmayan boşluq düşdüyü üçün yarımçıq çıxmışdı.
    Ona görə dəst əl ilə sadalanmır, lüğətlərin özündən yığılır.
    """
    herfler = set()
    for ad in DILLER:
        yol = os.path.join(I18N, ad)
        with open(yol, encoding="utf-8") as f:
            xam = f.read()
        # Mənbədəki " " kimi qaçışlar da real hərfə çevrilir
        herfler.update(xam.encode("utf-8").decode("unicode_escape", errors="ignore"))
        herfler.update(xam)
    return "".join(sorted(h for h in herfler if h.isprintable() or h.isspace()))


HERFLER = BAZA + i18n_herfleri()


def herf_hund(font: TTFont, kod: int) -> float:
    """Hərfin konturunun hündürlüyü (şriftin öz vahidlərində)."""
    glif = font["glyf"][font.getBestCmap()[kod]]
    glif.recalcBounds(font["glyf"])
    return glif.yMax - max(glif.yMin, 0)


def manat_elave(hedef: TTFont, menbe_yolu: str) -> None:
    """FreeSans-dakı ₼ konturunu hədəf şriftə köçürür.

    Miqyas EM-ə görə deyil, RƏQƏMİN HÜNDÜRLÜYÜNƏ görə seçilir: FreeSans-da ₼
    öz rəqəmlərindən alçaqdır, birbaşa köçürüləndə DejaVu rəqəmlərinin yanında
    yarımçıq görünürdü ("65.000 ₼" məbləğində işarə kiçik qalırdı).
    """
    menbe = TTFont(menbe_yolu)
    olcek = herf_hund(hedef, 0x30) / herf_hund(menbe, MANAT)
    mAd = menbe.getBestCmap()[MANAT]

    pen = TTGlyphPen(hedef["glyf"].glyphs)
    menbe["glyf"][mAd].draw(TransformPen(pen, Scale(olcek, olcek)), menbe["glyf"])

    hedef["glyf"].glyphs[MANAT_ADI] = pen.glyph()
    hedef.glyphOrder = hedef.getGlyphOrder() + [MANAT_ADI]
    hedef["glyf"].glyphOrder = hedef.glyphOrder
    en, sol = menbe["hmtx"].metrics[mAd]
    hedef["hmtx"].metrics[MANAT_ADI] = (round(en * olcek), round(sol * olcek))
    hedef["maxp"].numGlyphs = len(hedef.glyphOrder)
    for cedvel in hedef["cmap"].tables:
        if cedvel.isUnicode():
            cedvel.cmap[MANAT] = MANAT_ADI


def alt_coxluq(dejavu_yolu: str, freesans_yolu: str) -> str:
    font = TTFont(dejavu_yolu)
    manat_elave(font, freesans_yolu)

    secim = Options()
    # Sənəd sabit mətndir: nə düzəliş cədvəlinə, nə də şaquli yazıya ehtiyac var
    secim.layout_features = []
    secim.drop_tables += ["BASE", "GSUB", "GPOS", "kern"]
    secim.name_IDs = [1, 2, 6]
    secim.notdef_outline = True
    alt = Subsetter(options=secim)
    alt.populate(text=HERFLER)
    alt.subset(font)

    buf = io.BytesIO()
    font.save(buf)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def main() -> None:
    normal = alt_coxluq(f"{DEJAVU}/DejaVuSans.ttf", f"{FREE}/FreeSans.ttf")
    qalin = alt_coxluq(f"{DEJAVU}/DejaVuSans-Bold.ttf", f"{FREE}/FreeSansBold.ttf")

    metn = f"""// AVTOMATİK YARADILIB — əl ilə redaktə etməyin.
// Mənbə: DejaVuSans / DejaVuSans-Bold (Bitstream Vera + Arev lisenziyası —
// yerləşdirmək və yaymaq sərbəstdir). Manat işarəsi (₼) FreeSans-dan
// köçürülüb (GNU FreeFont, GPL + şrift istisnası). Alt çoxluq: latın,
// Azərbaycan hərfləri (ə, ş, ç, ğ, ı, ö, ü, İ), kiril, ₼, ox və tire.
// Yenidən yaratmaq: python3 scripts/srift-alt-coxlugu.py
//
// NİYƏ LAZIMDIR: PDF-in daxili şriftləri (Helvetica) Azərbaycan hərflərini
// tanımır — "ə" və "ş" qara qutu kimi çıxır. Şrift YALNIZ hesabat düyməsinə
// basılanda yüklənir (dinamik idxal), ona görə tətbiqin ilk açılışına
// təsiri yoxdur.

export const SRIFT_ADI = "AgriFinAz";

export const SRIFT_NORMAL = "{normal}";

export const SRIFT_QALIN = "{qalin}";
"""
    with open(CIXIS, "w", encoding="utf-8") as f:
        f.write(metn)
    print(f"hazır: {os.path.normpath(CIXIS)}")
    print(f"  normal {len(normal) // 1024} KB · qalın {len(qalin) // 1024} KB (base64)")


if __name__ == "__main__":
    main()
