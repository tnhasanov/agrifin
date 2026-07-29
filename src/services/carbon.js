export const CARBON = {
  capturedTonnes: 12.4,
  creditsReady: 9,
  pricePerCredit: 40,
};

export const carbonPayout = ({ creditsReady, pricePerCredit } = CARBON) =>
  creditsReady * pricePerCredit;

export const PRACTICES = [
  { id: "coverCrops", labelKey: "practice.coverCrops", verified: true },
  { id: "noTill", labelKey: "practice.noTill", verified: true },
  { id: "reducedN", labelKey: "practice.reducedN", verified: false },
];
