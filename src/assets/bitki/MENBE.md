# Bitki fotoşəkilləri — mənbə və lisenziya

Bu qovluq onboarding-dəki bitki kartlarının şəkillərini saxlayır.
**Hazırda boşdur** və bu, qəsdəndir: sənədləşdirilmiş lisenziyası olan
məhsul fotoşəkilləri hələ təhvil verilməyib. Şəkil olmayanda kart neytral
yuvaya düşür (bitkinin ikonu) — yanlış və ya lisenziyasız şəkil qoymaqdansa
boş qalmaq düzgündür.

## Ad konvensiyası

Hər bitki üçün iki fayl, adı bitkinin **kanonik kodudur**
(`src/services/crops.js` → `CROP_KEYS`):

| kod | ad |
|---|---|
| `bugda` | Payızlıq buğda |
| `arpa` | Arpa |
| `qargidali` | Qarğıdalı |
| `pambiq` | Pambıq |
| `kartof` | Kartof |
| `pomidor` | Pomidor |
| `sogan` | Soğan |
| `uzum` | Üzüm |
| `alma` | Alma |
| `findiq` | Fındıq |

```
src/assets/bitki/pomidor.avif   ← əsas format
src/assets/bitki/pomidor.webp   ← ehtiyat format
```

Fayl qovluğa düşən kimi avtomatik tapılır (`src/services/bitkiSekilleri.js`
`import.meta.glob` işlədir) — heç bir siyahıya əl ilə əlavə etmək lazım deyil.
Yalnız bir format olsa da işləyir.

## Tələblər

| | |
|---|---|
| Master | kvadrat 1024×1024, məhsul 80% təhlükəsiz sahədə mərkəzdə |
| Çatdırılma | AVIF əsas + WebP ehtiyat |
| Göstərilən ölçü | 52 CSS px (2x/3x üçün 104 px və 156 px mənbə) |
| İşıq | yumşaq təbii gün işığı; bütün bitkilərdə eyni kontrast və ağ balansı |
| Fon | isti neytral və ya təbii sahə konteksti — hamısında eyni |
| Kompozisiya | yalnız bir tanınan məhsul; əl, qablaşdırma, mətn, loqo YOX |
| Ölçü büdcəsi | görünən ilk altı şəklin cəmi ≤ 250 KB |
| Qadağan | emoji, rəngli nöqtə, qarışıq ikon üslubu, karikatura, uzaq URL |

## Lisenziya qeydiyyatı

Şəkillər əlavə olunanda hər sətri doldurun. Mənbəsi və lisenziyası yazılmayan
şəkil məhsula girmir.

| Fayl | Mənbə | Lisenziya | Müəllif | Tarix |
|---|---|---|---|---|
| _(hələ yoxdur)_ | | | | |

Master fayllar (1024×1024) bu paketin İÇİNDƏ saxlanılmır — onlar dizayn
arxivində qalır, buraya yalnız optimallaşdırılmış nəticə düşür.
