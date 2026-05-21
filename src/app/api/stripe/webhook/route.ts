import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { creditsForPriceId } from "@/lib/billing";
import { addCredits, getOrCreateProfile } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

function priceIdFromLine(line: { price?: string | { id?: string } | null }) {
  return typeof line.price === "string" ? line.price : line.price?.id;
}

async function getCheckoutCredits(stripe: Stripe, session: Stripe.Checkout.Session) {
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 10 });
  return lineItems.data.reduce((sum, item) => {
    const priceId = priceIdFromLine(item);
    return sum + creditsForPriceId(priceId) * (item.quantity || 1);
  }, 0);
}

async function handleCheckoutCompleted(stripe: Stripe, event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const email = session.customer_details?.email || session.customer_email;

  if (!email) throw new Error("Stripe checkout session did not include an email.");

  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const profile = await getOrCreateProfile(email, customerId);
  const credits = Number(session.metadata?.credits || 0) || (await getCheckoutCredits(stripe, session));

  if (credits <= 0) throw new Error(`No credits mapped for checkout session ${session.id}.`);

  await addCredits({
    userId: profile.id,
    amount: credits,
    reason: session.mode === "subscription" ? "subscription checkout credits" : "one-time report purchase",
    stripeEventId: event.id,
  });

  const { getSupabaseAdmin } = await import("@/lib/supabase-admin");
  const supabase = getSupabaseAdmin();
  await supabase.from("purchases").upsert(
    {
      user_id: profile.id,
      stripe_checkout_session_id: session.id,
      stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : session.subscription?.id || null,
      mode: session.mode,
      credits,
      amount_cents: session.amount_total || null,
    },
    { onConflict: "stripe_checkout_session_id" },
  );
}

async function handleInvoicePaymentSucceeded(stripe: Stripe, event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const billingReason = invoice.billing_reason;

  if (billingReason === "subscription_create") return;

  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) throw new Error("Invoice did not include a Stripe customer.");

  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted || !customer.email) throw new Error("Stripe customer did not include an email.");

  const lines = invoice.lines?.data || [];
  const credits = lines.reduce((sum, line) => {
    const priceId = priceIdFromLine(line as { price?: string | { id?: string } | null });
    return sum + creditsForPriceId(priceId);
  }, 0);

  if (credits <= 0) return;

  const profile = await getOrCreateProfile(customer.email, customerId);
  await addCredits({
    userId: profile.id,
    amount: credits,
    reason: "monthly subscription renewal credits",
    stripeEventId: event.id,
  });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not configured." }, { status: 500 });
  }

  const stripe = getStripe();
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid Stripe webhook signature." },
      { status: 400 },
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(stripe, event);
    }

    if (event.type === "invoice.payment_succeeded") {
      await handleInvoicePaymentSucceeded(stripe, event);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stripe webhook could not be processed." },
      { status: 500 },
    );
  }
}
