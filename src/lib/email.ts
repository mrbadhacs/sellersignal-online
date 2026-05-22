import { Resend } from "resend";
import { InsightReport } from "./types";

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
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
      <h1>${report.productName}</h1>
      <p>${report.reviewCount} reviews analyzed${report.requestedReviewCount ? ` out of ${report.requestedReviewCount} requested` : ""}.</p>
      <p>${report.executiveSummary}</p>
      <h2>Top complaints</h2>
      <ul>${report.topComplaints.map((item) => `<li>${item}</li>`).join("")}</ul>
      <h2>Product improvements</h2>
      <ul>${report.productImprovements.map((item) => `<li>${item}</li>`).join("")}</ul>
    `,
  });
}
