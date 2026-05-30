"use client";

import { ArrowDownToLine, ChartNoAxesCombined, FileText, Loader2, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createDemoReport } from "@/lib/mock-report";
import { InsightReport, ReviewTier, REVIEW_TIERS } from "@/lib/types";

const activeReportTiers = ["starter", "growth", "pro"] as const satisfies readonly ReviewTier[];

const plans = [
  { key: "starter", name: "Solo", price: "$49/mo", credits: "5 credits", detail: "Best for weekly competitor checks." },
  { key: "growth", name: "Brand", price: "$149/mo", credits: "15 credits", detail: "For sellers testing products, listings, and angles." },
];

const oneTimeReports = [
  { key: "starter", label: "Quick Signal", price: "$19", credits: "1 credit", detail: "One best-effort public review intelligence report." },
  { key: "growth", label: "Research Pack", price: "$49", credits: "3 credits", detail: "Three credits for checking a few competitor products." },
  { key: "pro", label: "Market Pack", price: "$99", credits: "7 credits", detail: "Seven credits for broader competitor and niche research." },
];

const oneTimeCompare = [
  {
    feature: "Best for",
    starter: "Fast competitor read",
    growth: "A few product checks",
    pro: "Broader market research",
  },
  {
    feature: "Public review retrieval",
    starter: "Best effort",
    growth: "Best effort",
    pro: "Best effort",
  },
  {
    feature: "AI sentiment summary",
    starter: "Included",
    growth: "Included",
    pro: "Included",
  },
  {
    feature: "Complaints and compliments",
    starter: "Included",
    growth: "Included",
    pro: "Included",
  },
  {
    feature: "Common phrases",
    starter: "Included",
    growth: "Included",
    pro: "Included",
  },
  {
    feature: "Product improvement ideas",
    starter: "Included",
    growth: "Included",
    pro: "Expanded",
  },
  {
    feature: "Positioning and copy ideas",
    starter: "Included",
    growth: "Included",
    pro: "Expanded",
  },
  {
    feature: "PDF and email report",
    starter: "Included",
    growth: "Included",
    pro: "Included",
  },
];

const subscriptionCompare = [
  {
    feature: "Best for",
    starter: "Solo sellers",
    growth: "Growing brands",
  },
  {
    feature: "Monthly credits",
    starter: "5",
    growth: "15",
  },
  {
    feature: "Effective cost per credit",
    starter: "$9.80",
    growth: "$9.93",
  },
  {
    feature: "Unused credits",
    starter: "Never expire",
    growth: "Never expire",
  },
  {
    feature: "One-time report access",
    starter: "Included",
    growth: "Included",
  },
  {
    feature: "Report history",
    starter: "Included",
    growth: "Included",
  },
  {
    feature: "PDF and email delivery",
    starter: "Included",
    growth: "Included",
  },
  {
    feature: "Research cadence",
    starter: "A few products/month",
    growth: "Weekly competitor checks",
  },
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

const generationSteps = [
  "Checking your report credits...",
  "Opening the public Amazon review trail...",
  "Collecting recent customer language...",
  "Separating compliments from complaints...",
  "Finding repeated phrases and product gaps...",
  "Writing your one-page intelligence report...",
  "Preparing email and PDF-ready insights...",
];

const sellerTips = [
  "Tip: the most useful competitor insights often hide in 2-star and 3-star reviews.",
  "Tip: repeated customer phrases can become better listing bullets than generic feature copy.",
  "Tip: product returns often start with mismatched expectations, not just bad quality.",
  "Tip: helpful negative reviews usually reveal the pain points shoppers care about most.",
  "Tip: strong listings answer the doubts customers mention before they buy.",
  "Tip: packaging, instructions, and sizing complaints are often fixable before manufacturing changes.",
  "Tip: competitor compliments can show which benefits your listing needs to match or beat.",
];

type SavedReport = {
  id: string;
  productName: string;
  productUrl: string;
  reviewCount: number;
  createdAt: string;
  report: InsightReport;
};

export function ReportBuilder() {
  const [productUrl, setProductUrl] = useState("");
  const [email, setEmail] = useState(() =>
    typeof window === "undefined" ? "" : window.localStorage.getItem("sellersignal_email") || "",
  );
  const [tier, setTier] = useState<ReviewTier>("growth");
  const [report, setReport] = useState<InsightReport | null>(null);
  const [reportHistory, setReportHistory] = useState<SavedReport[]>([]);
  const [error, setError] = useState("");
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [creditMessage, setCreditMessage] = useState("");
  const [creditStatus, setCreditStatus] = useState<"idle" | "checking" | "success" | "error">("idle");
  const [creditFlash, setCreditFlash] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const reportRef = useRef<HTMLElement | null>(null);

  const selected = REVIEW_TIERS[tier];
  const costNote = useMemo(() => `${selected.credits} credit${selected.credits > 1 ? "s" : ""} • ${selected.label}`, [selected]);
  const reportShortfall =
    report?.requestedReviewCount && report.reviewCount < report.requestedReviewCount
      ? `SellerSignal retrieved ${report.reviewCount} public review${report.reviewCount === 1 ? "" : "s"} for this run. The package sets a retrieval ceiling, not a guaranteed review count, so this report uses every review the data source allowed us to access.`
      : "";

  useEffect(() => {
    if (report) {
      window.requestAnimationFrame(() => reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, [report?.id, report]);

  useEffect(() => {
    if (email) {
      void refreshCredits(email);
    }
    // Run once on load to restore the remembered email account.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) {
      return;
    }

    const interval = window.setInterval(() => {
      setLoadingStep((current) => (current + 1) % generationSteps.length);
    }, 2400);

    return () => window.clearInterval(interval);
  }, [loading]);

  async function submitReport(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setReport(null);
    setLoadingMessage("Scraping public reviews...");
    setLoadingStep(0);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 85000);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productUrl, email, tier }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({ error: "The report request ended before the server returned a readable response." }));

      if (!response.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setReport(data.report);
      await refreshCredits(email);
      await refreshHistory(email);
    } catch (requestError) {
      setError(
        requestError instanceof DOMException && requestError.name === "AbortError"
          ? "The scraper took too long to finish. Try the 100-review report, or switch to the stronger Apify actor with Amazon cookies before running larger reports."
          : "The report could not be generated. Please try again.",
      );
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
      setLoadingMessage("");
      setLoadingStep(0);
    }
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
      body: JSON.stringify({ mode, plan, email }),
    });
    const data = await response.json();
    if (data.url) window.location.href = data.url;
    else setError(data.error || "Stripe is not configured yet.");
  }

  async function refreshCredits(emailToCheck = email) {
    const normalizedEmail = emailToCheck.trim().toLowerCase();

    if (!normalizedEmail) {
      setCreditStatus("error");
      setCreditMessage("Enter your email to check credits.");
      return;
    }

    setCreditStatus("checking");
    setCreditMessage("Checking Supabase credits...");
    setError("");

    try {
      const response = await fetch(`/api/credits?email=${encodeURIComponent(normalizedEmail)}`);
      const data = await response.json();

      if (!response.ok) {
        setCreditStatus("error");
        setCreditMessage(data.error || "Could not check credits.");
        return;
      }

      if (data.configured === false) {
        setCreditStatus("error");
        setCreditMessage("Supabase is not configured in this deployment.");
        setCreditBalance(null);
        return;
      }

      window.localStorage.setItem("sellersignal_email", normalizedEmail);
      setEmail(normalizedEmail);
      setCreditBalance(data.balance);
      setCreditStatus("success");
      setCreditMessage(`${data.balance} credit${data.balance === 1 ? "" : "s"} available for ${normalizedEmail}.`);
      setCreditFlash(true);
      window.setTimeout(() => setCreditFlash(false), 1400);
      await refreshHistory(normalizedEmail);
    } catch {
      setCreditStatus("error");
      setCreditMessage("Could not reach the credits endpoint. Check your deployment environment variables.");
    }
  }

  async function refreshHistory(emailToCheck = email) {
    if (!emailToCheck) return;

    const response = await fetch(`/api/report-history?email=${encodeURIComponent(emailToCheck)}`);
    const data = await response.json();

    if (response.ok) {
      setReportHistory(data.reports || []);
    }
  }

  function showSampleReport() {
    setReport(createDemoReport("https://www.amazon.com/dp/B0SAMPLE123", "growth"));
  }

  function clearAccount() {
    window.localStorage.removeItem("sellersignal_email");
    setEmail("");
    setCreditBalance(null);
    setCreditStatus("idle");
    setCreditMessage("");
    setReportHistory([]);
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
              Paste a competitor product URL and get a crisp one-page report from all retrievable public reviews: complaints,
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
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {activeReportTiers.map((key) => (
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
            <div className="mt-3 flex items-center justify-between gap-3 rounded-md bg-neutral-100 p-3 text-xs text-neutral-600">
              <span>
                {creditBalance === null
                  ? "Use the Account & credits panel below to verify credits."
                  : `${creditBalance} credit${creditBalance === 1 ? "" : "s"} available for this email.`}
              </span>
              <button type="button" onClick={() => refreshCredits()} className="font-semibold text-neutral-950">
                Check credits
              </button>
            </div>
            <button
              disabled={loading}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 font-medium text-white transition hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-70"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {loading ? "Generating..." : "Generate report"}
            </button>
            {loading && (
              <div className="mt-4 overflow-hidden rounded-md border border-neutral-200 bg-neutral-50">
                <div className="h-1 bg-neutral-200">
                  <div
                    className="h-full bg-neutral-950 transition-all duration-700"
                    style={{ width: `${Math.max(16, ((loadingStep + 1) / generationSteps.length) * 100)}%` }}
                  />
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-neutral-900">{generationSteps[loadingStep]}</p>
                  <p className="mt-2 text-xs leading-5 text-neutral-600">{sellerTips[loadingStep]}</p>
                </div>
              </div>
            )}
            {loadingMessage && !loading && <p className="mt-3 text-center text-sm font-medium text-neutral-600">{loadingMessage}</p>}
            <p className="mt-3 text-center text-xs text-neutral-500">{costNote}</p>
            <button type="button" onClick={showSampleReport} className="mt-2 w-full text-center text-xs font-semibold text-neutral-950 underline underline-offset-4">
              View sample report
            </button>
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
            <h2 className="mt-4 text-4xl font-semibold tracking-normal">Buy insight, not a promised scrape count.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-neutral-600">
              Amazon may limit how many public reviews any scraper can retrieve in a run. SellerSignal analyzes every review it can
              access and clearly shows the actual count in your report. Canceling a subscription stops new monthly credits, but your
              unused credits stay in your account.
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
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
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
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
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

        <div className="mt-8 grid gap-8 xl:grid-cols-2">
          <ComparisonTable
            title="Compare one-time packages"
            description="Each package analyzes every public review the data source can retrieve during the run."
            columns={[
              { key: "starter", label: "Quick Signal" },
              { key: "growth", label: "Research Pack" },
              { key: "pro", label: "Market Pack" },
            ]}
            rows={oneTimeCompare}
          />
          <ComparisonTable
            title="Compare monthly plans"
            description="Monthly credits never expire, even if the subscription is canceled later."
            columns={[
              { key: "starter", label: "Solo" },
              { key: "growth", label: "Brand" },
            ]}
            rows={subscriptionCompare}
          />
        </div>

        <p className="mt-6 rounded-lg border border-neutral-200 bg-white p-4 text-sm leading-6 text-neutral-500">{complianceCopy}</p>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12">
        <div className="border-t border-neutral-300 pt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">Report history</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-normal">Saved reports stay available after refresh.</h2>
            </div>
            <button type="button" onClick={() => refreshHistory()} className="rounded-md border border-neutral-300 px-4 py-3 text-sm font-semibold">
              Refresh history
            </button>
          </div>

          {reportHistory.length === 0 ? (
            <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-6 text-sm leading-6 text-neutral-500">
              Enter your email and generate a report to see saved history here. Reports are stored with the email/account that created them.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {reportHistory.map((savedReport) => (
                <button
                  key={savedReport.id}
                  type="button"
                  onClick={() => setReport(savedReport.report)}
                  className="rounded-lg border border-neutral-200 bg-white p-5 text-left transition hover:border-neutral-950"
                >
                  <FileText className="mb-4 size-5" />
                  <span className="block text-base font-semibold">{savedReport.productName}</span>
                  <span className="mt-3 block text-sm text-neutral-500">
                    {savedReport.reviewCount} retrieved • {new Date(savedReport.createdAt).toLocaleDateString()}
                  </span>
                  <span className="mt-4 block text-xs font-semibold text-neutral-950">Open report</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className={`rounded-lg border bg-white p-5 transition-colors ${creditFlash ? "border-emerald-500 bg-emerald-50" : "border-neutral-200"}`}>
          <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">Account & credits</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal">Check your available report credits.</h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                Use the same email you used at checkout or during testing. SellerSignal will remember it on this browser so you can
                come back and reopen saved reports.
              </p>
            </div>
            <div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@brand.com"
                  className="h-12 rounded-md border border-neutral-200 px-3 outline-none focus:border-neutral-950"
                />
                <button
                  type="button"
                  onClick={() => refreshCredits()}
                  disabled={creditStatus === "checking"}
                  className="flex h-12 items-center justify-center gap-2 rounded-md bg-neutral-950 px-5 text-sm font-semibold text-white disabled:opacity-70"
                >
                  {creditStatus === "checking" && <Loader2 className="size-4 animate-spin" />}
                  Check credits
                </button>
                <button type="button" onClick={clearAccount} className="h-12 rounded-md border border-neutral-200 px-4 text-sm font-semibold">
                  Clear
                </button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
                <div className="rounded-md bg-neutral-100 px-4 py-3">
                  <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Balance</span>
                  <span className="mt-1 block text-3xl font-semibold">{creditBalance === null ? "--" : creditBalance}</span>
                </div>
                <p
                  className={`text-sm leading-6 ${
                    creditStatus === "success" ? "text-emerald-700" : creditStatus === "error" ? "text-red-600" : "text-neutral-500"
                  }`}
                >
                  {creditMessage || "Enter your email and click Check credits to confirm Vercel is connected to Supabase."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {report && (
        <section ref={reportRef} className="mx-auto max-w-7xl px-5 pb-16 scroll-mt-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-y border-neutral-300 py-5">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-neutral-500">
                {report.demoMode ? "Demo report" : "Live report"}
              </p>
              <h2 className="mt-2 max-w-5xl text-3xl font-semibold leading-tight">{report.productName}</h2>
            </div>
            <button onClick={downloadPdf} className="flex items-center gap-2 rounded-md bg-neutral-950 px-4 py-3 text-sm text-white">
              <ArrowDownToLine className="size-4" />
              Download PDF
            </button>
          </div>

          {reportShortfall && (
            <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              {reportShortfall}
            </div>
          )}

          <div className="grid gap-6 py-8 lg:grid-cols-[.7fr_1.3fr]">
            <div>
              <ChartNoAxesCombined className="mb-4 size-6" />
              <p className="text-4xl font-semibold">{report.ratingBreakdown.average.toFixed(1)}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-neutral-600">
                <span className="rounded-full bg-white px-3 py-1">{report.reviewCount} analyzed</span>
                {report.requestedReviewCount && <span className="rounded-full bg-white px-3 py-1">Best-effort retrieval</span>}
              </div>
              <p className="mt-6 text-base leading-7 text-neutral-700">{report.executiveSummary}</p>
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

function ComparisonTable({
  title,
  description,
  columns,
  rows,
}: {
  title: string;
  description: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string>[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 p-5">
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-neutral-500">{description}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="w-44 px-4 py-3 font-semibold text-neutral-600">Feature</th>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 font-semibold text-neutral-950">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.feature} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3 font-medium text-neutral-950">{row.feature}</td>
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 leading-6 text-neutral-600">
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
