// Yollar dilə bağlı deyil — link paylaşıldıqda dil dəyişsə də işləyir.
//
// NAVİQASİYA DÜZ DÖRD YERDİR: Ana səhifə, Sahələr, Maliyyə, Kömək.
// Kredit mərkəzli pilotda bazar/karbon əsas naviqasiya ilə yarışmamalıdır —
// onlar `navda:false` ilə gizlədilir, amma YOLLARI YAŞAYIR: paylaşılmış
// köhnə linklər (deep link) və brauzerin "geri"si qırılmır.
export const ROUTES = [
  { id: "home", path: "/", labelKey: "nav.home", icon: "Home" },
  { id: "sahe", path: "/fields", labelKey: "nav.fields", icon: "Sprout" },
  { id: "money", path: "/money", labelKey: "nav.money", icon: "Wallet" },
  { id: "advisor", path: "/advisor", labelKey: "nav.advisor", icon: "HelpCircle" },
  { id: "market", path: "/market", labelKey: "nav.market", icon: "BarChart3", navda: false },
  { id: "carbon", path: "/carbon", labelKey: "nav.carbon", icon: "Leaf", navda: false },
];

/** Alt naviqasiyada görünən yollar — düz 4 (bax: components/BottomNav) */
export const NAV_ROUTES = ROUTES.filter((route) => route.navda !== false);

export const HOME_ROUTE = ROUTES[0];

export const routeForPath = (path) => ROUTES.find((route) => route.path === path) ?? HOME_ROUTE;

export const pathFor = (id) => ROUTES.find((route) => route.id === id)?.path ?? HOME_ROUTE.path;
