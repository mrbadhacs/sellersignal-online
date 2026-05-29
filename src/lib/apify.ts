import { ApifyClient } from "apify-client";
import { ReviewRecord } from "./types";

const DEFAULT_ACTOR_ID = "automation-lab/amazon-reviews-scraper";
const ACTOR_MAX_REVIEWS_PER_RUN = 100;
const REVIEW_PASSES = [
  { sort: "recent", filterByStars: "all" },
  { sort: "helpful", filterByStars: "all" },
  { sort: "helpful", filterByStars: "critical" },
  { sort: "recent", filterByStars: "critical" },
  { sort: "helpful", filterByStars: "positive" },
  { sort: "recent", filterByStars: "positive" },
  { sort: "helpful", filterByStars: "one_star" },
  { sort: "helpful", filterByStars: "two_star" },
  { sort: "helpful", filterByStars: "three_star" },
  { sort: "helpful", filterByStars: "four_star" },
  { sort: "helpful", filterByStars: "five_star" },
  { sort: "recent", filterByStars: "one_star" },
  { sort: "recent", filterByStars: "two_star" },
  { sort: "recent", filterByStars: "three_star" },
  { sort: "recent", filterByStars: "four_star" },
  { sort: "recent", filterByStars: "five_star" },
] as const;

function extractAsin(input: string) {
  const trimmed = input.trim();
  const direct = trimmed.match(/^[A-Z0-9]{10}$/i)?.[0];
  if (direct) return direct.toUpperCase();

  const patterns = [
    /\/dp\/([A-Z0-9]{10})/i,
    /\/gp\/product\/([A-Z0-9]{10})/i,
    /\/product\/([A-Z0-9]{10})/i,
    /\/product-reviews\/([A-Z0-9]{10})/i,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1].toUpperCase();
  }

  throw new Error("Paste a valid Amazon.com product URL or ASIN.");
}

export async function scrapeAmazonReviews(productUrl: string, maxReviews: number) {
  if (!process.env.APIFY_API_TOKEN) {
    throw new Error("APIFY_API_TOKEN is not configured.");
  }

  const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
  const asin = extractAsin(productUrl);
  const actorId = process.env.APIFY_ACTOR_ID || DEFAULT_ACTOR_ID;
  const normalizedProductUrl = `https://www.amazon.com/dp/${asin}`;

  const reviewMap = new Map<string, ReviewRecord>();
  let productName = `Amazon ASIN ${asin}`;

  for (const pass of REVIEW_PASSES) {
    if (reviewMap.size >= maxReviews) break;

    const remaining = maxReviews - reviewMap.size;
    const runLimit = Math.min(remaining, ACTOR_MAX_REVIEWS_PER_RUN);
    const run = await client.actor(actorId).call({
      productUrls: [normalizedProductUrl],
      asins: [asin],
      marketplace: "US",
      country: "amazon.com",
      maxReviews: runLimit,
      maxReviewsPerProduct: runLimit,
      sort: pass.sort,
      sortBy: pass.sort,
      filterByStars: pass.filterByStars,
      filterByRating: pass.filterByStars,
      maxRequestRetries: 7,
      verifiedOnly: false,
      includeImages: false,
      includeGdprSensitive: false,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const firstItem = items[0];
    if (firstItem) {
      productName = String(firstItem.productName ?? firstItem.productTitle ?? firstItem.product_title ?? productName);
    }

    for (const item of items) {
      const review: ReviewRecord = {
        rating: Number(item.rating ?? item.ratingScore ?? item.reviewRating ?? item.stars ?? 0),
        title: String(item.title ?? item.reviewTitle ?? item.review_title ?? ""),
        body: String(item.body ?? item.text ?? item.reviewText ?? item.review_body ?? item.reviewDescription ?? ""),
        date: String(item.date ?? item.reviewDate ?? item.review_date_iso ?? ""),
        verified: Boolean(item.verified ?? item.isVerified ?? item.isVerifiedPurchase ?? item.is_verified_purchase ?? item.reviewIsVerified),
        helpfulVotes: Number(item.helpfulVotes ?? item.helpfulCount ?? item.helpful_votes ?? 0),
        variant: String(item.variant ?? ""),
      };

      if (!review.body) continue;
      const dedupeKey = [
        review.rating,
        (review.title ?? "").trim().toLowerCase(),
        review.body.trim().toLowerCase(),
        review.date ?? "",
      ].join("|");
      reviewMap.set(dedupeKey, review);
      if (reviewMap.size >= maxReviews) break;
    }
  }

  const reviews = Array.from(reviewMap.values()).slice(0, maxReviews);

  return {
    asin,
    productName,
    reviews,
  };
}
