import { NextResponse } from "next/server";
import { getReviewProviderStatus } from "@/lib/apify";

export async function GET() {
  return NextResponse.json(getReviewProviderStatus());
}
