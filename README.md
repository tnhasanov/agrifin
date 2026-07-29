# AgriFin

Fermerlər üçün ağıllı maliyyə tətbiqi: peyk əsaslı tövsiyələr, məhsul dövrü kreditləri,
kart və pulqabı, bazar qiymətləri və karbon gəliri.

> **Demo prototipdir.** Maliyyə rəqəmləri, alıcılar və karbon kreditləri nümunədir.
> Yalnız hava proqnozu realdır (Open-Meteo).

---

## Başlamaq

```bash
npm install
npm run dev        # http://localhost:5173
```

| Əmr              | Nə edir                                              |
| ---------------- | ---------------------------------------------------- |
| `npm run dev`    | Dev server (HMR ilə)                                 |
| `npm run build`  | `dist/` qovluğuna istehsal build-i                   |
| `npm run preview`| Build-i lokal yoxlamaq                               |
| `npm test`       | Vitest — 52 test                                     |
| `npm run lint`   | ESLint                                               |
| `npm run icons`  | PWA ikonlarını yenidən yaradır (asılılıq tələb etmir)|

Node 22 tələb olunur (`.nvmrc`).

---

## Quruluş

```
src/
  main.jsx            provayderlər + servis işçisi
  App.jsx             qabıq: başlıq, naviqasiya, aktiv ekran
  routes.js           yolların vahid siyahısı
  screens/            beş ekran — yalnız göstərmə məntiqi
  features/           kredit paneli, hava zolağı
  components/         Icon, Card, Chip, Sparkline, FarmScoreGauge, ...
  state/store.jsx     reducer + localStorage-da saxlanma
  services/           məlumat mənbələri (hava realdır, qalanı nümunə)
  i18n/               az (əsas), en, ru + açar yoxlayan test
  lib/                format, storage, router, pwa
  theme/tokens.js     rənglər və şriftlər (CSS qarşılığı: index.css @theme)
```

Üç qayda bu quruluşu bir arada saxlayır:

1. **Ekranlar məlumat qurmur.** Bütün rəqəmlər və mətn açarları `services/`-dən gəlir.
   3-cü mərhələdə həmin modullar real API-ni çağıracaq, ekranlar dəyişməyəcək.
2. **Mətn kodda yazılmır.** Hər sətir tərcümə açarıdır. `services/` da mətn deyil,
   açar qaytarır — buna görə hava tövsiyəsi üç dildə düzgün işləyir.
3. **Vəziyyət bir yerdədir.** `state/store.jsx` — pulqabı, kreditlər, əməliyyatlar.
   Komponentlər `useStore()` ilə oxuyur.

### Yeni ekran əlavə etmək

`src/screens/` içində fayl yarat → `routes.js`-ə sətir əlavə et → `App.jsx`-dəki
`SCREENS` xəritəsinə yaz → hər üç lüğətə `nav.*` açarı əlavə et. Açarı unutsan
`npm test` deyəcək.

### Yeni dil əlavə etmək

`src/i18n/xx.js` yarat, `index.jsx`-də `DICTS` və `LANGUAGES`-ə əlavə et.
Test bütün açarların, boş olmayan mətnlərin və yer tutucuların (`{amount}`)
uyğunluğunu yoxlayır.

---

## Prototipdən sonra nə dəyişdi

**1-ci mərhələ — istehsal üçün baza**

- **Paket 900 kB → 212 kB (gzip 182 kB → 68 kB).** Səbəb `import * as L from "lucide-react"`
  idi: bütün kitabxana paketə düşürdü. `components/Icon.jsx` yalnız istifadə olunan
  ~30 ikonu açıq şəkildə gətirir. Kənd yerlərində mobil internet üçün bu ölçü məhsul
  tələbidir.
- **Tailwind CDN-dən çıxarıldı.** `<script src="cdn.tailwindcss.com">` yalnız
  təcrübə üçündür və hər açılışda şəbəkədən asılılıq yaradırdı; artıq build zamanı
  yığılır (Tailwind 4 + Vite plagini).
- **Şriftlər** JS içindəki `@import`-dan `index.html`-ə keçdi (`preconnect` ilə) —
  mətn daha tez görünür.
- **PWA:** manifest, ikonlar, servis işçisi. Tətbiq ekrana əlavə olunur və
  şəbəkə olmadan açılır — hava məlumatı keşdən göstərilir (`weather.cached`).
- **Vite 5 → 8**, `npm audit` təmizdir.
- iPhone-un aşağı göstərici zolağı üçün `env(safe-area-inset-bottom)`.

**2-ci mərhələ — arxitektura**

- 885 sətirlik `App.jsx` yuxarıdaki quruluşa bölündü.
- **Vəziyyət** reducer-ə keçdi və `localStorage`-da saxlanılır (versiyalı — forma
  dəyişəndə köhnə məlumat səssizcə atılır).
- **Yollar:** hər tabın öz URL-i var (`/carbon` linki paylaşıla bilər), brauzerin
  "geri" düyməsi işləyir. react-router əvəzinə 50 sətirlik `lib/router.jsx` —
  kitabxananın hər versiyasında açıq audit xəbərdarlığı var və onların hamısı
  SSR/RSC ilə bağlıdır, yəni bu tətbiqə aid deyil, amma daim qırmızı qalır.
- **Üç dil:** az (əsas), en, ru. Dil brauzerdən təyin olunur, başlıqdaki düymə ilə
  dəyişir, seçim saxlanılır. Rəqəmlər də dilə uyğun formatlanır (`7.280` / `7,280` / `7 280`).
- **Hava xidməti** keşlənir (30 dəqiqə), sorğu alınmasa köhnə proqnozu "oflayn"
  nişanı ilə göstərir. Tövsiyə məntiqi (`buildAdvisory`) ayrı, təmiz funksiyadır və
  test olunur.
- **Əlçatanlıq:** klik olunan kartlar həqiqi `<button>`-dur, ikon düymələrində
  `aria-label`, kredit paneli `role="dialog"` + Escape ilə bağlanır, naviqasiyada
  `aria-current`.
- **52 test:** reducer, format, hava məntiqi, tərcümə açarları, ikon siyahısının
  tamlığı və tətbiqin uçdan-uca axınları (kredit götürmə, karbon satışı, dil dəyişmə).

---

## 3-cü mərhələ — növbəti addımlar

Prioritet sırası ilə:

1. **Backend və autentifikasiya.** Hazırda bütün vəziyyət brauzerdədir.
   Real məhsul üçün: hesab, SMS/ASAN ilə giriş, server tərəfdə saxlanma.
   `services/` qovluğu bu keçid üçün hazırdır — ekranlara toxunmaq lazım deyil.
2. **Real peyk məlumatı.** NDVI və sahə sərhədləri indi sabit rəqəmdir.
   Sentinel-2 (Copernicus) ilə əvəz olunmalı; FarmScore həmin seriyadan hesablanmalı.
3. **KYC və maliyyə tənzimləməsi.** Kredit və kart məhsulu bank lisenziyası və ya
   partnyor bank tələb edir. Bu, texniki deyil, hüquqi işdir və ən uzun sürəndir.
4. **Şriftləri öz üzərimizdə saxlamaq.** Sora/Inter indi Google-dan gəlir —
   oflayn rejimdə brend şrifti itir və üçüncü tərəfə sorğu gedir.
5. **Bazar qiymətləri** üçün real mənbə (dövlət statistikası və ya birja).
6. **Karbon MRV.** Kredit satışı real registr (Verra/Gold Standard) tələb edir.
7. **Telemetriya və xəta izləmə** — hansı tövsiyələrin tamamlandığını ölçmək
   məhsulun dəyərini sübut etmək üçün lazımdır.

---

## Deploy

Vercel: repo qoşulduqda avtomatik build olunur (`npm run build` → `dist/`).
`vercel.json` SPA yollarını `index.html`-ə yönləndirir və statik faylları keşləyir.
Netlify və ya digər statik hostinq üçün eyni yönləndirmə qaydası lazımdır.
