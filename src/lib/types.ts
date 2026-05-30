export type ReviewTier = "starter" | "growth" | "pro" | "market";

export type ReviewRecord = {
  rating: number;
  title?: string;
  body: string;
  date?: string;
  verified?: boolean;
  helpfulVotes?: number;
  variant?: string;
};

export type InsightReport = {
  id: string;
  productUrl: string;
  productName: string;
  requestedReviewCount?: number;
  reviewCount: number;
  tier: ReviewTier;
  generatedAt: string;
  demoMode: boolean;
  executiveSummary: string;
  topCompliments: string[];
  topComplaints: string[];
  commonPhrases: string[];
  productImprovements: string[];
  positioningAngles: string[];
  marketingCopyIdeas: string[];
  ratingBreakdown: {
    average: number;
    positivePercent: number;
    neutralPercent: number;
    negativePercent: number;
  };
};

export const REVIEW_TIERS: Record<
  ReviewTier,
  { label: string; reviews: number; credits: number; price: number }
> = {
  starter: { label: "Quick Signal", reviews: 100, credits: 1, price: 19 },
  growth: { label: "Deep Signal Attempt", reviews: 250, credits: 2, price: 49 },
  pro: { label: "Listing Gap Report", reviews: 250, credits: 3, price: 79 },
  market: { label: "Market Scan", reviews: 500, credits: 5, price: 99 },
};
