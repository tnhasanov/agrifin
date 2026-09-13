// Yollar dilə bağlı deyil — link paylaşıldıqda dil dəyişsə də işləyir.
//
// NAVİQASİYA BEŞ YERDİR: Ana səhifə, Sahələr, Bazar, Maliyyə, Kömək.
// Bazar tətbiqin TİCARƏT QATIDIR (ehtiyac → məhsul → maliyyə → sifariş →
// biçin → ödəniş), ona görə əsas naviqasiyadadır. Köhnə `/market` (nümunə
// qiymətlər, alıcı təklifləri) və `/carbon` gizlidir (`navda:false`), amma
// YOLLARI YAŞAYIR: paylaşılmış köhnə linklər və brauzerin "geri"si qırılmır.
//
// PREFİKS YOLLAR: bazarın alt-səhifələri (`/bazar/mehsul/<kod>`, `/bazar/sebet`)
// eyni ekrana düşür — ekran öz alt-yolunu özü oxuyur (bax: screens/BazarScreen).
// Dərin link və "geri" düyməsi hər alt-səhifə üçün işləyir.
export const ROUTES = [
  { id: "home", path: "/", labelKey: "nav.home", icon: "Home" },
  { id: "sahe", path: "/fields", labelKey: "nav.fields", icon: "Sprout" },
  { id: "bazar", path: "/bazar", labelKey: "nav.bazar", icon: "Store", prefiks: true },
  { id: "money", path: "/money", labelKey: "nav.money", icon: "Wallet" },
  { id: "advisor", path: "/advisor", labelKey: "nav.advisor", icon: "HelpCircle" },
  { id: "market", path: "/market", labelKey: "nav.market", icon: "BarChart3", navda: false },
  { id: "carbon", path: "/carbon", labelKey: "nav.carbon", icon: "Leaf", navda: false },
];

/** Alt naviqasiyada görünən yollar — düz 5 (bax: components/BottomNav) */
export const NAV_ROUTES = ROUTES.filter((route) => route.navda !== false);

export const HOME_ROUTE = ROUTES[0];

/** Yol bu marşruta aiddirmi — dəqiq və ya (prefiks marşrutda) alt-yol */
export const routeMatches = (route, path) =>
  route.path === path || (route.prefiks === true && path.startsWith(`${route.path}/`));

export const routeForPath = (path) => ROUTES.find((route) => routeMatches(route, path)) ?? HOME_ROUTE;

export const pathFor = (id) => ROUTES.find((route) => route.id === id)?.path ?? HOME_ROUTE.path;
