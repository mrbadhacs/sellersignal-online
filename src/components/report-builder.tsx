"use client";

import { ArrowDownToLine, ChartNoAxesCombined, Loader2, Sparkles } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { InsightReport, ReviewTier, REVIEW_TIERS } from "@/lib/types";

const plans = [
  { key: "starter", name: "Solo", price: "$29/mo", credits: "3 credits", detail: "Best for weekly competitor checks." },
  { key: "growth", name: "Operator", price: "$79/mo", credits: "10 credits", detail: "For sellers testing listings and angles." },
  { key: "pro", name: "Brand", price: "$149/mo", credits: "24 credits", detail: "For teams watching multiple competitors." },
  { key: "brand", name: "Agency", price: "$299/mo", credits: "60 credits", detail: "For agencies and portfolio operators." },
];

const oneTimeReports = [
  { key: "starter", label: "100 reviews", price: "$19", credits: "1 credit", detail: "A quick read on one competing product." },
  { key: "growth", label: "250 reviews", price: "$39", credits: "2 credits", detail: "Best for validating patterns before launch." },
  { key: "pro", label: "500 reviews", price: "$79", credits: "4 credits", detail: "A deeper report for serious product decisions." },
  { key: "brand", label: "1,000 reviews", price: "$129", credits: "7 credits", detail: "Maximum signal for mature competitive research." },
];

const reportExpectations = [
  {
    title: "AI-summarized customer sentiment",
    detail: "Recent public reviews are condensed into a one-page read on what customers love, dislike, repeat, and expect.",
  },
  {
    title: "Product improvement opportunities",
    detail: "The report turns recurring complaints into practical ideas for sourcing, packaging, instructions, quality, and variants.",
  },
  {
    title: "Positioning and copy angles",
    detail: "Use repeated customer language to shape listing copy, creative hooks, comparison claims, and launch messaging.",
  },
  {
    title: "PDF and email delivery",
    detail: "Download the report as a PDF and optionally send it to your inbox so it is easy to share with your team or supplier.",
  },
];

const complianceCopy =
  "SellerSignal is for public-review market research only. Do not submit Seller Central data, private customer data, or non-public information. You are responsible for following marketplace terms and applicable privacy laws.";

export function ReportBuilder() {
  const [productUrl, setProductUrl] = useState("");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<ReviewTier>("growth");
  const [report, setReport] = useState<InsightReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selected = REVIEW_TIERS[tier];
  const costNote = useMemo(() => `${selected.credits} credit${selected.credits > 1 ? "s" : ""} • ${selected.label}`, [selected]);

  async function submitReport(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setReport(null);

    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productUrl, email, tier }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }

    setReport(data.report);
  }

  async function downloadPdf() {
    if (!report) return;

    const response = await fetch("/api/report-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report }),
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${report.id}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function checkout(mode: "payment" | "subscription", plan: string) {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, plan }),
    });
    const data = await response.json();
    if (data.url) window.location.href = data.url;
    else setError(data.error || "Stripe is not configured yet.");
  }

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-neutral-950">
      <section className="min-h-[92vh] bg-[linear-gradient(180deg,rgba(0,0,0,.78),rgba(0,0,0,.28)),url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=2200&q=80')] bg-cover bg-center text-white">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <div className="text-sm font-semibold uppercase tracking-[0.28em]">SellerSignal</div>
          <button
            type="button"
            onClick={() => checkout("subscription", "growth")}
            className="rounded-full border border-white/40 px-4 py-2 text-sm backdrop-blur transition hover:bg-white hover:text-black"
          >
            Start
          </button>
        </nav>

        <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-14 pt-20 lg:grid-cols-[1.05fr_.95fr] lg:pt-28">
          <div className="max-w-3xl">
            <p className="mb-5 text-sm uppercase tracking-[0.35em] text-white/70">Amazon.com review intelligence</p>
            <h1 className="text-5xl font-semibold leading-[1.02] tracking-normal sm:text-7xl">
              Reverse engineer competitor reviews before you build, source, or launch.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/76">
              Paste a competitor product URL, scrape recent customer reviews, and get a crisp one-page report with complaints,
              compliments, phrases, product gaps, positioning, and copy angles.
            </p>
          </div>

          <form onSubmit={submitReport} className="self-end rounded-lg bg-white p-4 text-neutral-950 shadow-2xl">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Competitor product URL</label>
            <input
              value={productUrl}
              onChange={(event) => setProductUrl(event.target.value)}
              placeholder="https://www.amazon.com/dp/B0..."
              className="mt-2 h-12 w-full rounded-md border border-neutral-200 px-3 outline-none focus:border-neutral-950"
              required
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(Object.keys(REVIEW_TIERS) as ReviewTier[]).map((key) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setTier(key)}
                  className={`rounded-md border p-3 text-left text-sm transition ${
                    tier === key ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-200 hover:border-neutral-500"
                  }`}
                >
                  <span className="block font-semibold">{REVIEW_TIERS[key].label}</span>
                  <span className="text-xs opacity-70">{REVIEW_TIERS[key].credits} credits</span>
                </button>
              ))}
            </div>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email report to you@brand.com"
              className="mt-4 h-12 w-full rounded-md border border-neutral-200 px-3 outline-none focus:border-neutral-950"
            />
            <button
              disabled={loading}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 font-medium text-white transition hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-70"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Generate report
            </button>
            <p className="mt-3 text-center text-xs text-neutral-500">{costNote}</p>
            <p className="mt-3 rounded-md bg-neutral-100 p-3 text-xs leading-5 text-neutral-500">{complianceCopy}</p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12">
        <div className="grid gap-8 border-y border-neutral-300 py-12 lg:grid-cols-[.85fr_1.15fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">What to expect</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-normal">A one-page AI report built from competitor review patterns.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-neutral-600">
              SellerSignal uses AI to summarize public customer feedback into the product, marketing, and positioning signals
              Amazon sellers usually have to find by reading hundreds of reviews manually.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {reportExpectations.map((item) => (
              <div key={item.title} className="rounded-lg border border-neutral-200 bg-white p-5">
                <h3 className="text-base font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-neutral-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12">
        <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">Choose how to buy</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-normal">One report when you need it. Credits when you are watching the market.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-neutral-600">
              Buy a single report for a specific competitor, or subscribe for monthly credits that never expire. Canceling a
              subscription stops new monthly credits, but your unused credits stay in your account.
            </p>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between gap-4 border-b border-neutral-200 pb-4">
              <div>
                <h3 className="text-xl font-semibold">One-time reports</h3>
                <p className="mt-1 text-sm text-neutral-500">No account required for a single report checkout.</p>
              </div>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">Pay once</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {oneTimeReports.map((reportOption) => (
                <button
                  key={reportOption.label}
                  type="button"
                  onClick={() => checkout("payment", reportOption.key)}
                  className="rounded-md border border-neutral-200 p-4 text-left transition hover:border-neutral-950"
                >
                  <span className="block text-sm font-semibold">{reportOption.label}</span>
                  <span className="mt-3 block text-3xl font-semibold">{reportOption.price}</span>
                  <span className="mt-1 block text-sm text-neutral-600">{reportOption.credits}</span>
                  <span className="mt-4 block text-sm leading-6 text-neutral-500">{reportOption.detail}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
            <div>
              <h3 className="text-xl font-semibold">Monthly subscriptions</h3>
              <p className="mt-1 text-sm text-neutral-500">Best for sellers monitoring competitors across multiple products.</p>
            </div>
            <span className="rounded-full bg-neutral-950 px-3 py-1 text-xs font-medium text-white">Credits never expire</span>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-4">
            {plans.map((plan) => (
              <button
                key={plan.name}
                type="button"
                onClick={() => checkout("subscription", plan.key)}
                className="rounded-lg border border-neutral-200 bg-white p-5 text-left transition hover:-translate-y-1 hover:border-neutral-950"
              >
                <span className="text-sm font-semibold">{plan.name}</span>
                <span className="mt-5 block text-3xl font-semibold">{plan.price}</span>
                <span className="mt-2 block text-sm text-neutral-600">{plan.credits} never expire</span>
                <span className="mt-5 block text-sm leading-6 text-neutral-500">{plan.detail}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 rounded-lg border border-neutral-200 bg-white p-4 text-sm leading-6 text-neutral-500">{complianceCopy}</p>
      </section>

      {report && (
        <section className="mx-auto max-w-7xl px-5 pb-16">
          <div className="flex flex-wrap items-center justify-between gap-4 border-y border-neutral-300 py-5">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-neutral-500">
                {report.demoMode ? "Demo report" : "Live report"}
              </p>
              <h2 className="mt-2 text-3xl font-semibold">{report.productName}</h2>
            </div>
            <button onClick={downloadPdf} className="flex items-center gap-2 rounded-md bg-neutral-950 px-4 py-3 text-sm text-white">
              <ArrowDownToLine className="size-4" />
              Download PDF
            </button>
          </div>

          <div className="grid gap-6 py-8 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <ChartNoAxesCombined className="mb-4 size-6" />
              <p className="text-5xl font-semibold">{report.ratingBreakdown.average.toFixed(1)}</p>
              <p className="mt-2 text-sm text-neutral-500">{report.reviewCount} reviews analyzed</p>
              <p className="mt-6 leading-7 text-neutral-700">{report.executiveSummary}</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <InsightList title="Top compliments" items={report.topCompliments} />
              <InsightList title="Top complaints" items={report.topComplaints} />
              <InsightList title="Common phrases" items={report.commonPhrases} />
              <InsightList title="Product improvements" items={report.productImprovements} />
              <InsightList title="Positioning angles" items={report.positioningAngles} />
              <InsightList title="Copy ideas" items={report.marketingCopyIdeas} />
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function InsightList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-4 space-y-3 text-sm leading-6 text-neutral-600">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}
