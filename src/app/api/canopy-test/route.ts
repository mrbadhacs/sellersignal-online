import { NextResponse } from "next/server";
import { testCanopyProvider } from "@/lib/apify";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const asin = searchParams.get("asin");

  if (!asin) {
    return NextResponse.json({ error: "ASIN is required. Example: /api/canopy-test?asin=B0C3TV6Q63" }, { status: 400 });
  }

  try {
    const result = await testCanopyProvider(asin);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Canopy test failed." },
      { status: 400 },
    );
  }
}
