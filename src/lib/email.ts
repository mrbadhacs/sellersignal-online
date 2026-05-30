import { Resend } from "resend";
import { InsightReport } from "./types";

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function listSection(title: string, items: string[]) {
  if (items.length === 0) return "";
  return `
    <h2 style="font-size:18px;margin:28px 0 10px;">${escapeHtml(title)}</h2>
    <ul style="padding-left:22px;margin:0;">
      ${items.map((item) => `<li style="margin:0 0 10px;">${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

export async function emailReport(to: string | undefined, report: InsightReport) {
  const resend = getResend();
  const from = process.env.REPORT_FROM_EMAIL;

  if (!to || !resend || !from) return;

  await resend.emails.send({
    from,
    to,
    subject: `Your ${report.productName} review intelligence report`,
    html: `
      <div style="font-family:Arial,sans-serif;color:#111;line-height:1.55;max-width:720px;margin:0 auto;padding:24px;">
        <p style="letter-spacing:0.24em;text-transform:uppercase;color:#777;font-size:12px;margin:0 0 8px;">SellerSignal report</p>
        <h1 style="font-size:28px;line-height:1.15;margin:0 0 14px;">${escapeHtml(report.productName)}</h1>
        <p style="color:#555;margin:0 0 18px;">
          ${escapeHtml(report.reviewCount)} reviews analyzed${report.requestedReviewCount ? " from best-effort public retrieval" : ""}.
        </p>
        ${
          report.requestedReviewCount && report.reviewCount < report.requestedReviewCount
            ? `<p style="background:#f5f5f5;border-radius:8px;padding:12px 14px;color:#555;">SellerSignal uses every public review the data source allows us to retrieve during the run. Package names are insight levels, not guaranteed review counts.</p>`
            : ""
        }
        <h2 style="font-size:18px;margin:28px 0 10px;">Executive summary</h2>
        <p>${escapeHtml(report.executiveSummary)}</p>
        ${listSection("Top compliments", report.topCompliments)}
        ${listSection("Top complaints", report.topComplaints)}
        ${listSection("Common phrases", report.commonPhrases)}
        ${listSection("Product improvements", report.productImprovements)}
        ${listSection("Positioning angles", report.positioningAngles)}
        ${listSection("Copy ideas", report.marketingCopyIdeas)}
      </div>
    `,
  });
}
