import OpenAI from "openai";
import { InsightReport, ReviewRecord, ReviewTier } from "./types";

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function analyzeReviews(input: {
  productUrl: string;
  productName: string;
  tier: ReviewTier;
  reviews: ReviewRecord[];
}): Promise<InsightReport> {
  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const reviewSample = input.reviews.slice(0, 1000).map((review, index) => ({
    index: index + 1,
    rating: review.rating,
    title: review.title,
    body: review.body,
    date: review.date,
    verified: review.verified,
    helpfulVotes: review.helpfulVotes,
    variant: review.variant,
  }));

  const client = getOpenAI();
  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "You create concise competitive product intelligence reports for Amazon sellers. Return only valid JSON matching the requested schema.",
      },
      {
        role: "user",
        content: JSON.stringify({
          task:
            "Analyze competitor Amazon reviews. Identify compliments, complaints, repeated customer language, product improvement opportunities, positioning angles, and marketing copy ideas.",
          productUrl: input.productUrl,
          productName: input.productName,
          reviewCount: input.reviews.length,
          reviews: reviewSample,
          schema: {
            executiveSummary: "string",
            topCompliments: ["string"],
            topComplaints: ["string"],
            commonPhrases: ["string"],
            productImprovements: ["string"],
            positioningAngles: ["string"],
            marketingCopyIdeas: ["string"],
            ratingBreakdown: {
              average: "number",
              positivePercent: "number",
              neutralPercent: "number",
              negativePercent: "number",
            },
          },
        }),
      },
    ],
    text: { format: { type: "json_object" } },
  });

  const parsed = JSON.parse(response.output_text);

  return {
    id: crypto.randomUUID(),
    productUrl: input.productUrl,
    productName: input.productName,
    reviewCount: input.reviews.length,
    tier: input.tier,
    generatedAt: new Date().toISOString(),
    demoMode: false,
    ...parsed,
  };
}
