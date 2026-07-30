// Yollar dilə bağlı deyil — link paylaşıldıqda dil dəyişsə də işləyir.
export const ROUTES = [
  { id: "home", path: "/", labelKey: "nav.home", icon: "Home" },
  { id: "advisor", path: "/advisor", labelKey: "nav.advisor", icon: "Sprout" },
  { id: "money", path: "/money", labelKey: "nav.money", icon: "Wallet" },
  { id: "market", path: "/market", labelKey: "nav.market", icon: "BarChart3" },
  { id: "carbon", path: "/carbon", labelKey: "nav.carbon", icon: "Leaf" },
];

export const HOME_ROUTE = ROUTES[0];

export const routeForPath = (path) => ROUTES.find((route) => route.path === path) ?? HOME_ROUTE;

export const pathFor = (id) => ROUTES.find((route) => route.id === id)?.path ?? HOME_ROUTE.path;
