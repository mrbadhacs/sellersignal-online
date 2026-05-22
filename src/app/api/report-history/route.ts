import { NextResponse } from "next/server";
import { getOrCreateProfile, getSupabaseAdmin, hasSupabaseAdmin } from "@/lib/supabase-admin";
import { InsightReport } from "@/lib/types";

type ReportRow = {
  id: string;
  product_name: string | null;
  product_url: string;
  review_count: number | null;
  report_json: InsightReport;
  created_at: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  if (!hasSupabaseAdmin()) {
    return NextResponse.json({ reports: [], configured: false });
  }

  const profile = await getOrCreateProfile(email);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("reports")
    .select("id,product_name,product_url,review_count,report_json,created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    return NextResponse.json({ error: "Could not fetch report history." }, { status: 500 });
  }

  const reports = (data as ReportRow[]).map((row) => ({
    id: row.id,
    productName: row.product_name || row.report_json.productName,
    productUrl: row.product_url,
    reviewCount: row.review_count || row.report_json.reviewCount,
    createdAt: row.created_at,
    report: row.report_json,
  }));

  return NextResponse.json({ reports, configured: true });
}
