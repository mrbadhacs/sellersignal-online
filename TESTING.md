# SellerSignal Testing Checklist

## 1. Run the canonical Supabase SQL

In Supabase SQL Editor, run the full contents of `supabase.sql`.

To grant yourself test credits, run this after replacing the email:

```sql
with profile as (
  insert into profiles (email)
  values ('YOUR_EMAIL_HERE')
  on conflict (email) do update set email = excluded.email
  returning id
)
insert into credit_ledger (user_id, amount, reason)
select id, 10, 'manual founder test credit'
from profile;
```

## 2. Required Vercel/Replit Secrets

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_REPORT_100=
STRIPE_PRICE_REPORT_250=
STRIPE_PRICE_REPORT_500=
STRIPE_PRICE_REPORT_1000=
STRIPE_PRICE_SOLO=
STRIPE_PRICE_GROWTH=
STRIPE_PRICE_BRAND=
STRIPE_PRICE_AGENCY=

OPENAI_API_KEY=
APIFY_API_TOKEN=
# Optional: adds a stronger paginated review source. The app combines Canopy + Apify when both are set.
CANOPY_API_KEY=
# Also accepted: CANOPYAPI_API_KEY or CANOPY_TOKEN
CANOPY_MAX_REVIEWS=100
RESEND_API_KEY=
REPORT_FROM_EMAIL=reports@sellersignal.online
NEXT_PUBLIC_APP_URL=
```

Current Stripe product mapping:

```txt
STRIPE_PRICE_REPORT_100=Quick Signal, $19, 2 credits
STRIPE_PRICE_REPORT_250=Research Pack, $59, 6 credits
STRIPE_PRICE_SOLO=Solo, $49/mo, 10 credits
STRIPE_PRICE_GROWTH=Brand, $149/mo, 40 credits
```

## 3. Stripe Webhook

Use this endpoint path:

```txt
/api/stripe/webhook
```

For the Replit dev URL:

```txt
https://YOUR-REPLIT-URL/api/stripe/webhook
```

Events:

```txt
checkout.session.completed
invoice.payment_succeeded
customer.subscription.deleted
```

## 4. Test Flow

1. Enter your email in the report form.
2. Click `Check credits`.
3. Confirm your manual credit balance appears.
4. Open `/api/provider-status` on the deployed domain and confirm `canopyConfigured` is `true`.
5. Paste an Amazon product URL.
6. Generate a report.
7. If `CANOPY_API_KEY` is configured, confirm the same ASIN returns more than the Apify-only public/top review slice.
8. Confirm credits decrement in the UI and in Supabase.
9. Test a Stripe checkout with `4242 4242 4242 4242`.
10. Confirm Stripe webhook events show a `200`.
11. Check Supabase `credit_ledger` for the new credit row.
