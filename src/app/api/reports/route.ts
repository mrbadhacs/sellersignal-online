import { NextResponse } from "next/server";
import { z } from "zod";
import { scrapeAmazonReviews } from "@/lib/apify";
import { getAuthenticatedProfile } from "@/lib/auth";
import { emailReport } from "@/lib/email";
import { createDemoReport } from "@/lib/mock-report";
import { analyzeReviews } from "@/lib/openai-report";
import { getCreditBalance, getSupabaseAdmin, hasSupabaseAdmin } from "@/lib/supabase-admin";
import { REVIEW_TIERS } from "@/lib/types";

const requestSchema = z.object({
  productUrl: z.string().min(10),
  email: z.string().email().optional().or(z.literal("")),
  tier: z.enum(["free", "starter", "growth", "pro", "market"]),
});

function statusForError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Sign in") || message.includes("session") || message.includes("only access")) return 401;
  return 500;
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Check the URL, email, and report size." }, { status: 400 });
  }

  const { productUrl, email: requestedEmail, tier } = parsed.data;
  const maxReviews = REVIEW_TIERS[tier].reviews;
  const creditCost = REVIEW_TIERS[tier].credits;

  try {
    if (!hasSupabaseAdmin()) {
      return NextResponse.json({ error: "Supabase is not configured, so reports and credits cannot be managed." }, { status: 500 });
    }

    const { profile, email } = await getAuthenticatedProfile(request, requestedEmail);

    if (tier === "free") {
      const supabase = getSupabaseAdmin();
      const { count, error: freeCountError } = await supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .contains("report_json", { tier: "free" });

      if (freeCountError) throw freeCountError;

      if ((count || 0) >= 1) {
        return NextResponse.json(
          { error: "This email has already used its free teaser report. Buy credits or subscribe to generate more reports." },
          { status: 402 },
        );
      }
    }

    if (creditCost > 0) {
      const balance = await getCreditBalance(profile.id);
      if (balance < creditCost) {
        return NextResponse.json(
          { error: `No credits found for this email. This report needs ${creditCost} credit${creditCost > 1 ? "s" : ""}. Purchase a report or subscribe to get started.` },
          { status: 402 },
        );
      }
    }

    if (!process.env.APIFY_API_TOKEN || !process.env.OPENAI_API_KEY) {
      const report = createDemoReport(productUrl, tier);
      const supabase = getSupabaseAdmin();
      await supabase.from("reports").insert({
        user_id: profile.id,
        product_url: productUrl,
        product_name: report.productName,
        review_count: report.reviewCount,
        report_json: report,
      });
      if (creditCost > 0) {
        await supabase.from("credit_ledger").insert({
          user_id: profile.id,
          amount: -creditCost,
          reason: `generated ${REVIEW_TIERS[tier].label} demo report`,
        });
      }
      const emailResult = await emailReport(email || undefined, report);
      if (!emailResult?.sent) {
        console.warn(`[email] demo report email was not sent: ${emailResult?.reason || "unknown reason"}`);
      }
      return NextResponse.json({ report });
    }

    const scrape = await scrapeAmazonReviews(productUrl, maxReviews);

    if (scrape.reviews.length === 0) {
      throw new Error("No public reviews could be retrieved for this product. Try another Amazon.com product URL.");
    }

    const report = await analyzeReviews({
      productUrl,
      productName: scrape.productName,
      requestedReviewCount: maxReviews,
      tier,
      reviews: scrape.reviews,
    });

    const supabase = getSupabaseAdmin();
    await supabase.from("reports").insert({
      user_id: profile.id,
      product_url: productUrl,
      product_name: report.productName,
      review_count: report.reviewCount,
      report_json: report,
    });
    if (creditCost > 0) {
      await supabase.from("credit_ledger").insert({
        user_id: profile.id,
        amount: -creditCost,
        reason: `generated ${REVIEW_TIERS[tier].label} report`,
      });
    }

    const emailResult = await emailReport(email || undefined, report);
    if (emailResult?.sent) {
      console.info(`[email] report email sent to ${email}: ${emailResult.id || "accepted"}`);
    } else {
      console.warn(`[email] report email was not sent to ${email}: ${emailResult?.reason || "unknown reason"}`);
    }

    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The report could not be generated." },
      { status: statusForError(error) },
    );
  }
}
