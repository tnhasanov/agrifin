#!/usr/bin/env python3
"""MANAT ŞRİFTİ — tək hərfli ehtiyat şrift (src/assets/fonts/manat.woff2).

═══ NİYƏ LAZIMDIR ════════════════════════════════════════════════════════
Məbləğlərdəki ₼ (U+20BC) hərfi tətbiqin şriftlərində ya YOXDUR, ya da
gec gəlir:

  • Sora (başlıq şrifti) — ₼ ÜMUMİYYƏTLƏ YOXDUR. Ən iri rəqəm
    (LoanSheet-dəki qalıq borc) Sora ilə yazılır, ona görə işarə hər
    zaman cihazın öz ehtiyat şriftinə düşürdü: başqa qalınlıq, başqa
    hündürlük — rəqəmin yanında tibbi işarə kimi görünürdü.
  • Inter (mətn şrifti) — ₼ VAR, amma `latin-ext` alt çoxluğundadır və
    o, AYRICA fayldır. Zəif şəbəkədə (pilot rayonları) həmin fayl gec
    gəlir və işarə o vaxta qədər ehtiyat şriftlə çəkilir.

Həll: yalnız ₼ saxlayan ~1 KB-lıq şrift paketlə birlikdə gedir və
`unicode-range: U+20BC` ilə şrift yığınının BAŞINA qoyulur. Beləliklə
işarə hər cihazda eyni çəkilir və heç bir əlavə sorğu getmir.

═══ NECƏ QURULUR ═════════════════════════════════════════════════════════
Kontur FreeSans-dan götürülür (GNU FreeFont, GPL + şrift istisnası) və
Inter-in rəqəm hündürlüyünə miqyaslanır — FreeSans-da ₼ öz rəqəmlərindən
alçaqdır, birbaşa köçürüləndə yarımçıq görünür. Şaquli ölçülər də
Inter-in nisbətləri ilə verilir ki, sətir hündürlüyü dəyişməsin.

İşlətmək:  python3 scripts/manat-srifti.py
Tələb:     pip install fonttools brotli
"""

import os

from fontTools.fontBuilder import FontBuilder
from fontTools.misc.transform import Scale
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

MENBE = "/usr/share/fonts/truetype/freefont/FreeSans.ttf"
CIXIS = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "fonts")

MANAT = 0x20BC
UPEM = 1000

# Inter-in nisbətləri (upem 2048): rəqəm hündürlüyü ≈ cap height 1490,
# typo ascender 1984, descender −494. Sətir qutusu dəyişməsin deyə
# ehtiyat şrift eyni nisbətləri daşıyır.
INTER_UPEM = 2048
INTER_REQEM = 1490
INTER_ASCENT = 1984
INTER_DESCENT = -494


def qur():
    menbe = TTFont(MENBE)
    mAd = menbe.getBestCmap()[MANAT]
    glif = menbe["glyf"][mAd]
    glif.recalcBounds(menbe["glyf"])
    hund = glif.yMax - max(glif.yMin, 0)

    # Hədəf: ₼ rəqəmlə eyni hündürlükdə olsun
    hedefHund = INTER_REQEM / INTER_UPEM * UPEM
    olcek = hedefHund / hund

    pen = TTGlyphPen(None)
    glif.draw(TransformPen(pen, Scale(olcek, olcek)), menbe["glyf"])
    manatGlifi = pen.glyph()

    bosPen = TTGlyphPen(None)
    bosGlif = bosPen.glyph()

    en = round(menbe["hmtx"].metrics[mAd][0] * olcek)
    sol = round(menbe["hmtx"].metrics[mAd][1] * olcek)

    fb = FontBuilder(UPEM, isTTF=True)
    fb.setupGlyphOrder([".notdef", "manatsign"])
    fb.setupCharacterMap({MANAT: "manatsign"})
    fb.setupGlyf({".notdef": bosGlif, "manatsign": manatGlifi})
    fb.setupHorizontalMetrics({".notdef": (en, 0), "manatsign": (en, sol)})

    ascent = round(INTER_ASCENT / INTER_UPEM * UPEM)
    descent = round(INTER_DESCENT / INTER_UPEM * UPEM)
    fb.setupHorizontalHeader(ascent=ascent, descent=descent, lineGap=0)
    fb.setupNameTable(
        {
            "familyName": "AgriFinManat",
            "styleName": "Regular",
            "uniqueFontIdentifier": "AgriFinManat-Regular",
            "fullName": "AgriFinManat Regular",
            "psName": "AgriFinManat-Regular",
            "version": "1.0",
            # Mənbənin lisenziyası sənəddə qalır
            "licenseDescription": "Manat sign outline from GNU FreeFont (FreeSans), GPL with font exception.",
        }
    )
    fb.setupOS2(sTypoAscender=ascent, sTypoDescender=descent, sTypoLineGap=0,
                usWinAscent=ascent, usWinDescent=abs(descent))
    fb.setupPost()

    os.makedirs(CIXIS, exist_ok=True)
    yol = os.path.join(CIXIS, "manat.woff2")
    fb.font.flavor = "woff2"
    fb.save(yol)
    print(f"hazır: {os.path.normpath(yol)}  ({os.path.getsize(yol)} bayt)")


if __name__ == "__main__":
    qur()
