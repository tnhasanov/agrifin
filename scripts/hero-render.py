#!/usr/bin/env python3
"""İlk açılış ekranının fon şəklini qurur (src/assets/hero/).

NİYƏ SKRİPT: repozitoriyada lisenziyası sənədləşdirilmiş aerofoto yoxdur və
lisenziyasız şəkil məhsula qoyula bilməz. Bu render ONUN YERİNİ TUTUR —
kompozisiya maketdəki kimidir (alçaq üfüq, terraslanmış yamaclar, isti səhər
işığı, aşağıya doğru fona qarışma), amma heç nə foto kimi təqdim olunmur.

FOTO GƏLƏNDƏ: `src/assets/hero/sahe.webp` faylını əvəz etmək kifayətdir —
komponent (XosGelmisiniz.jsx) yalnız yuvanı verir, bu skript yenidən
işlədilmir.

İşlətmək:  python3 scripts/hero-render.py
Tələb:     pip install pillow
"""

import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

EN, HUND = 1170, 1500  # 3× → 390 × 500 CSS px
CIXIS = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "hero")

random.seed(20260902)  # Render təkrarlana bilən olsun


def qarisiq(a, b, t):
    """İki rəng arasında xətti keçid"""
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def sema(en, hund):
    """Səhər səması: yuxarıda soyuq, üfüqdə isti işıq"""
    im = Image.new("RGB", (en, hund))
    ust = (206, 219, 210)
    alt = (240, 238, 224)
    ciz = ImageDraw.Draw(im)
    for y in range(hund):
        ciz.line([(0, y), (en, y)], fill=qarisiq(ust, alt, (y / hund) ** 0.7))
    return im


def yamac(en, hund, taban, hundurluk, dalga, faz, reng, yumsaqliq):
    """Bir təpə qatı: üstü əyri, altı doludur. Maska ilə qaytarılır."""
    qat = Image.new("RGBA", (en, hund), (0, 0, 0, 0))
    ciz = ImageDraw.Draw(qat)
    noqteler = []
    for x in range(0, en + 8, 8):
        t = x / en
        y = taban - hundurluk * (
            0.55 * math.sin(t * dalga + faz)
            + 0.28 * math.sin(t * dalga * 2.3 + faz * 1.7)
            + 0.17 * math.sin(t * dalga * 4.1 + faz * 0.6)
        )
        noqteler.append((x, y))
    ciz.polygon(noqteler + [(en, hund), (0, hund)], fill=reng + (255,))
    if yumsaqliq:
        qat = qat.filter(ImageFilter.GaussianBlur(yumsaqliq))
    return qat


def konturYuksekliyi(en, taban, hundurluk, dalga, faz, x):
    t = x / en
    return taban - hundurluk * (
        0.55 * math.sin(t * dalga + faz)
        + 0.28 * math.sin(t * dalga * 2.3 + faz * 1.7)
        + 0.17 * math.sin(t * dalga * 4.1 + faz * 0.6)
    )


def parseller(qat, en, hund, taban, hundurluk, dalga, faz, say, tund, aciq):
    """Yamacın üzərində ƏKİN SAHƏLƏRİ — hər biri ayrıca ləkə.

    Bütün eni kəsən uzun xətlər topoqrafik xəritə kimi çıxırdı; real tarla
    isə kəsik-kəsikdir: hər parselin öz kənarı, öz tonu var.
    """
    ciz = ImageDraw.Draw(qat, "RGBA")
    for i in range(say):
        p = (i + 0.5) / say
        # Parsel yamacın üstündə təsadüfi yerdə, eni də təsadüfi
        sol = random.uniform(-0.15, 0.9) * en
        genislik = random.uniform(0.14, 0.42) * en
        derinlik = hundurluk * random.uniform(0.35, 1.05)
        ofset = p * hundurluk * 1.5
        reng = qarisiq(tund, aciq, random.random())
        alfa = random.randint(30, 78)

        ust, alt = [], []
        adim = 12
        x = sol
        while x <= sol + genislik:
            y = konturYuksekliyi(en, taban, hundurluk, dalga, faz, x) + ofset
            ust.append((x, y))
            alt.append((x, y + derinlik))
            x += adim
        if len(ust) < 2:
            continue
        ciz.polygon(ust + alt[::-1], fill=reng + (alfa,))


def dene(im, guc):
    """Fotoqrafik dənə: düz sahələr «rəqəmsal» görünməsin"""
    en, hund = im.size
    kicik = Image.new("L", (en // 3, hund // 3))
    kicik.putdata([random.randint(128 - guc, 128 + guc) for _ in range(kicik.size[0] * kicik.size[1])])
    kicik = kicik.resize((en, hund), Image.BILINEAR).filter(ImageFilter.GaussianBlur(0.6))
    return Image.blend(im, Image.merge("RGB", (kicik, kicik, kicik)), 0.055)


def isiq(im, mx, my, radius, guc):
    """Yumşaq günəş şəfəqi — sağ yuxarıdan"""
    en, hund = im.size
    maska = Image.new("L", (en, hund), 0)
    ciz = ImageDraw.Draw(maska)
    ciz.ellipse([mx - radius, my - radius, mx + radius, my + radius], fill=guc)
    maska = maska.filter(ImageFilter.GaussianBlur(radius * 0.55))
    ag = Image.new("RGB", (en, hund), (255, 250, 235))
    return Image.composite(Image.blend(im, ag, 0.42), im, maska)


def qur():
    im = sema(EN, HUND).convert("RGBA")

    # Uzaqdan yaxına: hər qat daha tünd, daha kəskin, daha doymuş.
    # Atmosfer perspektivi — uzaq təpələr səmaya qarışır.
    QATLAR = [
        # taban, hündürlük, dalğa, faz, rəng,           yumşaqlıq, terras
        (430, 95, 3.4, 0.4, (168, 188, 172), 7, None),
        (520, 110, 2.6, 2.1, (137, 168, 141), 4.5, None),
        (630, 125, 2.0, 4.3, (104, 145, 108), 2.5, (7, (84, 124, 88), (152, 180, 132))),
        (760, 140, 1.6, 1.2, (74, 122, 80), 1.5, (8, (56, 100, 62), (134, 166, 110))),
        (920, 155, 1.2, 5.0, (48, 98, 58), 0.8, (9, (34, 78, 44), (108, 146, 90))),
        (1130, 175, 0.9, 3.3, (30, 76, 44), 0, (10, (20, 58, 34), (88, 128, 76))),
    ]

    for taban, hundurluk, dalga, faz, reng, yumsaqliq, terras in QATLAR:
        qat = yamac(EN, HUND, taban, hundurluk, dalga, faz, reng, yumsaqliq)
        if terras:
            say, tund, aciq = terras
            parseller(qat, EN, HUND, taban, hundurluk, dalga, faz, say, tund, aciq)
        im = Image.alpha_composite(im, qat)

    im = im.convert("RGB")
    im = isiq(im, EN * 0.78, HUND * 0.16, EN * 0.62, 205)
    im = im.filter(ImageFilter.GaussianBlur(0.7))
    im = dene(im, 26)

    # ALTA DOĞRU FONA QARIŞIR: başlıq şəkil üstündə deyil, işıqda oturur —
    # tünd pərdənin üstündəki ağ mətndən daha yetkin görünür (maket belədir)
    ivory = (251, 250, 246)
    piksel = im.load()
    bas = int(HUND * 0.66)
    for y in range(bas, HUND):
        t = (y - bas) / (HUND - bas)
        t = t ** 1.6
        for x in range(EN):
            piksel[x, y] = qarisiq(piksel[x, y], ivory, t)

    os.makedirs(CIXIS, exist_ok=True)
    yol = os.path.join(CIXIS, "sahe.webp")
    im.save(yol, "WEBP", quality=82, method=6)
    print(f"hazır: {os.path.normpath(yol)}  ({os.path.getsize(yol) // 1024} KB, {EN}×{HUND})")


if __name__ == "__main__":
    qur()
