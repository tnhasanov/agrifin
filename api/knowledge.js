// ==========================================================================
// AgriFin — Aqronomik bilik bazası (Azərbaycan)
//
// TƏYİNAT: Söhbət botuna yerli kontekst vermək. Yalnız aşağıdakılar var:
//   - fenoloji mərhələlər və vaxtlar (rayon/iqlim zonasına görə təxmini)
//   - hər mərhələdə görülən əsas işlər
//   - yayılmış xəstəlik/zərərverici ƏLAMƏTLƏRİ (diaqnoz üçün)
//   - Azərbaycan dilində aqronomik terminlər
//
// BURADA OLMAYAN VƏ OLMAMALI OLAN:
//   - preparat (pestisid) adları
//   - dozalar, norma, qarışıq resepti
//   Səbəb: Azərbaycanda yalnız dövlət qeydiyyatına alınmış preparatların
//   satışı və istifadəsi qanunidir. Rəsmi siyahı AQTA-dadır (afsa.gov.az).
//   Bu siyahı əldə edilib strukturlaşdırılana qədər bot preparat adı və doza
//   verməməlidir. Bunun yerinə: problemi adlandır, prinsipi izah et,
//   AQTA reyestrinə / dilerə / aqronoma yönləndir.
//
// STATUS: aqronom tərəfindən hələ YOXLANMAMIŞ. İstifadəyə verilməzdən əvvəl
// bir dəfə peşəkar baxışdan keçirilməlidir. Hər bitkidə `yoxlanildi: false`.
// ==========================================================================

export const IQLIM_ZONALARI = {
  aran: {
    ad: "Aran (düzənlik)",
    rayonlar: ["Bərdə", "Ağdam", "Ağcabədi", "Beyləqan", "İmişli", "Sabirabad",
               "Saatlı", "Kürdəmir", "Zərdab", "Ucar", "Yevlax", "Hacıqabul",
               "Şirvan", "Salyan", "Neftçala", "Biləsuvar", "Mingəçevir"],
    qeyd: "İsti, quraq yaz-yay. Suvarma vacibdir. Yaz tez başlayır.",
  },
  daglik_qerb: {
    ad: "Qərb və dağətəyi",
    rayonlar: ["Gəncə", "Goranboy", "Samux", "Şəmkir", "Tovuz", "Qazax"],
    qeyd: "Mülayim. Bağçılıq və taxıl. Yaz Arandan 1–2 həftə gec.",
  },
  seki_zaqatala: {
    ad: "Şəki–Zaqatala",
    rayonlar: ["Şəki", "Qax", "Zaqatala", "Balakən", "Oğuz", "Qəbələ"],
    qeyd: "Rütubətli. Fındıq, tütün, taxıl. Göbələk xəstəlikləri riski yüksək.",
  },
  quba_xacmaz: {
    ad: "Quba–Xaçmaz",
    rayonlar: ["Quba", "Qusar", "Xaçmaz", "Şabran", "Siyəzən"],
    qeyd: "Meyvəçilik zonası — alma, gilas. Yaz gec, payız uzun.",
  },
  lenkeran: {
    ad: "Lənkəran–Astara",
    rayonlar: ["Lənkəran", "Astara", "Masallı", "Cəlilabad", "Lerik", "Yardımlı"],
    qeyd: "Subtropik, rütubətli. Tərəvəz, çay, sitrus. İki əkin mümkündür.",
  },
  daglik: {
    ad: "Dağlıq",
    rayonlar: ["Şamaxı", "İsmayıllı", "Göyçay", "Ağdaş", "Naxçıvan", "Şərur", "Ordubad"],
    qeyd: "Üzüm, nar, dənli bitkilər. Yaz şaxtası riski.",
  },
};

export function zonaTap(rayonAd) {
  const təmiz = (rayonAd || "").replace(" (GPS)", "").trim();
  for (const [key, z] of Object.entries(IQLIM_ZONALARI)) {
    if (z.rayonlar?.includes(təmiz)) return { key, ...z };
  }
  return { key: "aran", ...IQLIM_ZONALARI.aran };
}

// --------------------------------------------------------------------------
// Bitkilər. `merhaleler` — ay nömrələri (1 = yanvar) Aran zonası üçün.
// Digər zonalarda 1–3 həftə fərq ola bilər; bot bunu nəzərə almalıdır.
// --------------------------------------------------------------------------

export const BITKILER = {
  bugda: {
    ad: "Payızlıq buğda",
    yoxlanildi: false,
    novler: "Yerli və introduksiya olunmuş payızlıq sortlar",
    merhaleler: [
      { ay: [10, 11], ad: "Səpin", isler: "Toxum yatağı hazırlığı, fosfor-kalium gübrəsi səpinlə birlikdə. Səpin dərinliyi 4–6 sm." },
      { ay: [11, 12], ad: "Cücərti və kollanma", isler: "Sıxlıq yoxlanışı, alaq nəzarəti planlaması. Gəmirici zərəri müşahidəsi." },
      { ay: [1, 2], ad: "Qış sükunəti", isler: "Su durğunluğunun qarşısının alınması. Drenaj yoxlanışı." },
      { ay: [2, 3], ad: "Kollanmanın bərpası", isler: "Yazlıq azot gübrəsinin əsas hissəsi. Alaqlara qarşı tədbir bu mərhələdə ən effektivdir." },
      { ay: [3, 4], ad: "Boruya çıxma", isler: "İkinci azot (lazım olarsa). Suvarma — quraqlıqda kritik. Xəstəlik müşahidəsi başlayır." },
      { ay: [4], ad: "Sünbülləmə", isler: "Pas və septorioz üçün ən kritik müşahidə dövrü. Sünə zərərvericisinə nəzarət." },
      { ay: [5], ad: "Dən dolması", isler: "Suvarma (varsa). Sünə ziyanı bu mərhələdə keyfiyyətə birbaşa təsir edir." },
      { ay: [6], ad: "Yetişmə və biçin", isler: "Rütubət 14%-ə düşəndə biçin. Gecikmə dən tökülməsinə səbəb olur." },
    ],
    problemler: [
      { ad: "Sarı pas", elametler: "Yarpaqda sarı-narıncı, cərgə şəklində düzülmüş toz halında ləkələr. Barmağa sarı toz yaxılır. Sərin və rütubətli yazda sürətlə yayılır." },
      { ad: "Qonur pas", elametler: "Yarpaq üzərində dağınıq, qonur-qəhvəyi qabarcıqlar. Sarı pasdan fərqli — cərgə düzümü yoxdur." },
      { ad: "Septorioz", elametler: "Aşağı yarpaqlardan başlayan boz-qonur, uzunsov ləkələr, mərkəzində qara nöqtələr. Rütubətli havada yuxarı yarpaqlara qalxır." },
      { ad: "Un şehi", elametler: "Yarpaq və gövdədə ağ, unvari örtük. Sonra bozlaşır." },
      { ad: "Sürmə", elametler: "Sünbüldə dən yerinə qara, iy verən toz kütləsi. Toxumla keçir — toxum mənşəyi kritikdir." },
      { ad: "Sünə (zərərverici)", elametler: "Sünbüldə boş və ya büzüşmüş dənlər. Dəndə iynə yeri boyda sancma nöqtəsi. Xəmirin keyfiyyətini pozur — satış qiymətinə birbaşa təsir." },
      { ad: "Taxıl biti (mənənə)", elametler: "Sünbül və yarpaqda kiçik yaşıl-qara həşəratlar, yapışqan ifrazat." },
      { ad: "Azot çatışmazlığı", elametler: "Aşağı yarpaqlar bərabər şəkildə açıq-yaşıl və ya saralır, bitki zəif kollanır." },
    ],
  },

  arpa: {
    ad: "Arpa",
    yoxlanildi: false,
    merhaleler: [
      { ay: [10, 11], ad: "Səpin", isler: "Buğdadan bir qədər tez səpilə bilər. Fosfor-kalium səpinlə." },
      { ay: [2, 3], ad: "Kollanma", isler: "Azot gübrəsi. Alaq nəzarəti." },
      { ay: [3, 4], ad: "Boruya çıxma", isler: "Suvarma. Xəstəlik müşahidəsi." },
      { ay: [4, 5], ad: "Sünbülləmə və dən dolması", isler: "Şəbəkəvi ləkəlilik və un şehi müşahidəsi." },
      { ay: [5, 6], ad: "Biçin", isler: "Buğdadan 1–2 həftə tez yetişir." },
    ],
    problemler: [
      { ad: "Şəbəkəvi ləkəlilik", elametler: "Yarpaqda qonur, şəbəkə naxışlı uzunsov ləkələr." },
      { ad: "Cırtdan pas", elametler: "Xırda, dağınıq qonur qabarcıqlar." },
      { ad: "Un şehi", elametler: "Ağ unvari örtük, xüsusən sıx əkinlərdə." },
    ],
  },

  qargidali: {
    ad: "Qarğıdalı",
    yoxlanildi: false,
    merhaleler: [
      { ay: [4], ad: "Səpin", isler: "Torpaq 10–12 °C olanda. Cərgə arası 70 sm." },
      { ay: [5], ad: "Cücərti və 3–5 yarpaq", isler: "İlk azot yemləməsi. Alaq nəzarəti kritik — qarğıdalı erkən alaqla rəqabətə həssasdır." },
      { ay: [6], ad: "İntensiv boy", isler: "İkinci azot. Suvarma başlayır." },
      { ay: [7], ad: "Sürgüc atma və çiçəkləmə", isler: "Suya ən həssas dövr — bu mərhələdə su stresi məhsulu ən çox azaldır." },
      { ay: [8], ad: "Dən dolması", isler: "Suvarmanın davamı. Sovka müşahidəsi." },
      { ay: [9, 10], ad: "Yetişmə və yığım", isler: "Dən rütubəti 20–25% olanda yığım." },
    ],
    problemler: [
      { ad: "Qarğıdalı sovkası", elametler: "Gənc yarpaqlarda deşiklər, qoltuqda nəcis qalıqları. Sonra qıjıda qurd." },
      { ad: "Kök və gövdə çürüməsi", elametler: "Bitki vaxtından əvvəl saralır, gövdə dibi yumşalır, bitki yatır." },
      { ad: "Su stresi (çiçəkləmədə)", elametler: "Yarpaqlar gündüz burulur, qıjıda dən sıraları natamam qalır." },
    ],
  },

  pambiq: {
    ad: "Pambıq",
    yoxlanildi: false,
    merhaleler: [
      { ay: [4], ad: "Səpin", isler: "Torpaq 14–16 °C. Aran zonasında aprelin ikinci yarısı." },
      { ay: [5], ad: "Cücərti və seyrəltmə", isler: "Sıxlıq tənzimlənməsi, ilk kultivasiya, alaq nəzarəti." },
      { ay: [6], ad: "Qönçələmə", isler: "Azot yemləməsi, suvarma başlayır. Mənənə müşahidəsi." },
      { ay: [7], ad: "Çiçəkləmə", isler: "Suya ən həssas dövr. Sovka və gənə müşahidəsi kritik." },
      { ay: [8], ad: "Qoza əmələgəlmə", isler: "Suvarmanın davamı, sonra tədricən azaldılır." },
      { ay: [9, 10], ad: "Yetişmə və yığım", isler: "Qozaların açılması. Yığım əl ilə və ya maşınla." },
    ],
    problemler: [
      { ad: "Pambıq sovkası", elametler: "Qönçə və qozalarda dairəvi deşiklər, içi yeyilmiş. Tökülmüş qönçələr." },
      { ad: "Mənənə", elametler: "Yarpaq altında sıx koloniyalar, yapışqan ifrazat, yarpaq burulması." },
      { ad: "Hörümçək gənəsi", elametler: "Yarpaq altında çox xırda hərəkət edən nöqtələr, nazik hörümçək toru, yarpaqda sarı-bürünc ləkələr. Quru və isti havada sürətlə artır." },
      { ad: "Soluxma (vilt)", elametler: "Bir tərəfli və ya tam soluxma, gövdə kəsiyində qonurlaşma. Torpaqla keçir." },
    ],
  },

  kartof: {
    ad: "Kartof",
    yoxlanildi: false,
    merhaleler: [
      { ay: [3, 4], ad: "Əkin", isler: "Cücərtili toxumluq. Dağlıq zonada aprel–may." },
      { ay: [5], ad: "Cücərti və dibçəkmə", isler: "İlk dibçəkmə, alaq nəzarəti. Kolorado böcəyi müşahidəsi başlayır." },
      { ay: [6], ad: "Çiçəkləmə", isler: "İkinci dibçəkmə, suvarma. Fitoftora üçün kritik müşahidə." },
      { ay: [7], ad: "Yumru əmələgəlmə", isler: "Suvarma rejimi sabit olmalı — dəyişkən rütubət yumruların çatlamasına səbəb olur." },
      { ay: [8, 9], ad: "Yetişmə və yığım", isler: "Gövdə quruduqdan 2 həftə sonra yığım. Anbar temperaturu 3–5 °C." },
    ],
    problemler: [
      { ad: "Fitoftora (gec ləkəlilik)", elametler: "Yarpaq kənarında sulu, tünd-qonur ləkələr, alt tərəfdə ağ kif. Rütubətli və sərin havada 3–4 gündə sahəni tuta bilir. Yumruda bərk qonur çürümə." },
      { ad: "Quru ləkəlilik", elametler: "Yarpaqda konsentrik dairəli qonur ləkələr, aşağıdan başlayır." },
      { ad: "Kolorado böcəyi", elametler: "Zolaqlı böcəklər və narıncı sürfələr, yarpaqlar tez yeyilir. Yarpaq altında narıncı yumurta topaları." },
      { ad: "Yumru çatlaması", elametler: "Qeyri-bərabər suvarmanın nəticəsi — yumruda dərin çatlar." },
    ],
  },

  pomidor: {
    ad: "Pomidor",
    yoxlanildi: false,
    merhaleler: [
      { ay: [2, 3], ad: "Şitil hazırlığı", isler: "İstixanada və ya tunelde şitil. 45–55 gün." },
      { ay: [4], ad: "Şitil əkini", isler: "Şaxta riski keçəndən sonra. Dayaq sisteminin qurulması." },
      { ay: [5], ad: "Boy və qoltuqalma", isler: "Müntəzəm qoltuqalma, ilk yemləmə. Damcı suvarma üstünlükdür." },
      { ay: [6], ad: "Çiçəkləmə və bar", isler: "Kalium yemləməsi. Ağ qanadlı və güvə müşahidəsi." },
      { ay: [6, 7, 8], ad: "Yığım", isler: "2–3 günlük aralarla yığım. Fitoftora riski rütubətli dövrdə artır." },
    ],
    problemler: [
      { ad: "Fitoftora", elametler: "Yarpaq və meyvədə sulu, tünd ləkələr, sürətlə yayılır. Rütubət və sərin gecələr riski artırır." },
      { ad: "Pomidor güvəsi", elametler: "Yarpaqda gümüşü, dəhliz şəklində yollar; meyvədə xırda giriş deşiyi və içində nəcis. Çox sürətlə çoxalır." },
      { ad: "Ağ qanadlı", elametler: "Yarpaq altında xırda ağ həşəratlar, silkələyəndə qalxır. Yapışqan ifrazat və his göbələyi." },
      { ad: "Meyvənin dib çürüməsi", elametler: "Meyvənin dibində quru, tünd, batıq ləkə. Xəstəlik deyil — kalsium mənimsənilməsi və qeyri-bərabər suvarma ilə bağlıdır." },
      { ad: "Yarpaq burulması", elametler: "Yuxarı yarpaqların yuxarıya burulması — istilik stresi və ya viral infeksiya ola bilər. Fərqləndirmə üçün baxış lazımdır." },
    ],
  },

  sogan: {
    ad: "Soğan",
    yoxlanildi: false,
    merhaleler: [
      { ay: [10, 11], ad: "Payız səpini", isler: "Payızlıq soğan üçün. Aran zonasında yaygın." },
      { ay: [2, 3], ad: "Yaz səpini / bərpa", isler: "Alaq nəzarəti — soğan alaqla rəqabətdə çox zəifdir." },
      { ay: [4, 5], ad: "Yarpaq boyu", isler: "Azot yemləməsi. Peronosporoz müşahidəsi rütubətli havada." },
      { ay: [5, 6], ad: "Baş bağlama", isler: "Suvarma tədricən azaldılır — çox su anbar davamlılığını pozur." },
      { ay: [6, 7], ad: "Yığım və qurutma", isler: "Boğaz yumşalanda yığım. Sahədə və ya kölgədə qurutma." },
    ],
    problemler: [
      { ad: "Peronosporoz", elametler: "Yarpaqda solğun-yaşıl uzunsov sahələr, üzərində boz-bənövşəyi kif. Rütubətli səhərlərdə görünür." },
      { ad: "Soğan milçəyi", elametler: "Gənc bitki saralır və asanlıqla çıxır; kökdə ağ sürfələr." },
      { ad: "Boyun çürüməsi (anbarda)", elametler: "Anbarda boğaz hissədən başlayan yumşaq çürümə, boz kif." },
    ],
  },

  uzum: {
    ad: "Üzüm",
    yoxlanildi: false,
    merhaleler: [
      { ay: [2, 3], ad: "Budama", isler: "Sükunət dövründə budama. Kəsik yerlərinin qorunması." },
      { ay: [4], ad: "Gözlərin açılması", isler: "Yaz şaxtası riski — kritik. Torpaq işləmə və gübrələmə." },
      { ay: [5], ad: "Zoğ boyu", isler: "Mildiu üçün ilk kritik dövr — rütubətli yazda müşahidə sıxlaşdırılır. Zoğ bağlama." },
      { ay: [6], ad: "Çiçəkləmə", isler: "Ən həssas mərhələ. Çiçəkləmə zamanı yağış məhsulu ciddi azaldır." },
      { ay: [6, 7], ad: "Giləmeyvə böyüməsi", isler: "Oidium müşahidəsi. Yarpaq idarəsi — hava dövranı vacibdir." },
      { ay: [8, 9], ad: "Yetişmə", isler: "Suvarma azaldılır. Boz çürümə riski yağışdan sonra artır." },
      { ay: [9, 10], ad: "Məhsul yığımı", isler: "Şəkərlilik ölçülərək yığım vaxtı təyin edilir." },
    ],
    problemler: [
      { ad: "Mildiu (yalançı un şehi)", elametler: "Yarpaq üzündə yağlı, sarımtıl ləkələr; alt tərəfdə ağ kif. Rütubətli, ilıq havada sürətlə yayılır. Salxımda qonurlaşma və quruma." },
      { ad: "Oidium (həqiqi un şehi)", elametler: "Yarpaq və salxımda boz-ağ unvari örtük, kif iyi. Quru və isti havada da inkişaf edir — mildiudan bu ilə fərqlənir. Giləmeyvələr çatlayır." },
      { ad: "Boz çürümə", elametler: "Yetişmə dövründə giləmeyvələrdə qəhvəyi yumşaq çürümə, üzərində boz tozlu kif. Yağışdan sonra sürətlənir." },
      { ad: "Yaz şaxtası zədəsi", elametler: "Açılmış gözlər və gənc zoğlar qaralır, əzilmiş görünür." },
    ],
  },

  alma: {
    ad: "Alma",
    yoxlanildi: false,
    merhaleler: [
      { ay: [1, 2], ad: "Budama", isler: "Sükunət dövründə formalaşdırıcı budama. Xəstə budaqların çıxarılması." },
      { ay: [3, 4], ad: "Tumurcuq açılması", isler: "Qara xal üçün ilk kritik dövr. Yaz şaxtası müşahidəsi." },
      { ay: [4, 5], ad: "Çiçəkləmə", isler: "Tozlandırıcı arı fəaliyyəti — bu dövrdə kimyəvi müdaxilədən çəkinmək prinsipi. Bakterial yanıq riski." },
      { ay: [5, 6], ad: "Meyvə bağlama və seyrəltmə", isler: "Meyvə seyrəltmə — ölçü və növbəti il barvermə üçün vacibdir. Meyvəyeyən müşahidəsi (feromon tələ)." },
      { ay: [6, 7, 8], ad: "Meyvə böyüməsi", isler: "Suvarma rejimi. Kalium yemləməsi. İkinci nəsil meyvəyeyən." },
      { ay: [8, 9, 10], ad: "Yetişmə və yığım", isler: "Sorta görə yığım. Anbar üçün nişasta testi." },
    ],
    problemler: [
      { ad: "Qara xal (parşa)", elametler: "Yarpaqda zeytunu-qara, məxməri ləkələr; meyvədə qara, çatlamış qabıqlı ləkələr. Yaz yağışları ilə birbaşa əlaqəli." },
      { ad: "Un şehi", elametler: "Gənc yarpaq və zoğlarda ağ unvari örtük, yarpaq burulur və daralır." },
      { ad: "Alma meyvəyeyəni", elametler: "Meyvədə xırda giriş deşiyi, ətrafında nəcis; içərisində yol və qurd. Meyvə vaxtından əvvəl tökülür." },
      { ad: "Bakterial yanıq", elametler: "Zoğ ucları qəfil qaralır, çəngəl kimi aşağı qatlanır; yarpaqlar qaralmış halda budaqda qalır. Yayılma sürətlidir — dərhal peşəkar baxış tələb edir." },
      { ad: "Dəmir çatışmazlığı", elametler: "Gənc yarpaqlar damarlar arası saralır, damarlar yaşıl qalır. Əhəngli torpaqlarda tipikdir." },
    ],
  },

  findiq: {
    ad: "Fındıq",
    yoxlanildi: false,
    merhaleler: [
      { ay: [1, 2], ad: "Tozlanma", isler: "Sükunətdə tozlanma baş verir. Budama və kök pöhrələrinin təmizlənməsi." },
      { ay: [3, 4], ad: "Yarpaqlanma", isler: "Gübrələmə. Gənə (böyük tumurcuq) müşahidəsi." },
      { ay: [5, 6], ad: "Ləpə formalaşması", isler: "Fındıq qurdu üçün kritik dövr — bu mərhələdə zərər birbaşa boş fındıq deməkdir. Suvarma (varsa)." },
      { ay: [7, 8], ad: "Ləpə dolması", isler: "Su stresi ləpə çəkisini azaldır. Alaq və pöhrə nəzarəti." },
      { ay: [8, 9], ad: "Yığım", isler: "Təbii tökülmə başlayanda yığım. Tez qurutma — kif riskinin azaldılması üçün kritik." },
    ],
    problemler: [
      { ad: "Fındıq qurdu (filizyeyən)", elametler: "Fındıqda dairəvi kiçik deşik, içi boş və ya nəcislə dolu. Yığımda boş qabıq faizi yüksək." },
      { ad: "Böyük tumurcuq gənəsi", elametler: "Tumurcuqlar normaldan 3–4 dəfə böyüyür, açılmır və qurumuş halda qalır." },
      { ad: "Monilia (çürümə)", elametler: "Gənc zoğ və salxımlarda qəfil quruma, qonurlaşma. Rütubətli yazda." },
      { ad: "Anbarda kiflənmə", elametler: "Gec və ya natamam qurutmadan sonra kif iyi, rəng dəyişməsi. Satış keyfiyyətini və qiymətini ciddi düşürür." },
    ],
  },
};

// --------------------------------------------------------------------------
// Ümumi aqronomik prinsiplər — preparat adı olmadan, təhlükəsiz məzmun
// --------------------------------------------------------------------------

export const PRINSIPLER = `
GÜBRƏLƏMƏ
- Fosfor və kalium səpin/əkinlə birlikdə, çünki torpaqda az hərəkət edirlər.
- Azot bölünərək verilir: bir hissə erkən boy, bir hissə intensiv boy mərhələsində.
- Yağışdan və ya güclü suvarmadan dərhal ƏVVƏL səthə azot vermək itki deməkdir
  (yuyulma və buxarlanma). Prinsip: azotu torpağa qarışdır və ya yağış
  gözləntisi olmayan dövrdə ver.
- Torpaq analizi olmadan verilən gübrə təxmindir. 3–5 ildə bir analiz tövsiyə olunur.

SUVARMA
- Ən kritik dövrlər: çiçəkləmə və dən/meyvə dolması. Bu mərhələlərdə su stresi
  məhsul itkisinin ən böyük hissəsini yaradır.
- Qeyri-bərabər suvarma çatlama (kartof, pomidor) və keyfiyyət problemi yaradır.
- Damcı suvarma səthi suvarmaya nisbətən 30–50% su qənaəti verir və yarpağı
  quru saxladığı üçün göbələk xəstəliyi riskini azaldır.

XƏSTƏLİK VƏ ZƏRƏRVERİCİ MƏNTİQİ
- Göbələk xəstəlikləri rütubət + uyğun temperatur tələb edir. Yağışdan sonrakı
  2–5 gün əksər göbələk xəstəlikləri üçün ən riskli dövrdür.
- Profilaktika müalicədən effektivlidir: xəstəlik görünəndən sonra müdaxilə
  yayılmanı dayandırır, itirilmiş məhsulu qaytarmır.
- Növbəli əkin torpaqla keçən xəstəliklərin əsas nəzarət üsuludur.
- Sıx əkin və zəif hava dövranı göbələk riskini artırır.

DİAQNOZ MƏNTİQİ
- Bərabər saralma (bütün bitki, aşağıdan) → çox vaxt qida çatışmazlığı.
- Ləkəli/nöqtəli zədə → çox vaxt xəstəlik.
- Deşik, yeyilmə, ifrazat → zərərverici.
- Bir sahədə ocaqlı yayılma → torpaqla keçən problem və ya suvarma qüsuru.
- Peyk NDVI-də zonal düşmə → suvarma qüsuru, torpaq fərqi və ya ocaqlı xəstəlik.
`;

// --------------------------------------------------------------------------
// Terminlər (bot cavablarında fermerin işlətdiyi dili qorumaq üçün)
// --------------------------------------------------------------------------

export const TERMINLER = `
kollanma = tillering | boruya çıxma = stem elongation | sünbülləmə = heading
dən dolması = grain filling | qönçələmə = squaring (pambıq)
dibçəkmə = hilling (kartof) | qoltuqalma = de-suckering (pomidor)
seyrəltmə = thinning | növbəli əkin = crop rotation | yemləmə = top-dressing
pas = rust | un şehi = powdery mildew | mildiu = downy mildew
fitoftora = late blight | parşa / qara xal = scab | soluxma = wilt
mənənə = aphid | gənə = mite | sovka = noctuid larva | güvə = moth
ağ qanadlı = whitefly | sünə = sunn pest
`;

// --------------------------------------------------------------------------
// Bota veriləcək konteksti yığır — yalnız lazım olan bitki bloku
// --------------------------------------------------------------------------

export function kontekstQur({ bitkiKey, rayon, ay, hava, ndvi, sahe, havaDeqiq }) {
  const zona = zonaTap(rayon);
  const b = BITKILER[bitkiKey];

  let mətn = `FERMERİN KONTEKSTİ\n`;
  mətn += `Rayon: ${rayon || "bilinmir"} | İqlim zonası: ${zona.ad} — ${zona.qeyd}\n`;
  mətn += `Cari ay: ${ay}\n`;

  // Ölçü tövsiyənin praktikliyini dəyişir: 0.5 ha-da bir baxış kifayətdir,
  // 12 ha-da fermerə neçə yerdən yoxlamalı olduğunu demək lazımdır.
  if (sahe?.hektar) mətn += `Sahənin ölçüsü: ${sahe.hektar} ha\n`;

  if (hava) {
    mətn += `Hava (7 gün): maks ${hava.maxTemp}°C, cəmi yağış ${hava.yagis} mm, `;
    mətn += `su balansı (ET0 − yağış) ${hava.balans} mm\n`;
    // Model uydurma dəqiqlik iddia etməməlidir — mənbəni bilməlidir
    mətn += havaDeqiq
      ? `(hava proqnozu fermerin öz sahəsinin koordinatı üçündür)\n`
      : `(hava proqnozu rayon mərkəzi üçündür — sahə bir neçə km uzaq ola bilər)\n`;
  }
  if (ndvi != null) mətn += `Sahənin cari NDVI: ${ndvi}\n`;

  if (b) {
    mətn += `\nBİTKİ: ${b.ad}\n`;
    const cari = b.merhaleler.filter((m) => m.ay.includes(ay));
    const yaxin = b.merhaleler.filter((m) => m.ay.includes(ay === 12 ? 1 : ay + 1));

    if (cari.length) {
      mətn += `Cari mərhələ(lər): ${cari.map((m) => `${m.ad} — ${m.isler}`).join(" / ")}\n`;
    }
    if (yaxin.length) {
      mətn += `Növbəti ay: ${yaxin.map((m) => m.ad).join(", ")}\n`;
    }
    mətn += `\nBu bitkidə yayılmış problemlərin ƏLAMƏTLƏRİ:\n`;
    mətn += b.problemler.map((p) => `- ${p.ad}: ${p.elametler}`).join("\n");
  } else {
    mətn += `\nBitki seçilməyib. Fermerdən hansı bitki olduğunu soruş.\n`;
    mətn += `Mövcud bitkilər: ${Object.values(BITKILER).map((x) => x.ad).join(", ")}\n`;
  }

  mətn += `\n\nÜMUMİ PRİNSİPLƏR${PRINSIPLER}`;
  mətn += `\nTERMİNLƏR${TERMINLER}`;

  return mətn;
}

export const BITKI_SECIMI = Object.entries(BITKILER).map(([key, v]) => ({
  key,
  ad: v.ad,
}));
