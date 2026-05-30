export const PRICE_TO_CREDITS: Record<string, number> = {
  STRIPE_PRICE_REPORT_100: 2,
  STRIPE_PRICE_REPORT_250: 6,
  STRIPE_PRICE_REPORT_500: 6,
  STRIPE_PRICE_REPORT_1000: 6,
  STRIPE_PRICE_SOLO: 10,
  STRIPE_PRICE_GROWTH: 40,
  STRIPE_PRICE_BRAND: 40,
  STRIPE_PRICE_AGENCY: 40,
};

export function creditsForPriceId(priceId?: string | null) {
  if (!priceId) return 0;

  const match = Object.entries(PRICE_TO_CREDITS).find(([envName]) => process.env[envName] === priceId);
  return match ? match[1] : 0;
}
