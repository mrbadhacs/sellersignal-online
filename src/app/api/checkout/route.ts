import { NextResponse } from "next/server";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";

const checkoutSchema = z.object({
  mode: z.enum(["payment", "subscription"]),
  plan: z.enum(["starter", "growth", "pro", "brand"]),
});

const priceEnv: Record<string, string> = {
  "payment:starter": "STRIPE_PRICE_REPORT_100",
  "payment:growth": "STRIPE_PRICE_REPORT_250",
  "payment:pro": "STRIPE_PRICE_REPORT_500",
  "payment:brand": "STRIPE_PRICE_REPORT_1000",
  "subscription:starter": "STRIPE_PRICE_SOLO",
  "subscription:growth": "STRIPE_PRICE_GROWTH",
  "subscription:pro": "STRIPE_PRICE_BRAND",
  "subscription:brand": "STRIPE_PRICE_AGENCY",
};

export async function POST(request: Request) {
  const parsed = checkoutSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  const key = `${parsed.data.mode}:${parsed.data.plan}`;
  const price = process.env[priceEnv[key]];

  if (!price) {
    return NextResponse.json({ error: `${priceEnv[key]} is not configured.` }, { status: 501 });
  }

  const stripe = getStripe();
  const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: parsed.data.mode,
    line_items: [{ price, quantity: 1 }],
    success_url: `${origin}/?checkout=success`,
    cancel_url: `${origin}/?checkout=cancelled`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
