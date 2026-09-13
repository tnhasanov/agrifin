# Məhsul fotoşəkilləri — mənbə və lisenziya

Bu qovluq bazar məhsullarının fotolarını saxlayır. Ad konvensiyası:
məhsulun **kataloq kodu** (`lib/bazar/kataloq.js` → `MEHSULLAR[].kod`):

```
src/assets/bazar/karbamid-46-50kq.webp
```

Fayl qovluğa düşən kimi avtomatik tapılır (`features/bazar/MehsulSekli.jsx`
`import.meta.glob` işlədir) — heç bir siyahıya əl ilə əlavə etmək lazım deyil.

## Foto olmayanda nə görünür

1. Toxum və ting məhsulları mövcud BİTKİ fotosunu göstərir
   (`src/assets/bitki/`, `sekil: {nov: "bitki"}`).
2. Qalan məhsullar neytral yer tutucu alır: kateqoriya tonu + ikon.
   Yanlış foto qoymaqdansa boş qalmaq düzgündür — fermer karbamidin
   yerində başqa kisə görsə məhsula inanmır.

## Tələblər

| | |
|---|---|
| Master | kvadrat 1024×1024, məhsul 80% təhlükəsiz sahədə mərkəzdə |
| Çatdırılma | WebP (AVIF istəyə görə), 84 CSS px kart / 320 px detal → 640 px mənbə |
| Fon | isti neytral, hamısında eyni işıq və ağ balansı |
| Kompozisiya | yalnız məhsul (qablaşma ilə olar); əl, mətn üst-üstə, loqo YOX |
| Ölçü büdcəsi | görünən ilk on şəklin cəmi ≤ 400 KB |
| Qadağan | stok saytından götürülmüş lisenziyasız foto, karikatura, emoji |

## Lisenziya qeydiyyatı

Şəkillər əlavə olunanda hər sətri doldurun. Mənbəsi və lisenziyası yazılmayan
şəkil məhsula girmir. Faza 2-də fotolar tədarükçü onboarding-i ilə gələcək —
tədarükçü öz məhsulunun fotosunu yükləyir və lisenziyasına özü cavabdehdir.

| Fayl | Mənbə | Lisenziya | Müəllif | Tarix |
|---|---|---|---|---|
| — | — | — | — | — |
