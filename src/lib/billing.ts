export const PRICE_TO_CREDITS: Record<string, number> = {
  STRIPE_PRICE_REPORT_100: 1,
  STRIPE_PRICE_REPORT_250: 2,
  STRIPE_PRICE_REPORT_500: 3,
  STRIPE_PRICE_REPORT_1000: 5,
  STRIPE_PRICE_SOLO: 3,
  STRIPE_PRICE_GROWTH: 12,
  STRIPE_PRICE_BRAND: 35,
  STRIPE_PRICE_AGENCY: 35,
};

export function creditsForPriceId(priceId?: string | null) {
  if (!priceId) return 0;

  const match = Object.entries(PRICE_TO_CREDITS).find(([envName]) => process.env[envName] === priceId);
  return match ? match[1] : 0;
}
