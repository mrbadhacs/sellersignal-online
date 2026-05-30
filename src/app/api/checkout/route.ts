import { NextResponse } from "next/server";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";

const checkoutSchema = z.object({
  mode: z.enum(["payment", "subscription"]),
  plan: z.enum(["starter", "growth", "pro", "brand"]),
  email: z.string().email().optional().or(z.literal("")),
});

type CheckoutKey =
  | "payment:starter"
  | "payment:growth"
  | "payment:pro"
  | "payment:brand"
  | "subscription:starter"
  | "subscription:growth"
  | "subscription:pro"
  | "subscription:brand";

const priceEnv: Record<CheckoutKey, string> = {
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

  const key = `${parsed.data.mode}:${parsed.data.plan}` as CheckoutKey;
  const price = process.env[priceEnv[key]];

  if (!price) {
    return NextResponse.json({ error: `${priceEnv[key]} is not configured.` }, { status: 501 });
  }

  const stripe = getStripe();
  const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const creditsByPlan = {
    "payment:starter": 2,
    "payment:growth": 6,
    "payment:pro": 6,
    "payment:brand": 6,
    "subscription:starter": 10,
    "subscription:growth": 40,
    "subscription:pro": 40,
    "subscription:brand": 40,
  } satisfies Record<CheckoutKey, number>;

  const session = await stripe.checkout.sessions.create({
    mode: parsed.data.mode,
    line_items: [{ price, quantity: 1 }],
    customer_email: parsed.data.email || undefined,
    success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?checkout=cancelled`,
    allow_promotion_codes: true,
    metadata: {
      plan: parsed.data.plan,
      mode: parsed.data.mode,
      credits: String(creditsByPlan[key]),
    },
    subscription_data:
      parsed.data.mode === "subscription"
        ? {
            metadata: {
              plan: parsed.data.plan,
              credits: String(creditsByPlan[key]),
            },
          }
        : undefined,
  });

  return NextResponse.json({ url: session.url });
}
