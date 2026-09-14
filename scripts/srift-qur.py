#!/usr/bin/env python3
"""ŞRİFTLƏRİ QUR — src/assets/fonts/*.woff2 (təkrar istehsal oluna bilən).

═══ NİYƏ ÖZÜMÜZDƏ SAXLAYIRIQ ═════════════════════════════════════════════
Əvvəl başlıq üçün Sora, mətn üçün Inter Google Fonts-dan gəlirdi. Üç
problem vardı, üçü də ölçülüb:

1. SORA AZƏRBAYCAN DİLİNİ DƏSTƏKLƏMİR. Google-un verdiyi hər iki Sora
   faylının cmap cədvəlində U+018F (Ə) və U+0259 (ə) YOXDUR. `ə` isə dilin
   ən çox işlənən hərfidir, yəni HƏR başlıqda həmin hərf cihazın öz
   şriftinə düşürdü: başqa forma, başqa qalınlıq. Bu, zəif şəbəkədə
   görünən keçici hal deyildi, hər cihazda daimi idi.
   Sora ilə yanaşı Outfit, Figtree, Urbanist, Manrope və Rubik də eyni
   səbəbdən yararsızdır — hamısı yoxlanıb.

2. AZƏRBAYCAN HƏRFLƏRİ İKİ FAYLA BÖLÜNÜRDÜ. Google-un bölgüsündə
   `ş ğ İ` latin-ext faylında, `ç ö ü ı` isə latin faylındadır. Yəni hər
   qalınlıq üçün iki sorğu; biri gəlib o biri gecikəndə söz İÇİNDƏ şrift
   dəyişirdi.

3. ÜÇÜNCÜ TƏRƏF VƏ RENDER BLOKU. index.html-dəki `<link rel=stylesheet>`
   ilk boyanmanı bloklayır, üstəlik iki əlavə origin üçün DNS və TLS
   tələb edir. Pilot rayonlarının şəbəkəsində bu ucuz deyil. Bir də
   fermerin IP-si Google-a gedirdi.

═══ NƏ SEÇİLDİ ═══════════════════════════════════════════════════════════
  • Başlıq: Plus Jakarta Sans — AZ əlifbası TAM, ₼ (U+20BC) VAR.
  • Mətn:   Inter — AZ TAM, ₼ VAR, üstəlik kiril də var.

KİRİL QƏSDƏN INTER-DƏDİR: Plus Jakarta Sans-da yalnız cyrillic-ext var,
əsas kiril bloku (U+0400-045F) YOXDUR. Ona görə başlıq şriftinin
@font-face-i `unicode-range` ilə latın+AZ ilə məhdudlaşdırılır və rus
interfeysində başlıqlar özümüzün göndərdiyimiz Inter-ə düşür. Bu,
NƏZARƏTLİ ehtiyatdır: cihazın təsadüfi şriftinə yox, paketdəki şriftə.

MANAT ŞRİFTİ SİLİNDİ (əvvəl src/assets/fonts/manat.woff2). O, iki səbəbə
görə vardı: Sora-da ₼ yox idi, Inter-də isə gec gələn latin-ext
faylında idi. Hər iki səbəb aradan qalxdı — Plus Jakarta Sans-ın öz ₼
işarəsi var və subset bölünmür. Onu saxlamaq indi ZƏRƏRLİ olardı: yığının
başında durduğu üçün yeni şriftin öz işarəsini FreeSans-dan gələn uyğunsuz
konturla əvəz edərdi.

═══ NECƏ İŞLƏYİR ═════════════════════════════════════════════════════════
Mənbə dəyişən (variable) şriftlərdir: bir fayl bütün qalınlıqları verir,
yəni 400/600/700/800 üçün ayrı-ayrı fayl lazım deyil. İki addım:
  1) qalınlıq oxu 400-800-ə daraldılır (tətbiqdə ondan kənarı işlənmir);
  2) yalnız lazım olan Unicode aralıqları saxlanılır.

İşlətmək:  python3 scripts/srift-qur.py
Tələb:     pip install fonttools brotli
"""

import subprocess
import sys
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent
HEDEF = KOK / "src" / "assets" / "fonts"
MUVEQQETI = KOK / ".srift-temp"

# Mənbə: Google Fonts-un rəsmi deposu (OFL lisenziyası — self-host icazəlidir)
MENBELER = {
    "plusjakartasans": "https://raw.githubusercontent.com/google/fonts/main/ofl/plusjakartasans/PlusJakartaSans%5Bwght%5D.ttf",
    "inter": "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf",
}

# Latın + Azərbaycan. U+0100-017F Latin Extended-A bütöv götürülür: Ğğ, İı,
# Şş oradadır və aralığı hissə-hissə yazmaq sonradan səhv salmağa aparır.
# U+018F/U+0259 (Ə/ə) ayrıca göstərilir — onlar bu blokdan KƏNARDADIR.
LATIN_AZ = ",".join([
    "U+0000-00FF",   # ASCII + Latin-1 (ç ö ü Ç Ö Ü burdadır)
    "U+0100-017F",   # Latin Extended-A (ğ İ ı ş)
    "U+018F", "U+0259",  # Ə ə — dilin ən vacib hərfi
    "U+02BB-02BC",
    "U+2000-206F",   # boşluqlar, tirelər, dırnaqlar, …
    "U+20A0-20BF",   # valyutalar: ₼ (U+20BC) və €
    "U+2116",        # №
    "U+2212",        # mənfi
    "U+2191", "U+2193", "U+25B2", "U+25BC",  # göstəricilərdəki oxlar
])

KIRIL = "U+0400-045F,U+0490-0491,U+2116"

CIXIS = [
    ("plusjakartasans", "plusjakartasans-latinaz.woff2", LATIN_AZ),
    ("inter", "inter-latinaz.woff2", LATIN_AZ),
    ("inter", "inter-kiril.woff2", KIRIL),
]

# Tətbiqdə işlənən ən yüngül və ən qalın üslub. Diapazonu daraltmaq faylı
# nəzərəçarpacaq kiçildir, çünki interpolyasiya məlumatı da kəsilir.
QALINLIQ = "wght=400:800"


def qos(emr):
    netice = subprocess.run(emr, capture_output=True, text=True)
    if netice.returncode != 0:
        sys.exit(f"Uğursuz: {' '.join(emr)}\n{netice.stderr}")


# Plus Jakarta Sans-ın boşluğu em-in 17%-idir (Inter-də 27,8%). Latın dilləri
# üçün bu normaldır, amma bizim başlıqlar QALIN, KİÇİK və AZƏRBAYCANCA uzun
# sözlərdən ibarətdir: "Tövsiyə olunan məhsullar" 14 px-də bitişik oxunurdu.
# Ona görə YALNIZ boşluq glifinin eni genişləndirilir — hərflərin özünə
# toxunulmur, yəni şriftin xarakteri dəyişmir.
BOSLUQ_ENI = 0.225  # em payı


def bosluqu_genislendir(yol):
    from fontTools.ttLib import TTFont

    f = TTFont(yol)
    upm = f["head"].unitsPerEm
    cmap = {}
    for cedvel in f["cmap"].tables:
        cmap.update(cedvel.cmap)
    glif = cmap.get(0x20)
    if not glif:
        return
    kohne, lsb = f["hmtx"][glif]
    yeni = round(upm * BOSLUQ_ENI)
    if yeni <= kohne:
        return
    f["hmtx"][glif] = (yeni, lsb)
    # HVAR-a TOXUNULMUR: oradan glif silmək cədvəli sındırır (mapping hər
    # glif üçün tam olmalıdır). Boşluğun qalınlığa görə deltası onsuz da
    # sıfıra yaxındır — nəticə brauzerdə ölçülüb yoxlanılır (e2e/srift.spec.js).
    f.save(yol)
    print(f"  boşluq eni {kohne} → {yeni} ({BOSLUQ_ENI:.0%} em)")


def main():
    MUVEQQETI.mkdir(exist_ok=True)
    HEDEF.mkdir(parents=True, exist_ok=True)

    hazir = {}
    for ad, unvan in MENBELER.items():
        xam = MUVEQQETI / f"{ad}-xam.ttf"
        dar = MUVEQQETI / f"{ad}-dar.ttf"
        print(f"↓ {ad}")
        qos(["curl", "-sSL", "--max-time", "60", unvan, "-o", str(xam)])
        # Inter-in `opsz` oxu da var; onu 16-da sabitləyirik, yoxsa fayl
        # iki dəfə böyüyür və bizə optik ölçü variasiyası lazım deyil.
        oxlar = [QALINLIQ] + (["opsz=16"] if ad == "inter" else [])
        qos([sys.executable, "-m", "fontTools.varLib.instancer", str(xam), *oxlar, "-o", str(dar)])
        # Yalnız BAŞLIQ şriftində: mətn şriftinin boşluğu onsuz da genişdir
        if ad == "plusjakartasans":
            bosluqu_genislendir(dar)
        hazir[ad] = dar

    print()
    for ad, fayl, aralik in CIXIS:
        yol = HEDEF / fayl
        qos(["pyftsubset", str(hazir[ad]), f"--output-file={yol}",
             "--flavor=woff2", f"--unicodes={aralik}"])
        print(f"✓ {fayl}  {yol.stat().st_size / 1024:.1f} KB")

    for f in MUVEQQETI.iterdir():
        f.unlink()
    MUVEQQETI.rmdir()
    print("\nBitdi. @font-face elanları: src/index.css")


if __name__ == "__main__":
    main()
