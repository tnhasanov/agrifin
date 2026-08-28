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
  ndvi.js             Copernicus Sentinel-2 → NDVI + rütubət seriyası
  radar.js            Copernicus Sentinel-1 → buludun arxasından radar ölçməsi
  saheSekli.js        sahənin rəngli NDVI xəritəsi (şəkil)
  copernicus.js       ortaq kimlik doğrulama və açar qorunması
  geoJson.js          kontur çevirmə (en/uzunluq sırası burada qorunur)
  knowledge.js        aqronomik bilik bazası — aqronom yoxlanışı gözləyir
  dozaQoruyucu.js     axında doza sızmasını tutan bufer
src/
  main.jsx            provayderlər + servis işçisi
  App.jsx             qabıq: başlıq, naviqasiya, aktiv ekran
  routes.js           yolların vahid siyahısı
  screens/            beş ekran — yalnız göstərmə məntiqi
  features/           ilk açılış, sahə çəkmə, kredit paneli, yer, hava, çat
  components/         Icon, Card, Chip, Sparkline, Sheet, ...
  state/store.jsx     reducer + localStorage-da saxlanma
  services/           məlumat mənbələri (hava və aqronom realdır, qalanı nümunə)
  i18n/               az (əsas), en, ru + açar yoxlayan test
  lib/                format, storage, router, pwa, analitika
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

## İlk açılış (Tier 0)

İki addım, iki toxunuş: rayon və bitki. Nə hesab, nə telefon nömrəsi, nə
şəxsiyyət — heç biri soruşulmur, hər addım da keçilə bilir.

Səbəb ölçülərdir, zövq deyil. Fintex qeydiyyatında orta imtina 63%-dir,
3 dəqiqədən uzun axını isə istifadəçilərin 70%-i yarımçıq atır. Aqronom
çatı və hava proqnozu şəxsiyyət bilmədən tam işləyir, ona görə onları
kimlik yoxlamasının arxasına qoymağın mənası yoxdur: fermer dəyəri əvvəl
görməlidir. Brauzerdə ölçülən müddət: **0.4 saniyə**.

Sonrakı pillələr (hazırda YOXDUR, plan üçün bax: 3-cü mərhələ):

| Pillə | Nə verir | Nə açır |
|---|---|---|
| 0 — anonim | rayon + bitki | çat, hava — **qurulub** |
| 1 — SİMA İmza | təsdiqlənmiş şəxsiyyət | cihazlar arasında saxlanma |
| 2 — EKTİS | qeydiyyatdan keçmiş sahələr | həqiqi sahə, həqiqi NDVI |
| 3 — tam KYC | bank tərəfdaşı | kredit müraciəti |

`lib/analytics.js` hər addımı qeyd edir. Heç yerə göndərilmir — hadisələr
yaddaşdadır. Qıfı ölçmədən düzəltmək mümkün deyil, sonradan əlavə etmək isə
hər ekrana toxunmaq deməkdir.

---

## Sahə çəkmə

Fermer peyk şəklində sahəsinin künclərinə toxunub konturu çəkir; sahə hektarla
canlı hesablanır və saxlananda əsas ekrandaki nümunə rəqəmi (6.5 ha) əvəz edir.
Bu, FarmScore-un peyk yolunun birinci addımıdır: NDVI yalnız konturu bilinən
sahə üçün hesablana bilər.

Üç texniki qərar:

- **Peyk təsviri, küçə xəritəsi yox** (Esri World Imagery). Kənddə küçə
  xəritəsi boş bej düzbucaqlıdır — fermer sahəsini yalnız peyk şəklində tanıyır.
- **Sahə sferik düsturla hesablanır** (`services/geo.js`). Dərəcələri düz
  müstəvi saymaq 40°N-də sahəni ~30% şişirdir; kredit limiti hektara bağlı
  olacağı üçün bu, qrafik xətası deyil, maliyyə xətasıdır. Test planar düsturun
  verəcəyi səhv cavabı açıq şəkildə istisna edir.
- **Leaflet yalnız bu ekranda yüklənir** (~43 kB gzip ayrıca parça) — sahə
  çəkməyən fermer xəritə kitabxanasının yükünü heç vaxt almır.

Yoxlamalar: minimum 3 künc, öz-özünü kəsən kontur rədd edilir (papyon
formasının sahəsi mənasızdır), 0.05 ha-dan kiçik və 1000 ha-dan böyük kontur
rədd edilir, seçilmiş rayondan 150 km-dən uzaq sahəyə xəbərdarlıq verilir.

---

## Peyk ölçməsi (NDVI)

Fermerin çəkdiyi kontur Copernicus-un Statistical API-sinə göndərilir və
sahənin son 60 günlük NDVI seriyası qayıdır. Şəkil endirilmir — hesablama
Copernicus tərəfdə olur, biz yalnız rəqəmləri alırıq.

**Qurulma:** dataspace.copernicus.eu → qeydiyyat → Dashboard → User Settings →
OAuth clients → Create. Alınan dəyərlər Vercel-ə `SENTINEL_CLIENT_ID` və
`SENTINEL_CLIENT_SECRET` kimi əlavə olunur (Production + Preview; Vercel
"Sensitive" dəyişəni Development-ə buraxmır və bu normaldır, çünki
`npm run dev` onsuz da /api/* vermir). Sonra yenidən deploy.

**Yoxlama:** brauzerin ünvan sətrindən `/api/ndvi` açın. `{acarQurulub,
tokenAlindi}` qaytarır — açar dəyəri heç vaxt görünmür.

Qərarlar:

- **Bulud maskalanır.** SCL zolağı ilə bulud, kölgə və qar piksel-piksel
  atılır. Bu olmadan buludlu gün "bitki ölüb" kimi görünür.
- **5 günlük dövr, ən az buludlu görüntü.** Sentinel-2 hər 2–3 gündən bir
  keçir, amma çox gün buludludur. Dövrlə fermer boşluqsuz əyri görür; dəqiq
  çəkiliş tarixi dövrün içindədir və UI bundan artıq dəqiqlik iddia etmir.
- **Açar heç bir formada geri qaytarılmır.** Diaqnostika yalnız status verir,
  yuxarı axının xəta mətni əks olunmur — test bunu yoxlayır və bir dəfə
  həqiqi sızma tutdu.
- **Keş brauzerdədir**, 12 saat, açarı konturun özündən çıxarılır: fermer
  sahəni dəyişəndə köhnə ölçmələr avtomatik etibarsız olur. Verilənlər
  bazası lazım deyil.
- **Ölçmə yoxdursa uydurulmur.** Nümunə NDVI artıq nə ekranda nə də çata
  göndərilir; model kontekstdə açıq şəkildə "NDVI ölçüsü YOXDUR" görür.

Vəziyyətlər fermerə ayrı-ayrı cümlələrlə deyilir: yüklənir · ölçüldü ·
buludlu olub · inteqrasiya qurulmayıb · alınmadı.

**Sahənin xəritəsi.** Orta rəqəm problemin OLDUĞUNU deyir, xəritə isə
HARADA olduğunu. Fermer öz sahəsini tanıyır: quru künc, susuz zolaq onun
üçün tanış yerlərdir, və tətbiq onları göstərəndə inam yaranır. Process API
rəngli PNG qaytarır; buludlu piksellər şəffafdır. Şəkil bəzəkdir, əsas
məlumat deyil — alınmasa sükutla gizlənir.

**Hava: gündən saata.** Zolaqda hər gün üçün gündüz və gecə temperaturu,
yağış varsa mm-i var; günə toxunanda 3 saatlıq addımla saatlar açılır. Səbəb:
fermerin sualı çox vaxt "sabah necədir" yox, "NEÇƏDƏ"-dir — şaxta gecə 4-də
vurur, külək günortadan sonra qalxır.

Havadan çıxarılan üç yeni qərar:

- **Çiləmə pəncərəsi güləyə görə.** Dərmanı aparan orta külək deyil, qəfil
  gülәkdir; əvvəl yalnız ortalamaya baxırdıq və gülәkli günü "əlverişli"
  sayırdıq.
- **Səpin torpaq temperaturuna görə.** Toxum soyuq torpaqda cücərmir, çürüyür.
  6 sm-dəki ölçmə səpin mərhələsində bitkinin öz həddi ilə müqayisə olunur.
- **Xəstəlik şəraiti.** 8 saatdan uzun yüksək rütubət + ilıq hava göbələk
  sporunun cücərmə pəncərəsidir. Siqnal DİAQNOZ QOYMUR — mətn bunu açıq
  yazır və şəkil çəkməyə yönləndirir, çünki "şərait var" ilə "xəstəlik var"
  arasındakı fərq silinsə fermer boş yerə dərman çiləyər.

**İstilik toplanması (dərəcə-gün).** Mərhələlər təqvimlə yox, toplanmış
istiliklə gəlir. Arxiv API-dən bu mövsümün və keçən ilin EYNİ təqvim
pəncərəsi alınır və fərq günə çevrilir ("təxminən 9 gün qabaqda"). Mütləq
proqnoz verilmir — mərhələ hədləri sorta görə dəyişir və bizdə yerli sortların
hədləri yoxdur. Başlanğıc tarixi təxminidir, amma müqayisəni pozmur: hər iki
il eyni tarixdən sayılır.

**Aqronomik performans indeksi — ekspert bal cədvəli.** Nümunə "782" balının
yerinə: sahənin 2017-dən bəri BÜTÜN mövsümləri (Sentinel-2 arxivi) təhlil
olunur və 0–100 bal cədvəli tətbiq edilir. Fermer sahəni bu gün çəksə də 8-9
mövsümlük tarixçə dərhal mövcuddur. Məntiq: `lib/mehsuldarliq.js`.

Altı amil (`SCORE_CONFIG`):

| Amil | Çəki | Metodologiya |
| --- | ---: | --- |
| Əkin davamlılığı | 15 | əkilmiş mövsümlərin payı |
| Nisbi aqronomik performans | 30 | **proxy**: 5 km ətrafın medianı |
| Mövsümi vegetasiya keyfiyyəti | 20 | **proxy**: zirvə (AUC hazır deyil) |
| Performans sabitliyi | 15 | nisbi mövqenin kənarlaşması |
| Son dövrün meyli | 10 | son 5 mövsüm |
| Cari mövsümün vəziyyəti | 10 | **proxy**: ətrafla müqayisə |

Qərarlar:

- **Bu, KREDİT BALI DEYİL** və ekranda da belə yazılır. PD, gözlənilən itki,
  limit, faiz, qərar — heç biri yoxdur və olmayacaq. Ödəniş tarixçəsi olmadan
  "qaytaracaqmı" sualına çəki vermək uydurma olardı; aqronomik "yaxşı
  becərilirmi" sualına isə ekspert çəki verə bilər. İndeks anderraytinq üçün
  BİR GİRİŞDİR — kredit qərarı bankındır.
- **MƏLUMAT KEYFİYYƏTİ QAPISI baldan əvvəl işləyir**: 3 ölçülə bilən
  mövsümdən az tarixçədə nə bal, nə bant göstərilir ("Tarixçə kifayət deyil").
  Bir yaxşı mövsümdən "94 / Yüksək" çıxarmaq müdafiə edilə bilməz.
- **Etibarlılıq baldan AYRIDIR**: 3–4 mövsüm "İlkin", 5–7 "Orta", 8+ "Yüksək".
  Etibar aşağı olduğu üçün xal əlavə edilmir və çıxılmır.
- **Ölçülməyən amil 100-ə MİQYASLANMIR**: məxrəc həmişə 100 qalır, ölçülməyən
  amil xal qazanmır və nəticə "natamam" işarələnir. Köhnə miqyaslama seyrək
  məlumatlı sahəni süni yaxşı göstərirdi — mənfi məlumatın olmaması yaxşı
  xəbər deyil. Kritik amil (müqayisə) yoxdursa BANT VERİLMİR.
- **Proxy-lər gizlədilmir**: həmyaş qrupu (eyni bitki, oxşar suvarma) hələ
  yoxdur; yerli 5 km müqayisəsi müvəqqəti yaxınlaşdırmadır və UI-da "təxmini"
  nişanı ilə işarələnir. 5 km-lik zolağın torpağı və suvarması eyni deyil.
- **Struktur qaydaları test edilir**: heç bir amil 30%-dən çox çəki daşımır,
  bal göstərici yaxşılaşanda heç vaxt azalmır (monotonluq), boş mövsüm yalnız
  davamlılıqda cəzalandırılır (ikiqat sayma yoxdur).
- **Hər sətir görünür**: hər amilin adı, xalı, xam göstəricisi, səbəbi və
  metodologiyası qaytarılır. Gizli düstur etibar yaratmır.
- **Hədlər EKSPERT TƏKLİFİDİR** — müvəqqəti, statistik kalibrlənməyib,
  aqronom və kredit mütəxəssisi təsdiqi yoxdur (`TESDIQ` obyekti).
- **FICO görünüşü (300-850) qəsdən atılıb** — o miqyas "kredit balı" deyir.

**Radar (Sentinel-1) — buludun arxasından.** Optik peyk buluda baxa bilmir və
Azərbaycanda payız-yaz aylarında sahə həftələrlə buludun altında qalır: tətbiq
elə fermerin ən çox ehtiyacı olan vaxtda susurdu. Sentinel-1 radar dalğası
buludu deşib keçir.

Qərarlar:

- **Radar YALNIZ optik ölçmə çatmayanda çağırılır** (8 gündür təmiz ölçmə
  yoxdursa). Daimi ikinci sorğu emal kvotasını iki dəfə artırardı, halbuki
  günəşli həftədə Sentinel-2 daha çox şey deyir.
- **Mütləq rəqəm iddia edilmir.** Radar geriyə səpilmə qaytarır, "torpaqda
  23% su var" yox: səpilməyə su ilə yanaşı səthin kələ-kötürlüyü və bitki
  örtüyü də təsir edir. Ona görə yalnız sahənin ÖZ keçmişi ilə müqayisə
  göstərilir ("son ölçmələrə nisbətən nəmlənib").
- **Orbit istiqaməti sabitdir** (ASCENDING). Fərqli orbit = fərqli baxış
  bucağı = başqa səpilmə; qarışdırsaq "nəmlik artdı" siqnalı əslində peykin
  başqa yoldan keçməsi olardı.
- **Durmuş su ən etibarlı nəticədir.** Hamar su səthi dalğanı geri
  qaytarmır — bu, təxmin deyil, fizikadır. VV < −18 dB piksel payı sahənin
  15%-ni keçirsə təcili siqnal verilir. Hədd KALİBRLƏMƏ tələb edir.
- **Ziddiyyət bloklanır.** Radar durmuş su görürsə suvarma məsləhəti
  verilmir: "suvar" ilə "sahədə su durub" eyni ekranda dayana bilməz.

**Rütubət (NDMI).** NDVI "bitki zəifdir" deyir, NDMI isə səbəbin SU olub
olmadığını göstərir — suvarma qərarı buna bağlıdır. B11 eyni məhsuldadır,
ona görə eyni sorğuda gəlir: ayrıca çağırış emal kvotasını iki dəfə yandırardı.

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

**Cavab axınla gəlir.** Funksiya NDJSON qaytarır (`{t:"delta"|"replace"|"done"|
"error"}`), çat isə mətni gəldikcə göstərir — fermer 5–8 saniyə boş ekrana
baxmır. Doza qoruyucusu buna uyğunlaşdırılıb: mətnin son 48 simvolu heç vaxt
dərhal göndərilmir, çünki orada yarımçıq doza forması ola bilər. Tam uyğunluq
yaranan kimi axın dayandırılır və `replace` hadisəsi ekrandakı hər şeyi
təhlükəsiz mətnlə əvəz edir. Başlıqlar da gec yazılır: ilk parça hazır olana
qədər funksiya hələ həqiqi 500/502 qaytara bilir.

**Bilməli olduğun iki şey**

- **`npm run dev` çatı işlətmir.** `/api/*` marşrutları yalnız Vercel-də (və ya
  `vercel dev`-də) mövcuddur. Lokal Vite serverində çat sorğusu 404 qaytarır —
  bu qüsur deyil, gözlənilən davranışdır.
- **Endpoint publikdir və pul xərcləyir.** Funksiyada instans-daxili sürət həddi
  var (5 dəqiqədə 20 sorğu / IP), lakin serverless instanslar arasında
  paylaşılmadığı üçün tam qorunma deyil. Linki geniş yaymadan əvvəl Anthropic
  konsolunda xərc limiti və düzgün sürət həddi (KV/Redis) lazımdır.

**Şəkil.** Fermer yarpağın şəklini çəkib göndərə bilir — simptomu sözlə
təsvir etməkdən qat-qat asandır və savad maneəsini aradan qaldırır. Şəkil
brauzerdə 1024 piksel/JPEG-ə kiçildilir (telefon şəkli 3–8 MB-dır, kənd
internetində belə göndərmək dəqiqələr çəkərdi) və söhbət tarixçəsinə
YAZILMIR: base64 localStorage kvotasını bir neçə şəkildə doldurar və
saxlanan bütün vəziyyət itərdi. Server müştəri yoxlamasına güvənmir —
növ, ölçü və base64 əlifbası yenidən yoxlanılır.

**Təhlükəsizlik qaydası — preparat və doza verilmir.** Azərbaycanda yalnız
dövlət qeydiyyatına alınmış preparatların istifadəsi qanunidir və reyestr
AQTA-dadır (afsa.gov.az). Model reyestri görmür, ona görə preparat adı, doza
və norma verməsi qadağandır: sistem promptu bunu qadağan edir, serverdə
gecikdirmə buferli yoxlama sızmış dozanı axın ekrana çatmamış kəsir (parçaların
hansı sərhədlə gəlməsindən asılı olmayaraq — test bütün parça ölçülərini
yoxlayır), bilik bazasının özündə isə doza yazılışı olmadığı test ilə yoxlanılır. Cavab problemi adlandırır, müdaxilə SİNFİNİ izah edir və
dilerə/aqronoma yönləndirir.

**Bilik bazası hələ yoxlanmayıb.** `api/knowledge.js` — 10 bitki üzrə
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
3. **Tier 1 — SİMA İmza ilə giriş.** SİMA pulsuzdur, qeydiyyat tətbiqin
   içində ~1 dəqiqədir və altı bank onu artıq inteqrasiya edib. Sənəd şəkli
   istənilmir — bu vacibdir, çünki sənədi yenidən yükləməyə məcbur olan
   istifadəçi 3 dəfə çox imtina edir. AzInTelecom ilə müqavilə tələb olunur.
4. **Tier 2 — EKTİS inteqrasiyası.** Kənd Təsərrüfatı Nazirliyinin sistemində
   435 mindən çox fermer və 364 min hektar bəyan edilmiş əkin var. Açıq API
   yoxdur — kurum səviyyəsində razılaşma lazımdır. Əsas sual: EKTİS sahənin
   HƏNDƏSƏSİNİ (sərhəd konturunu) saxlayır, yoxsa yalnız hektarı? Cavab
   peyk yol xəritəsinin ölçüsünü müəyyən edir.
5. **Backend və saxlanma.** Hazırda bütün vəziyyət brauzerdədir.
   `services/` qovluğu bu keçid üçün hazırdır — ekranlara toxunmaq lazım deyil.
6. **FarmScore-un həqiqi hesablanması.** NDVI artıq peykdən gəlir, amma
   FarmScore (782) və kredit limiti hələ sabit rəqəmdir. Növbəti addım:
   balı NDVI seriyasından — trend, dəyişkənlik, rayon ortalaması ilə
   müqayisə — hesablamaq. Bal maliyyə qərarına təsir edəcəyi üçün hesablama
   izlənilə bilən (auditable) olmalıdır.
7. **KYC və maliyyə tənzimləməsi.** Kredit və kart məhsulu bank lisenziyası və ya
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

## Faza 1 — hesab və verilənlər bazası

Tətbiq hesabsız tam işləyir (localStorage). Hesab İSTƏYƏ BAĞLI əlavədir:
telefon nömrəsi ilə giriş sahəni, tarixçə snapshot-unu və bal jurnalını
serverə bağlayır — cihaz dəyişəndə heç nə itmir.

Hissələr:

- `db/migrations/` — nömrələnmiş SQL miqrasiyaları: `001_baseline.sql`
  (istifadəçilər, OTP, sessiyalar, sahələr, peyk snapshot-ları, bal jurnalı),
  `002_kredit.sql` (kredit sistemi — aşağıya bax). Tətbiq olunanlar
  `sxem_miqrasiyalari` cədvəlində izlənir.
  **Runtime sxemi DƏYİŞMİR**: əvvəl `lib/db.js` hər instansın ilk sorğusunda
  sxemi işlədirdi, yəni adi istifadəçi sorğusu prodakşn sxemini dəyişə
  bilirdi. Maliyyə qeydləri gələndən sonra bu yolverilməzdir — indi yalnız
  `npm run db:migrate` (bax: `scripts/migrate.mjs`).
- `lib/db.js` — istehsalda Neon HTTP sürücüsü, testlərdə PGlite; hər ikisi
  `sorgu(mətn, parametrlər) → sətirlər` adapterinin arxasındadır.
- `lib/hesab.js` — OTP (6 rəqəm, 5 dəq, 5 cəhd, birdəfəlik) və 90 günlük
  sessiya. Kod və token bazada yalnız hash kimi yaşayır (SESSION_SECRET
  pepper ilə); sürət hədləri bazadadır — instanslar arası paylaşılır.
- `lib/sms.js` — SMS arxası. `SMS_URL` yoxdursa kod funksiya loguna yazılır
  (yerli şlüz müqaviləsinə qədər); müqavilədən sonra yalnız 2 env dəyişəni.
- `api/hesab.js`, `api/sahe.js` — HTTP qatı (Hobby limiti üçün hər biri bir
  funksiyadır, əməl POST gövdəsindəki `emel` ilə seçilir).
- Müştəri: `src/features/hesab/` (giriş paneli + sinxron hook-u). Daxil olmuş
  fermerin sahəsi, tarixçəsi və hər indeks hesablanması avtomatik yazılır.

Quraşdırma (Vercel):

1. Storage → Create Database → **Postgres (Neon)** → layihəyə qoşun.
   `DATABASE_URL` avtomatik gəlir (Production + Preview).
2. Settings → Environment Variables → `SESSION_SECRET` = `openssl rand -hex 32`.
3. Yenidən deploy edin — dəyişənlər YALNIZ yeni deploy-a düşür, mövcud
   deploy köhnə mühitlə qalır. Yoxlama: `GET /api/hesab` →
   `{"dbQurulub":true,"hesabQurulub":true,"acar":"DATABASE_URL", ...}`.
   `false` gələrsə cavabdakı `acar` və `muhit` sahələrinə baxın: `acar: null`
   = bağlantı sətri heç bir tanınan adla gəlmir (`DATABASE_URL`,
   `POSTGRES_URL`, hovuzsuz variantlar), `muhit` isə preview/production
   ayırır — dəyişən yalnız birinə əlavə olunubsa səbəb budur.
4. (Sonra) SMS şlüzü müqaviləsindən sonra `SMS_URL` və `SMS_ACAR` əlavə edin.
   O vaxta qədər OTP kodları yalnız Vercel funksiya loglarında görünür —
   UI-da heç vaxt göstərilmir.
5. **Miqrasiyaları işlədin — DEPLOY-DAN ƏVVƏL.** Kredit miqrasiyaları
   additivdir (köhnə kod yeni cədvəllərlə işləməyə davam edir), amma yeni
   kod (`/api/kredit`) cədvəlsiz işləmir. Ona görə sıfır-fasilə sırası:

   **miqrasiya → deploy → smoke test** (`GET /api/kredit` daxil olmuş
   istifadəçi ilə 200 qaytarmalıdır), tərsi yox.

   ```bash
   DATABASE_URL="postgres://..." npm run db:migrate         # tətbiq et
   DATABASE_URL="postgres://..." npm run db:migrate -- --list  # vəziyyət
   ```

   Ünvanın özü heç yerdə çap olunmur — yalnız istifadə olunan açarın adı.
   Uğursuzluqda çıxış kodu 1-dir və hansı faylın hansı əmrində dayandığı
   yazılır; səssiz davam yoxdur.

## Faza 2 — kredit sistemi serverdə

Kredit vəziyyəti (müraciət, qərar, təklif, kredit, ödəniş jurnalı) ARTIQ
brauzerdə deyil. Səbəb sadədir: brauzer maliyyə vəziyyətinin həqiqət mənbəyi
ola bilməz — fermer onu əl ilə dəyişə, cihaz dəyişəndə itirə bilər, sahibi
isə heç yerdə qeyd olunmur.

- `db/migrations/002_kredit.sql` — `credit_applications`,
  `credit_application_events`, `credit_decisions`, `credit_offers`, `loans`,
  `loan_events`. Qərarın BÜTÜN girişləri `decision_inputs` JSONB sütununda
  surət kimi saxlanılır: konfiqurasiya dəyişsə də köhnə qərar izah oluna bilər.
  Maliyyə tarixçəsi `loan_events`-dən çıxır (yalnız artır) — tam ikitərəfli
  mühasibat qəsdən qurulmayıb, amma sonradan əlavə etməyə açıqdır.
- `lib/kredit.js` — SAF domen: vəziyyət maşını (icazəli keçidlər) və
  anderraytinq. `lib/kreditSertler.js` — dərəcə, limit düsturu (server və
  klient EYNİ funksiyanı işlədir). `lib/kreditOdenis.js` — aylıq faiz yalnız
  QALAN əsas borca.
- `api/kredit.js` — autentifikasiyalı HTTP (bir funksiya, `emel` ilə):
  müraciət, təklifin qəbulu, imtina, ödəniş. Kimlik yalnız sessiyadan çıxır;
  gövdədəki `user_id` NƏZƏRƏ ALINMIR. Bal, gəlir, qabiliyyət və qərar
  serverdə hesablanır — klient yalnız istədiyi məbləği göndərir.
- Müştəri: `src/services/kredit.js` + `src/features/loan/useKreditVeziyyeti.js`.
  localStorage-da yalnız UI vəziyyəti qalır (yüklənir, forma, dil).

### Kredit mühərriki (004)

Kredit verildikdən sonrakı həyat: faizin yığılması, ödənişin bölünməsi,
gecikmə.

- `lib/kreditMuhasibat.js` — SAF mühasibat. Faiz GÜNDƏLİK yığılır (act/365)
  və aylıq dövrün sonunda BİR hadisə kimi yazılır; ödəniş ƏVVƏL faizi, sonra
  əsas borcu bağlayır; gecikmə (DPD) ödənilməmiş ən köhnə faiz borcunun
  yaşıdır. **Kompaundinq və cərimə dərəcəsi YOXDUR** — faizin bazası həmişə
  yalnız əsas borcdur.
- `db/migrations/004_kredit_muhasibat.sql` — `loans`-a faiz balansları və
  dövr sayğacı, `loan_events`-ə `interest_after` və `due_on`.
- Hesablama CRON-suzdur: `api/kredit.js` → `faizleriIsle()` hər oxunuşda
  bitmiş dövrləri yazır. İdempotentdir (`faiz-<dövr>` açarı + `accrued_periods`
  şərti), yəni nə itən, nə təkrarlanan faiz var; nəticə vaxtdan asılıdır,
  sorğu tarixçəsindən yox.
- UI: aktiv kredit ekranı qalıq, ödənilməmiş faiz, növbəti ödəniş (tarix +
  təxmini məbləğ), gecikmə və hərəkət jurnalını göstərir; ödəniş elə oradan
  edilir. Rəqəm "təxmini"dir, çünki əsas borcu azaltmaq faizi də azaldır.

**Yarış testləri (real Postgres):** vitest-dəki yarış testləri PGlite
üzərindədir — tək bağlantılıdır, sorğular faktiki ardıcıllaşır. Əsl paralel
icra `scripts/yaris-testi.mjs` ilə REAL Neon üzərində yoxlanılır: birdəfəlik
Neon branch-ı yaradın (maliyyə cədvəlləri RESTRICT-dir, test qalığı ana
bazaya yazılmamalı və silinməli də deyil), sonra:

```bash
DATABASE_URL="postgres://...yaris-branch..." SESSION_SECRET="test-sirri" \
  node scripts/yaris-testi.mjs
```

Ssenarilər: qalıq 100-ə eyni anda 60+60 → 60 və 40, qalıq 0; eyni
idempotentlik açarı (paralel + təkrar) → düz bir maliyyə hadisəsi; eyni
təklifə paralel iki qəbul → düz bir kredit. Uğursuzluqda çıxış kodu 1.
Bitirəndə branch-ı silin. Bu yoxlama hər sxem/SQL dəyişikliyindən sonra,
merge-dən əvvəl işlədilməlidir.

⚠ **Demo pul:** `wallet`, əməliyyat siyahısı və karbon satışı hələ
prototip nümunələridir — server hesabına bağlı deyil və kredit axını
onları oxumur/yazmır (bax: store.jsx-dəki işarələnmiş blok). Server
avtoritativ olan yalnız kredit zənciridir: müraciət → qərar → təklif →
kredit → ödəniş jurnalı.

⚠ **Miqrasiya siyasəti:** köhnə prototipin localStorage-dakı `muraciet`
obyektləri bazaya KÖÇÜRÜLMÜR (store v8→v9 onları silir). Onlar sahibsizdir,
heç bir anderraytinqdən keçməyib və brauzerdə dəyişilə bilən dəyərlərdir —
belə rəqəmləri maliyyə qeydi kimi yazmaq uydurma borc yaratmaq olardı.
Fermer müraciəti server axını ilə yenidən göndərir; sahə, rayon, söhbət qalır.
