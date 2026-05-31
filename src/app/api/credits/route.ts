import { NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/auth";
import { getCreditBalance, hasSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!hasSupabaseAdmin()) {
    return NextResponse.json({ balance: null, configured: false });
  }

  try {
    const { profile, email: authenticatedEmail } = await getAuthenticatedProfile(request, email);
    const balance = await getCreditBalance(profile.id);

    return NextResponse.json({ balance, email: authenticatedEmail, configured: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not authenticate this credit request." },
      { status: 401 },
    );
  }
}
