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

function metric(label: string, value: string | number) {
  return `
    <td style="width:25%;padding:14px 12px;border:1px solid #e5e5e5;border-radius:8px;background:#fafafa;">
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#777;margin-bottom:4px;">${escapeHtml(label)}</div>
      <div style="font-size:24px;line-height:1.1;font-weight:700;color:#111;">${escapeHtml(value)}</div>
    </td>
  `;
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatFromAddress(from: string) {
  if (from.includes("<")) return from;
  const name = process.env.REPORT_FROM_NAME || "Your SellerSignal Report";
  return `${name} <${from}>`;
}

export async function emailReport(to: string | undefined, report: InsightReport) {
  const resend = getResend();
  const from = process.env.REPORT_FROM_EMAIL;

  if (!to) return { sent: false, reason: "missing recipient" };
  if (!resend) return { sent: false, reason: "missing RESEND_API_KEY" };
  if (!from) return { sent: false, reason: "missing REPORT_FROM_EMAIL" };

  const retrievalNote = report.requestedReviewCount
    ? `${report.reviewCount} of ${report.requestedReviewCount} requested reviews analyzed from best-effort public retrieval.`
    : `${report.reviewCount} reviews analyzed.`;

  const result = await resend.emails.send({
    from: formatFromAddress(from),
    to,
    subject: `Your SellerSignal report: ${report.productName}`,
    text: [
      `SellerSignal report: ${report.productName}`,
      retrievalNote,
      `Average rating: ${report.ratingBreakdown.average.toFixed(1)}`,
      `Positive: ${formatPercent(report.ratingBreakdown.positivePercent)} | Neutral: ${formatPercent(report.ratingBreakdown.neutralPercent)} | Negative: ${formatPercent(report.ratingBreakdown.negativePercent)}`,
      "",
      "Executive summary",
      report.executiveSummary,
      "",
      "Top compliments",
      ...report.topCompliments.map((item) => `- ${item}`),
      "",
      "Top complaints",
      ...report.topComplaints.map((item) => `- ${item}`),
      "",
      "Common phrases",
      ...report.commonPhrases.map((item) => `- ${item}`),
      "",
      "Product improvements",
      ...report.productImprovements.map((item) => `- ${item}`),
      "",
      "Positioning angles",
      ...report.positioningAngles.map((item) => `- ${item}`),
      "",
      "Copy ideas",
      ...report.marketingCopyIdeas.map((item) => `- ${item}`),
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;color:#111;line-height:1.55;max-width:720px;margin:0 auto;padding:24px;">
        <p style="letter-spacing:0.24em;text-transform:uppercase;color:#777;font-size:12px;margin:0 0 8px;">SellerSignal report</p>
        <h1 style="font-size:28px;line-height:1.15;margin:0 0 14px;">${escapeHtml(report.productName)}</h1>
        <p style="color:#555;margin:0 0 18px;">
          ${escapeHtml(retrievalNote)}
        </p>
        <table role="presentation" cellspacing="8" cellpadding="0" style="width:100%;border-collapse:separate;border-spacing:8px;margin:0 0 18px -8px;">
          <tr>
            ${metric("Rating", report.ratingBreakdown.average.toFixed(1))}
            ${metric("Positive", formatPercent(report.ratingBreakdown.positivePercent))}
            ${metric("Neutral", formatPercent(report.ratingBreakdown.neutralPercent))}
            ${metric("Negative", formatPercent(report.ratingBreakdown.negativePercent))}
          </tr>
        </table>
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
        <h2 style="font-size:18px;margin:28px 0 10px;">How to use this</h2>
        <ul style="padding-left:22px;margin:0;">
          <li style="margin:0 0 10px;">Turn repeated complaints into product roadmap priorities.</li>
          <li style="margin:0 0 10px;">Use common phrases as customer-language inputs for listing copy and ads.</li>
          <li style="margin:0 0 10px;">Position against the competitor where praise is weak or complaints repeat.</li>
        </ul>
      </div>
    `,
  });

  if (result.error) {
    return { sent: false, reason: result.error.message };
  }

  return { sent: true, id: result.data?.id };
}
