# ATB Kredit Təhlili

SME müraciətlərinin təhlili və anderraytinq prosesi üçün veb tətbiq: müraciətin
qeydə alınmasından kredit komitəsinin qərarına qədər bütün mərhələ bir iş faylında.

> **Nümunə prototipdir.** Portfel brauzerdə (`localStorage`) saxlanılır, bank
> sistemlərinə qoşulmayıb. Reytinq modelinin çəkiləri və siyasət hədləri nümunə
> dəyərlərdir — istifadədən əvvəl bankın öz defolt statistikası ilə
> kalibrlənməlidir.

Bu tətbiq eyni depodakı `agrifin` layihəsindən asılı deyil; ayrıca `package.json`
və ayrıca asılılıqları var.

---

## Başlamaq

```bash
cd atb-underwriting
npm install
npm run dev        # http://localhost:5174
```

| Əmr               | Nə edir                                    |
| ----------------- | ------------------------------------------ |
| `npm run dev`     | Dev server                                 |
| `npm run build`   | `dist/` qovluğuna istehsal build-i         |
| `npm run preview` | Build-i lokal yoxlamaq                     |
| `npm test`        | Vitest — 169 test                          |
| `npm run lint`    | ESLint                                     |

---

## Prosesin gedişi

```
Qaralama → Təhlildə → Risk baxışı → Komitədə → Təsdiq / Şərti təsdiq / İmtina
```

Hər mərhələnin öz rolu var (kredit mütəxəssisi → risk analitiki → komitə) və hər
keçidin öz şərti: maliyyə hesabatı olmadan iş risk baxışına, təsdiqlənmiş reytinq
və yazılı tövsiyə olmadan komitəyə çıxmır. Şərt ödənməyəndə düymə bağlı qalır və
nəyin çatışmadığı yazılır. Hər keçid jurnala düşür: kim, nə vaxt, hansı qeydlə.

Başlıqdakı **Rol** seçicisi rolu dəyişir — icazələrin necə işlədiyini görmək üçün.

---

## İş faylının bölmələri

| Bölmə          | Nə edir                                                                    |
| -------------- | -------------------------------------------------------------------------- |
| **Profil**     | Müştəri və kredit tələbi                                                    |
| **Maliyyə**    | Hesabatların açılışı (spreading) — 2–3 dövr, balans yoxlanışı ilə           |
| **Təhlil**     | Likvidlik, borc yükü, rentabellik, dövriyyə əmsalları və dinamika           |
| **Reytinq**    | Kəmiyyət (60%) + keyfiyyət (40%) skorkart, 1–10 sinif, düzəliş imkanı       |
| **Girov**      | Növ üzrə endirimlər, kredit dəyəri, örtük əmsalı                            |
| **Struktur**   | Pul axını, DSCR, üç məhdudiyyət üzrə limit, ödəniş cədvəli                  |
| **Memorandum** | Komitəyə gedən sənəd — rəqəmlər təhlildən, mətn mütəxəssisdən               |
| **Qərar**      | Siyasət yoxlanışı, mərhələ keçidləri, şərtlər, qərar jurnalı                |

---

## Hesablama məntiqi

Bütün hesablama `src/domain/` altındadır və ekranlardan asılı deyil. Ekran
heç nə hesablamır — `analyse(caseFile)` nə qaytarırsa, onu göstərir. Buna görə
memorandumdakı DSCR ilə struktur ekranındakı DSCR eyni funksiyadan çıxır.

| Modul           | Məsuliyyəti                                                             |
| --------------- | ----------------------------------------------------------------------- |
| `financials.js` | Cəmlər, EBITDA pilləsi, düzəlişlər, balans yoxlanışı, illikləşdirmə      |
| `ratios.js`     | Əmsallar — hər biri dəyər, bant və **düsturu** ilə birlikdə              |
| `capacity.js`   | Annuitet, güzəşt dövrü, DSCR, stress, limit                             |
| `collateral.js` | Növ üzrə LTV, kredit dəyəri, örtük                                       |
| `scorecard.js`  | Skorkart, 1–10 reytinq şkalası, riskə uyğun faiz                         |
| `policy.js`     | Dayandırıcı və xəbərdarlıq yoxlanışları, səlahiyyət səviyyəsi            |
| `workflow.js`   | Mərhələlər, rollar, keçid şərtləri                                       |
| `fx.js`         | Valyuta çevrilməsi — təhlil manatla aparılır                             |
| `analyse.js`    | Hamısını bir yerə yığır                                                  |

Bir neçə qərar ayrıca izah tələb edir:

**Düzəlişlər gizli deyil.** SME-də rəsmi hesabat çox vaxt tam mənzərəni
göstərmir. Uçota düşməyən dövriyyə ayrıca sahədir və mənfəətə **bütöv yox, rəsmi
marja ilə** çevrilir — bütün nağd satışı mənfəət saymaq bu təhlildə ən çox rast
gəlinən səhvdir. Sahibkarın şəxsi xərci və birdəfəlik maddələr də ayrıca durur ki,
komitə düzəlişin özünü mübahisə edə bilsin.

**DSCR ümumi borc xidmətinə görə ölçülür.** Limit hesablanarkən əvvəlcə icazə
verilən ümumi xidmət tapılır (pul axını ÷ hədəf DSCR), mövcud öhdəliklər ondan
çıxılır, qalan yeni kreditə qalır. Mövcud borcu nəzərə almadan bölmək DSCR-i
hədəfin altına salır.

**Limit üç məhdudiyyətin ən kiçiyidir** — pul axını, girov, dövriyyə. Hansının
bağlayıcı olduğu ekranda göstərilir, çünki müştəriyə "niyə bu qədər?" sualının
cavabı elə odur.

**Girovu bazar dəyəri yox, likvid dəyər ölçür.** Depozit demək olar tam sayılır
(95%), dövriyyədəki mal isə 30% — problem anında o mal çox vaxt yarı qiymətə də
satılmır. İkinci növbəli ipoteka yarıya endirilir.

**Məlumatı olmayan amil sıfır bal almır** — çəkisi ümumi cəmdən çıxarılır və
"məlumatın doldurulması" faizi ayrıca göstərilir. Əks halda "bilmirik" ilə
"pisdir" eyni nəticəni verərdi.

**Sistem imtina etmir.** Siyasət yoxlanışı yalnız nəyin danışılmadığını göstərir;
dayandırıcı tapıntı komitənin istisna qərarını tələb edir, qərarı isə adam verir.

**Reytinqi dəyişmək olar, izsiz yox.** Düzəliş yazılı əsaslandırma tələb edir,
modelin öz sinfi yadda qalır və düzəliş qərar jurnalına düşür.

---

## Valyuta və rəqəm formatı

Təhlil manatla aparılır: pul axını manatla gəlir, ona görə başqa valyutadakı
kredit əvvəlcə çevrilir (`fx.js`), sonra DSCR və girov örtüyü hesablanır.
Məzənnə konfiqurasiya dəyəridir — real qurulumda Mərkəzi Bankın günlük
məzənnəsindən oxunmalıdır.

Rəqəm formatı `Intl`-ə tapşırılmayıb. Brauzerlərin bir hissəsi `az-AZ` üçün tam
ICU məlumatı daşımır və `1 245 000` əvəzinə `1,245,000` yazır; eyni memorandumun
iki kompüterdə fərqli görünməsi maliyyə sənədində qəbul edilməzdir. Yuvarlaqlaşdırma
da açıq yazılıb — `toFixed` ikilik sürüşmə səbəbindən 1.345-i 1.34 kimi verir.

---

## Quruluş

```
src/
  main.jsx           provayderlər
  App.jsx            qabıq: başlıq, rol seçimi, dil
  domain/            bütün hesablama və nümunə portfel
  screens/           portfel, yeni müraciət, iş faylı (8 bölmə)
  components/        ui, forma sahələri, siyasət siyahısı
  state/store.jsx    reducer + localStorage
  i18n/              az (əsas), en + açar bərabərliyini yoxlayan test
  lib/               format, hash marşrutlaşdırıcı
```

Üç qayda:

1. **Ekranlar hesablamır.** Rəqəmlər `domain/`-dən gəlir.
2. **Mətn kodda yazılmır.** Hər sətir tərcümə açarıdır; siyasət tapıntısı da
   mətn yox, kod və parametr saxlayır — həmin cümlə hər iki dildə düzgün qurulur.
3. **Vəziyyət bir yerdədir.** `state/store.jsx`, versiyalı saxlama ilə.

---

## Testlər

169 test: hesablama məntiqi (annuitet, DSCR, limit, skorkart, siyasət, girov),
reducer, marşrutlaşdırıcı, format, lüğət bərabərliyi və ekranlar (axtarış,
balans yoxlanışının canlı yenilənməsi, rolun icazələri, reytinq düzəlişinin
əsaslandırma tələbi).

Nümunə portfelin **hər balansı quruluşca bağlanır** və bu ayrıca test edilir —
təhlilin nümunə məlumat üzərində "işləyir kimi" görünməsi kifayət deyil.

---

## Nümunə portfel

Altı iş: güclü istehsalçı, sabit emal müəssisəsi, mövsümi aqro müraciəti
(güzəşt dövrü ilə), iki sərhəd halı və qəsdən problemli tikinti şirkəti —
mənfi kapital, cari gecikmə, valyuta uyğunsuzluğu və üç ildir azalan satışla.
Sistem yalnız yaxşı müştəridə deyil, pis müştəridə də düzgün davranmalıdır.

Nümunə məlumatı istənilən vaxt bərpa etmək olar: portfel ekranında
**"Nümunə məlumatı bərpa et"**.
