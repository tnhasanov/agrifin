export const CROP_PRICES = [
  {
    id: "wheat",
    nameKey: "crop.wheat",
    price: 360,
    change: 2.4,
    points: [320, 326, 323, 336, 347, 342, 360],
  },
  {
    id: "apple",
    nameKey: "crop.apple",
    price: 1090,
    change: 0.8,
    points: [1037, 1046, 1057, 1051, 1071, 1078, 1090],
  },
  {
    id: "barley",
    nameKey: "crop.barley",
    price: 300,
    change: -1.1,
    points: [313, 310, 311, 306, 303, 304, 300],
  },
];

export const SELL_WINDOW = {
  headlineKey: "market.forecastHeadline",
  bodyKey: "market.forecastBody",
};

export const BUYER_OFFERS = [
  { id: "shirvan", price: 370 },
  { id: "khazar", price: 365 },
].map((offer) => ({
  ...offer,
  nameKey: `buyer.${offer.id}.name`,
  descKey: `buyer.${offer.id}.desc`,
  badgeKey: `buyer.${offer.id}.badge`,
}));
