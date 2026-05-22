import { InsightReport, ReviewTier, REVIEW_TIERS } from "./types";

export function createDemoReport(productUrl: string, tier: ReviewTier): InsightReport {
  const selected = REVIEW_TIERS[tier];

  return {
    id: crypto.randomUUID(),
    productUrl,
    productName: "Competitor product intelligence sample",
    requestedReviewCount: selected.reviews,
    reviewCount: selected.reviews,
    tier,
    generatedAt: new Date().toISOString(),
    demoMode: true,
    executiveSummary:
      "Customers praise the product when it feels premium on arrival, solves the core job quickly, and includes clear setup instructions. The biggest opportunities are durability, confusing sizing or compatibility details, slow customer support, and expectation gaps between listing copy and the delivered item.",
    topCompliments: [
      "Easy first-use experience with little setup friction.",
      "Packaging and presentation make the product feel giftable.",
      "Customers mention strong value when the product performs as shown.",
      "Repeat buyers like consistent availability and fast delivery.",
    ],
    topComplaints: [
      "Durability concerns after several weeks of use.",
      "Sizing, fit, or compatibility expectations are unclear.",
      "Instructions do not answer edge cases or troubleshooting questions.",
      "Some customers feel listing images overpromise the final quality.",
    ],
    commonPhrases: [
      "works as expected",
      "easy to use",
      "not worth the money",
      "stopped working",
      "great customer service",
      "would buy again",
    ],
    productImprovements: [
      "Add a clearer fit/compatibility checker near the buy box.",
      "Improve materials or reinforce the highest-failure component.",
      "Include a one-page quick-start guide with troubleshooting paths.",
      "Use listing images that show scale, texture, and real-world use.",
    ],
    positioningAngles: [
      "Position against the competitor on reliability and support.",
      "Lead with proof that the product performs after repeated use.",
      "Use comparison copy around clarity: fewer surprises, better fit.",
    ],
    marketingCopyIdeas: [
      "Built for the second month, not just the unboxing.",
      "Clear setup, confident fit, no guesswork.",
      "Premium where customers actually feel it.",
    ],
    ratingBreakdown: {
      average: 4.1,
      positivePercent: 72,
      neutralPercent: 11,
      negativePercent: 17,
    },
  };
}
