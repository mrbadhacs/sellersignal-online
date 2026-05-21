import { NextResponse } from "next/server";
import { z } from "zod";
import { scrapeAmazonReviews } from "@/lib/apify";
import { emailReport } from "@/lib/email";
import { createDemoReport } from "@/lib/mock-report";
import { analyzeReviews } from "@/lib/openai-report";
import { REVIEW_TIERS } from "@/lib/types";

const requestSchema = z.object({
  productUrl: z.string().min(10),
  email: z.string().email().optional().or(z.literal("")),
  tier: z.enum(["starter", "growth", "pro", "market"]),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Check the URL, email, and report size." }, { status: 400 });
  }

  const { productUrl, email, tier } = parsed.data;
  const maxReviews = REVIEW_TIERS[tier].reviews;

  try {
    if (!process.env.APIFY_API_TOKEN || !process.env.OPENAI_API_KEY) {
      const report = createDemoReport(productUrl, tier);
      await emailReport(email || undefined, report);
      return NextResponse.json({ report });
    }

    const scrape = await scrapeAmazonReviews(productUrl, maxReviews);
    const report = await analyzeReviews({
      productUrl,
      productName: scrape.productName,
      tier,
      reviews: scrape.reviews,
    });

    await emailReport(email || undefined, report);

    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The report could not be generated." },
      { status: 500 },
    );
  }
}
