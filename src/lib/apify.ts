import { ApifyClient } from "apify-client";
import { ReviewRecord } from "./types";

const DEFAULT_ACTOR_ID = "automation-lab/amazon-reviews-scraper";

function extractAsin(input: string) {
  const trimmed = input.trim();
  const direct = trimmed.match(/^[A-Z0-9]{10}$/i)?.[0];
  if (direct) return direct.toUpperCase();

  const patterns = [/\/dp\/([A-Z0-9]{10})/i, /\/gp\/product\/([A-Z0-9]{10})/i, /\/product\/([A-Z0-9]{10})/i];
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
  const normalizedProductUrl = productUrl.trim().match(/^https?:\/\//i)
    ? productUrl.trim()
    : `https://www.amazon.com/dp/${asin}`;

  const run = await client.actor(actorId).call({
    productUrls: [normalizedProductUrl],
    asins: [asin],
    marketplace: "US",
    country: "amazon.com",
    maxReviews,
    maxReviewsPerProduct: maxReviews,
    sort: "recent",
    sortBy: "recent",
    filterByStars: "all",
    filterByRating: "all",
    verifiedOnly: false,
    includeImages: false,
    includeGdprSensitive: false,
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  const reviews: ReviewRecord[] = items.map((item) => ({
    rating: Number(item.rating ?? item.ratingScore ?? item.reviewRating ?? item.stars ?? 0),
    title: String(item.title ?? item.reviewTitle ?? item.review_title ?? ""),
    body: String(item.body ?? item.text ?? item.reviewText ?? item.review_body ?? item.reviewDescription ?? ""),
    date: String(item.date ?? item.reviewDate ?? item.review_date_iso ?? ""),
    verified: Boolean(item.verified ?? item.isVerified ?? item.isVerifiedPurchase ?? item.is_verified_purchase ?? item.reviewIsVerified),
    helpfulVotes: Number(item.helpfulVotes ?? item.helpfulCount ?? item.helpful_votes ?? 0),
    variant: String(item.variant ?? ""),
  })).filter((review) => review.body.length > 0);

  return {
    asin,
    productName: String(items[0]?.productName ?? items[0]?.productTitle ?? items[0]?.product_title ?? `Amazon ASIN ${asin}`),
    reviews,
  };
}
