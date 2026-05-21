import { NextResponse } from "next/server";
import { getCreditBalance, getOrCreateProfile, hasSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  if (!hasSupabaseAdmin()) {
    return NextResponse.json({ balance: null, configured: false });
  }

  const profile = await getOrCreateProfile(email);
  const balance = await getCreditBalance(profile.id);

  return NextResponse.json({ balance, configured: true });
}
