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
  starter: { label: "100 reviews", reviews: 100, credits: 1, price: 19 },
  growth: { label: "250 reviews", reviews: 250, credits: 2, price: 39 },
  pro: { label: "500 reviews", reviews: 500, credits: 4, price: 79 },
  market: { label: "1,000 reviews", reviews: 1000, credits: 7, price: 129 },
};
