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
| Master | mənbənin orijinal ölçüsü; məhsul və etiket dəyişdirilmir |
| Çatdırılma | 640×640 WebP, 84 CSS px kart / 320 px detal |
| Fon | isti neytral, hamısında eyni işıq və ağ balansı |
| Kompozisiya | yalnız məhsul (qablaşma ilə olar); əl, mətn üst-üstə, loqo YOX |
| Ölçü büdcəsi | görünən ilk on şəklin cəmi ≤ 400 KB |
| Qadağan | stok saytından götürülmüş lisenziyasız foto, karikatura, emoji |

## Lisenziya qeydiyyatı

Şəkillər əlavə olunanda hər sətri doldurun. Mənbəsi və lisenziyası yazılmayan
şəkil məhsula girmir. `İcazə gözlənilir` statuslu şəkil yalnız prototip və
məhdud preview qiymətləndirilməsi üçündür; production deploy-dan əvvəl yazılı
icazə alınmalı və ya şəkil çıxarılmalıdır. Faza 2-də fotolar tədarükçü onboarding-i
ilə gələcək — tədarükçü öz məhsulunun fotosunu yükləyir və istifadə hüququnu
təsdiqləyir.

| Fayl | Mənbə | Lisenziya | Müəllif | Tarix |
|---|---|---|---|---|
| `karbamid-46-50kq.webp` | [gubre.az məhsul fotosu](https://gubre.az/public/uploads/6d1047c1-2cdb-11f1-bb2d-005056b944c8.jpg) | İcazə gözlənilir — preview prototipi | gubre.az / məhsul hüquq sahibi | 2026-09-14 |
| `superfosfat-50kq.webp` | [FermerMarket elan fotosu](https://www.fermermarket.az/media/50b67662-0a16-4f92-bcc5-961c2e72aaf9.jpg) | İcazə gözlənilir — preview prototipi | FermerMarket elan hüquq sahibi | 2026-09-14 |
| `ammofos-12-52-50kq.webp` | [FermerMarket elan fotosu](https://www.fermermarket.az/media/53330d46-5ba8-40cb-98b6-548832e72ea0.jpg) | İcazə gözlənilir — preview prototipi | FermerMarket elan hüquq sahibi | 2026-09-14 |
| `sulfoammofos-20-20-14-50kq.webp` | [FermerMarket elan fotosu](https://www.fermermarket.az/media/1e63fd7f-d89d-4fe5-939c-01aa73c0b4cf.jpg) | İcazə gözlənilir — preview prototipi | FermerMarket elan hüquq sahibi | 2026-09-14 |
| `npk-15-15-15-50kq.webp` | [FermerMarket elan fotosu](https://www.fermermarket.az/media/b2ca2cd4-2022-4fdc-a50d-61c065e4054e.jpg) | İcazə gözlənilir — preview prototipi | FermerMarket elan hüquq sahibi | 2026-09-14 |

## Emal

`scripts/format_market_images.py` mənbələri 640×640 isti neytral karta salır.
Proses məhsulun üzərindəki yazını, brendi və qablaşdırmanı generativ üsulla
dəyişmir.
