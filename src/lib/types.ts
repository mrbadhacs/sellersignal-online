export type ReviewTier = "free" | "starter" | "growth" | "pro" | "market";

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
  free: { label: "Free Teaser", reviews: 1, credits: 0, price: 0 },
  starter: { label: "Full Signal Report", reviews: 100, credits: 1, price: 0 },
  growth: { label: "Full Signal Report", reviews: 100, credits: 1, price: 0 },
  pro: { label: "Full Signal Report", reviews: 100, credits: 1, price: 0 },
  market: { label: "Full Signal Report", reviews: 100, credits: 1, price: 0 },
};
