import { getOrCreateProfile, getSupabaseAdmin, normalizeEmail } from "./supabase-admin";

export async function getAuthenticatedProfile(request: Request, requestedEmail?: string | null) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    throw new Error("Sign in with your email code before accessing credits or reports.");
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user?.email) {
    throw new Error("Your sign-in session is invalid or expired. Please request a new email code.");
  }

  const authenticatedEmail = normalizeEmail(data.user.email);
  const targetEmail = requestedEmail ? normalizeEmail(requestedEmail) : authenticatedEmail;

  if (targetEmail !== authenticatedEmail) {
    throw new Error("You can only access credits and reports for the email you signed in with.");
  }

  const profile = await getOrCreateProfile(authenticatedEmail);
  return { profile, email: authenticatedEmail };
}
