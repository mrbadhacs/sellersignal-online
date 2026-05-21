import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseAdmin: SupabaseClient | null = null;

export function hasSupabaseAdmin() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase is not configured.");
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }

  return supabaseAdmin;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function getOrCreateProfile(email: string, stripeCustomerId?: string | null) {
  const supabase = getSupabaseAdmin();
  const normalizedEmail = normalizeEmail(email);

  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id,email,stripe_customer_id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (selectError) throw selectError;

  if (existing) {
    if (stripeCustomerId && existing.stripe_customer_id !== stripeCustomerId) {
      await supabase.from("profiles").update({ stripe_customer_id: stripeCustomerId }).eq("id", existing.id);
    }
    return existing;
  }

  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({ email: normalizedEmail, stripe_customer_id: stripeCustomerId || null })
    .select("id,email,stripe_customer_id")
    .single();

  if (insertError) throw insertError;
  return created;
}

export async function getCreditBalance(userId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("credit_ledger").select("amount").eq("user_id", userId);

  if (error) throw error;
  return data.reduce((sum, row) => sum + Number(row.amount), 0);
}

export async function addCredits(input: {
  userId: string;
  amount: number;
  reason: string;
  stripeEventId?: string;
}) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("credit_ledger").insert({
    user_id: input.userId,
    amount: input.amount,
    reason: input.reason,
    stripe_event_id: input.stripeEventId || null,
  });

  if (error && !String(error.message).includes("duplicate")) throw error;
}
