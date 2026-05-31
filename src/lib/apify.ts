import { ApifyClient } from "apify-client";
import { ReviewRecord } from "./types";

const DEFAULT_ACTOR_ID = "automation-lab/amazon-reviews-scraper";
const ACTOR_MAX_REVIEWS_PER_RUN = 100;
const CANOPY_PAGE_SIZE = 10;
const CANOPY_MAX_REQUESTS = 18;
const CANOPY_RATING_FILTERS = ["ALL", "FIVE_STAR", "FOUR_STAR", "THREE_STAR", "TWO_STAR", "ONE_STAR"] as const;
const PROVIDER_TIMEOUT_MS = 50_000;
const REVIEW_PASSES = [
  { sort: "recent", filterByStars: "all" },
] as const;

type ScrapeResult = {
  asin: string;
  provider: string;
  productName: string;
  reviews: ReviewRecord[];
};

type CanopyPageResult = {
  productName?: string;
  reviews: ReviewRecord[];
};

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
  const asin = extractAsin(productUrl);
  const normalizedProductUrl = `https://www.amazon.com/dp/${asin}`;
  const providers: Array<Promise<ScrapeResult>> = [];
  const canopyConfigured = Boolean(getCanopyApiKey());
  const apifyConfigured = Boolean(process.env.APIFY_API_TOKEN);

  console.info(`[reviews] provider config for ${asin}: canopy=${canopyConfigured} apify=${apifyConfigured}`);

  if (canopyConfigured) {
    providers.push(withTimeout(scrapeCanopyReviews(asin, maxReviews), PROVIDER_TIMEOUT_MS, "Canopy"));
  }

  if (apifyConfigured) {
    providers.push(withTimeout(scrapeApifyReviews(asin, normalizedProductUrl, maxReviews), PROVIDER_TIMEOUT_MS, "Apify"));
  }

  if (providers.length === 0) {
    throw new Error("Configure APIFY_API_TOKEN or CANOPY_API_KEY before generating live reports.");
  }

  const results = await Promise.allSettled(providers);
  const reviewMap = new Map<string, ReviewRecord>();
  let productName = `Amazon ASIN ${asin}`;
  const providerErrors: string[] = [];

  for (const result of results) {
    if (result.status === "rejected") {
      providerErrors.push(result.reason instanceof Error ? result.reason.message : "A review provider failed.");
      continue;
    }

    console.info(`[reviews] ${result.value.provider} returned ${result.value.reviews.length} reviews for ${asin}`);

    if (result.value.productName !== `Amazon ASIN ${asin}` && productName === `Amazon ASIN ${asin}`) {
      productName = result.value.productName;
    }

    for (const review of result.value.reviews) {
      if (!review.body) continue;
      reviewMap.set(createReviewKey(review), review);
      if (reviewMap.size >= maxReviews) break;
    }
  }

  const reviews = Array.from(reviewMap.values()).slice(0, maxReviews);

  if (providerErrors.length > 0) {
    console.warn(`[reviews] provider issues for ${asin}: ${providerErrors.join(" | ")}`);
  }

  if (reviews.length === 0 && providerErrors.length > 0) {
    throw new Error(providerErrors.join(" "));
  }

  console.info(`[reviews] combined ${reviews.length} deduped reviews for ${asin}`);

  return {
    asin,
    provider: "combined",
    productName,
    reviews,
  };
}

async function scrapeApifyReviews(asin: string, normalizedProductUrl: string, maxReviews: number): Promise<ScrapeResult> {
  const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
  const actorId = process.env.APIFY_ACTOR_ID || DEFAULT_ACTOR_ID;

  if (actorId.includes("webdatalabs/amazon-reviews-scraper")) {
    const amazonCookies = process.env.APIFY_AMAZON_COOKIES?.trim();
    const reviewLimit = amazonCookies ? maxReviews : Math.min(maxReviews, 15);
    const run = await client.actor(actorId).call({
      productUrls: [{ url: normalizedProductUrl }],
      maxReviewsPerProduct: reviewLimit,
      starRatings: [1, 2, 3, 4, 5],
      sortBy: "helpful",
      verifiedOnly: false,
      ...(amazonCookies ? { amazonCookies } : {}),
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    return {
      asin,
      provider: "Apify",
      productName: String(items[0]?.productName ?? items[0]?.productTitle ?? items[0]?.product_title ?? `Amazon ASIN ${asin}`),
      reviews: normalizeReviews(asRecordArray(items)).slice(0, maxReviews),
    };
  }

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
      maxRequestRetries: 3,
      verifiedOnly: false,
      includeImages: false,
      includeGdprSensitive: false,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const firstItem = items[0];
    if (firstItem) {
      productName = String(firstItem.productName ?? firstItem.productTitle ?? firstItem.product_title ?? productName);
    }

    for (const review of normalizeReviews(asRecordArray(items))) {
      if (!review.body) continue;
      reviewMap.set(createReviewKey(review), review);
      if (reviewMap.size >= maxReviews) break;
    }
  }

  const reviews = Array.from(reviewMap.values()).slice(0, maxReviews);

  return {
    asin,
    provider: "Apify",
    productName,
    reviews,
  };
}

async function scrapeCanopyReviews(asin: string, maxReviews: number): Promise<ScrapeResult> {
  const apiKey = getCanopyApiKey();
  if (!apiKey) {
    return { asin, provider: "Canopy", productName: `Amazon ASIN ${asin}`, reviews: [] };
  }

  const targetReviews = Math.min(maxReviews, Number(process.env.CANOPY_MAX_REVIEWS || maxReviews), 500);
  const allPages = Math.min(Math.max(1, Math.ceil(targetReviews / CANOPY_PAGE_SIZE)), 10);
  const requests: Array<{ rating: typeof CANOPY_RATING_FILTERS[number]; page: number }> = [];
  for (let page = 1; page <= allPages; page += 1) {
    requests.push({ rating: "ALL", page });
  }
  for (const rating of CANOPY_RATING_FILTERS) {
    if (rating === "ALL") continue;
    for (let page = 1; page <= 2 && requests.length < CANOPY_MAX_REQUESTS; page += 1) {
      requests.push({ rating, page });
    }
  }

  const reviewMap = new Map<string, ReviewRecord>();
  let productName = `Amazon ASIN ${asin}`;
  const errors: string[] = [];

  for (let index = 0; index < requests.length; index += 4) {
    if (reviewMap.size >= targetReviews) break;
    const batch = requests.slice(index, index + 4);
    const results = await Promise.allSettled(
      batch.map((request) => fetchCanopyPage(asin, apiKey, request.rating, request.page)),
    );

    for (const result of results) {
      if (result.status === "rejected") {
        errors.push(result.reason instanceof Error ? result.reason.message : "Canopy request failed.");
        continue;
      }

      productName = result.value.productName || productName;
      for (const review of result.value.reviews) {
        reviewMap.set(createReviewKey(review), review);
        if (reviewMap.size >= targetReviews) break;
      }
    }
  }

  if (reviewMap.size === 0 && errors.length > 0) {
    throw new Error(errors[0]);
  }

  return {
    asin,
    provider: "Canopy",
    productName,
    reviews: Array.from(reviewMap.values()).slice(0, maxReviews),
  };
}

export function getReviewProviderStatus() {
  return {
    apifyConfigured: Boolean(process.env.APIFY_API_TOKEN),
    apifyActorId: process.env.APIFY_ACTOR_ID || DEFAULT_ACTOR_ID,
    canopyConfigured: Boolean(getCanopyApiKey()),
    canopyMaxReviews: Number(process.env.CANOPY_MAX_REVIEWS || 100),
    acceptedCanopySecretNames: ["CANOPY_API_KEY", "CANOPYAPI_API_KEY", "CANOPY_TOKEN"],
  };
}

function getCanopyApiKey() {
  return (
    process.env.CANOPY_API_KEY?.trim()
    || process.env.CANOPYAPI_API_KEY?.trim()
    || process.env.CANOPY_TOKEN?.trim()
    || ""
  );
}

async function fetchCanopyPage(
  asin: string,
  apiKey: string,
  rating: typeof CANOPY_RATING_FILTERS[number],
  page: number,
): Promise<CanopyPageResult> {
  const url = new URL("https://api.canopyapi.co/v1/amazon/product/reviews");
  url.searchParams.set("asin", asin);
  url.searchParams.set("domain", "US");
  url.searchParams.set("page", String(page));
  url.searchParams.set("rating", rating);
  url.searchParams.set("onlyVerifiedReviews", "false");

  const response = await fetch(url, {
    headers: {
      "API-KEY": apiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Canopy ${rating} page ${page} returned ${response.status}: ${text.slice(0, 180)}`);
  }

  const payload = await response.json() as unknown;
  return {
    productName: getProductName(payload),
    reviews: normalizeReviews(collectReviewLikeRecords(payload)),
  };
}

function normalizeReviews(items: Record<string, unknown>[]) {
  return items.map((item) => ({
    rating: Number(item.rating ?? item.ratingScore ?? item.reviewRating ?? item.stars ?? 0),
    title: String(item.title ?? item.reviewTitle ?? item.review_title ?? ""),
    body: String(item.body ?? item.text ?? item.reviewText ?? item.review_text ?? item.review_body ?? item.reviewDescription ?? ""),
    date: String(item.date ?? item.reviewDate ?? item.review_date ?? item.review_date_iso ?? ""),
    verified: Boolean(item.verified ?? item.verifiedPurchase ?? item.isVerified ?? item.isVerifiedPurchase ?? item.is_verified_purchase ?? item.reviewIsVerified),
    helpfulVotes: Number(item.helpfulVotes ?? item.helpfulCount ?? item.helpful_votes ?? item.helpful_vote_count ?? 0),
    variant: String(item.variant ?? item.productVariant ?? ""),
  })).filter((review) => review.body.length > 0);
}

function createReviewKey(review: ReviewRecord) {
  return [
    review.rating,
    (review.title ?? "").trim().toLowerCase(),
    review.body.trim().toLowerCase(),
    review.date ?? "",
  ].join("|");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
}

function collectReviewLikeRecords(value: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 8) return [];

  if (Array.isArray(value)) {
    const records = asRecordArray(value);
    const reviewRecords = records.filter((item) => "body" in item || "reviewText" in item || "review_text" in item);
    if (reviewRecords.length > 0) return reviewRecords;
    return records.flatMap((item) => collectReviewLikeRecords(item, depth + 1));
  }

  if (!isRecord(value)) return [];

  const preferredKeys = ["reviews", "reviewsPaginated", "topReviews", "items", "amazonProduct", "data"];
  for (const key of preferredKeys) {
    if (key in value) {
      const found = collectReviewLikeRecords(value[key], depth + 1);
      if (found.length > 0) return found;
    }
  }

  return Object.values(value).flatMap((child) => collectReviewLikeRecords(child, depth + 1));
}

function getProductName(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;

  const title = value.title ?? value.productName ?? value.productTitle ?? value.product_title;
  if (typeof title === "string" && title.trim().length > 0) return title;

  for (const child of Object.values(value)) {
    if (Array.isArray(child)) continue;
    const found = getProductName(child);
    if (found) return found;
  }

  return undefined;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, providerName: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timer = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${providerName} took too long to return reviews.`)), ms);
  });

  try {
    return await Promise.race([promise, timer]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
