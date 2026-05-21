# Replit Build Prompt

Build and deploy this Next.js MVP as SellerSignal, a premium SaaS for Amazon sellers to analyze competitor Amazon.com reviews.

## Product

Users paste a competitor Amazon.com product URL, choose 100 / 250 / 500 / 1,000 recent reviews, enter an email, and receive a one-page AI report with:

- Executive summary
- Top compliments
- Top complaints
- Common phrases
- Suggested product improvements
- Positioning angles
- Marketing copy ideas
- Downloadable PDF

## Stack

- Next.js App Router
- Tailwind CSS
- Apify actor: `automation-lab/amazon-reviews-scraper`
- OpenAI Responses API
- Stripe Checkout for one-time reports and subscriptions
- Resend for email delivery
- Supabase for users, reports, purchases, and credit ledger

## Required Secrets

Copy `.env.example` into Replit Secrets and fill in:

- `OPENAI_API_KEY`
- `APIFY_API_TOKEN`
- `STRIPE_SECRET_KEY`
- Stripe price IDs
- `RESEND_API_KEY`
- `REPORT_FROM_EMAIL`
- Supabase URL, anon key, and service role key
- `STRIPE_WEBHOOK_SECRET`

## Credit Model

One-time report prices:

- 100 reviews: $19, 1 credit
- 250 reviews: $39, 2 credits
- 500 reviews: $79, 4 credits
- 1,000 reviews: $129, 7 credits

Subscriptions:

- Solo: $29/mo, 3 credits/month
- Operator: $79/mo, 10 credits/month
- Brand: $149/mo, 24 credits/month
- Agency: $299/mo, 60 credits/month

Credits never expire. When a subscription renews, add credits to the user's ledger. If they cancel, keep their remaining credit balance.

## Implementation Tasks

1. Run `supabase.sql` in the Supabase SQL Editor.
2. Use `/api/stripe/webhook` as the Stripe webhook endpoint.
3. Keep demo mode active only when Apify/OpenAI API keys are missing.
4. Add Supabase Auth for full account dashboards after the email-based MVP is tested.
5. Make PDF download work from saved report records, not only the browser state.
