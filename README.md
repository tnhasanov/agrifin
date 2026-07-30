# AgriFin

Fermerlər üçün ağıllı maliyyə tətbiqi: peyk əsaslı tövsiyələr, məhsul dövrü kreditləri,
kart və pulqabı, bazar qiymətləri və karbon gəliri.

> **Demo prototipdir.** Maliyyə rəqəmləri, alıcılar və karbon kreditləri nümunədir.
> Real olanlar: hava proqnozu (Open-Meteo) və aqronom köməkçisi (Claude API).

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
| `npm test`       | Vitest — 121 test                                    |
| `npm run lint`   | ESLint                                               |
| `npm run icons`  | PWA ikonlarını yenidən yaradır (asılılıq tələb etmir)|

Node 22 tələb olunur (`.nvmrc`).

---

## Quruluş

```
api/
  agronom.js          serverless funksiya — Claude API açarı yalnız burada
src/
  main.jsx            provayderlər + servis işçisi
  App.jsx             qabıq: başlıq, naviqasiya, aktiv ekran
  routes.js           yolların vahid siyahısı
  screens/            beş ekran — yalnız göstərmə məntiqi
  features/           kredit paneli, yer seçimi, hava zolağı, aqronom çatı
  components/         Icon, Card, Chip, Sparkline, FarmScoreGauge, ...
  state/store.jsx     reducer + localStorage-da saxlanma
  services/           məlumat mənbələri (hava və aqronom realdır, qalanı nümunə)
  services/knowledge.js  aqronomik bilik bazası — aqronom yoxlanışı gözləyir
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
- **Yer seçimi** (47 rayon + GPS) `features/location/` və `services/location.js`-ə
  köçürüldü: seçim store-da saxlanılır, mətnlər üç dildədir, rayon siyahısı isə
  azərbaycan əlifba sırasına düzəldildi (əvvəl `Qəbələ` `Qusar`-dan sonra gəlirdi,
  çünki sıralama Unicode kod nöqtəsinə görə idi). Köhnə `agrifin.yer` açarı bir dəfə
  oxunur ki, mövcud istifadəçidən yer yenidən soruşulmasın.
- **Əlçatanlıq:** klik olunan kartlar həqiqi `<button>`-dur, ikon düymələrində
  `aria-label`, kredit paneli `role="dialog"` + Escape ilə bağlanır, naviqasiyada
  `aria-current`.
- **52 test:** reducer, format, hava məntiqi, tərcümə açarları, ikon siyahısının
  tamlığı və tətbiqin uçdan-uca axınları (kredit götürmə, karbon satışı, dil dəyişmə).

---

## Aqronom köməkçisi

Fermer əlamətləri təsvir edir, cavab isə onun rayonunun iqlim zonası, cari
fenoloji mərhələ, 7 günlük hava xülasəsi və NDVI göstəricisi nəzərə alınaraq
qurulur. Model: Claude (`claude-sonnet-5`) — qısa aqronomik cavablar üçün
sürət/qiymət balansı uyğundur.

**Qurulma (bir dəfə)**

1. [console.anthropic.com](https://console.anthropic.com) → API Keys → açar yarat,
   balans əlavə et. **Həmin gün xərc limiti qoy** — səbəbi aşağıda.
2. Vercel → Project → Settings → Environment Variables → `ANTHROPIC_API_KEY`,
   hər üç mühit üçün → Save.
3. **Yenidən deploy et.** Mühit dəyişənləri mövcud build-ə tətbiq olunmur;
   bu addım atlanarsa nasaz açarla eyni görünən xəta alınır.

**Bilməli olduğun iki şey**

- **`npm run dev` çatı işlətmir.** `/api/*` marşrutları yalnız Vercel-də (və ya
  `vercel dev`-də) mövcuddur. Lokal Vite serverində çat sorğusu 404 qaytarır —
  bu qüsur deyil, gözlənilən davranışdır.
- **Endpoint publikdir və pul xərcləyir.** Funksiyada instans-daxili sürət həddi
  var (5 dəqiqədə 20 sorğu / IP), lakin serverless instanslar arasında
  paylaşılmadığı üçün tam qorunma deyil. Linki geniş yaymadan əvvəl Anthropic
  konsolunda xərc limiti və düzgün sürət həddi (KV/Redis) lazımdır.

**Təhlükəsizlik qaydası — preparat və doza verilmir.** Azərbaycanda yalnız
dövlət qeydiyyatına alınmış preparatların istifadəsi qanunidir və reyestr
AQTA-dadır (afsa.gov.az). Model reyestri görmür, ona görə preparat adı, doza
və norma verməsi qadağandır: sistem promptu bunu qadağan edir, serverdə regex
yoxlaması sızmış dozanı kəsir, bilik bazasının özündə isə doza yazılışı olmadığı
test ilə yoxlanılır. Cavab problemi adlandırır, müdaxilə SİNFİNİ izah edir və
dilerə/aqronoma yönləndirir.

**Bilik bazası hələ yoxlanmayıb.** `services/knowledge.js` — 10 bitki üzrə
fenoloji mərhələlər və xəstəlik əlamətləri. Hər bitkidə `yoxlanildi: false`
bayrağı var və test bunu yoxlayır. İstifadəyə verilməzdən əvvəl bir dəfə
peşəkar aqronom baxışından keçirilməlidir.

---

## 3-cü mərhələ — növbəti addımlar

Prioritet sırası ilə:

1. **Çat endpoint-inin qorunması.** `/api/agronom` publikdir və hər çağırış pul
   xərcləyir. Cari sürət həddi instans-daxilidir; Vercel KV və ya Redis ilə
   paylaşılan hədd, sonra isə hesaba bağlı kvota lazımdır.
2. **Bilik bazasının aqronom yoxlanışı.** 10 bitki üzrə mərhələ və əlamət
   məlumatı yoxlanmalı, `yoxlanildi` bayraqları qaldırılmalıdır.
3. **Backend və autentifikasiya.** Hazırda bütün vəziyyət brauzerdədir.
   Real məhsul üçün: hesab, SMS/ASAN ilə giriş, server tərəfdə saxlanma.
   `services/` qovluğu bu keçid üçün hazırdır — ekranlara toxunmaq lazım deyil.
4. **Real peyk məlumatı.** NDVI və sahə sərhədləri indi sabit rəqəmdir.
   Sentinel-2 (Copernicus) ilə əvəz olunmalı; FarmScore həmin seriyadan hesablanmalı.
5. **KYC və maliyyə tənzimləməsi.** Kredit və kart məhsulu bank lisenziyası və ya
   partnyor bank tələb edir. Bu, texniki deyil, hüquqi işdir və ən uzun sürəndir.
6. **Şriftləri öz üzərimizdə saxlamaq.** Sora/Inter indi Google-dan gəlir —
   oflayn rejimdə brend şrifti itir və üçüncü tərəfə sorğu gedir.
7. **Bazar qiymətləri** üçün real mənbə (dövlət statistikası və ya birja).
8. **Karbon MRV.** Kredit satışı real registr (Verra/Gold Standard) tələb edir.
9. **Telemetriya və xəta izləmə** — hansı tövsiyələrin tamamlandığını ölçmək
   məhsulun dəyərini sübut etmək üçün lazımdır.

---

## Deploy

Vercel: repo qoşulduqda avtomatik build olunur (`npm run build` → `dist/`).
`vercel.json` SPA yollarını `index.html`-ə yönləndirir və statik faylları keşləyir.
Netlify və ya digər statik hostinq üçün eyni yönləndirmə qaydası lazımdır.
