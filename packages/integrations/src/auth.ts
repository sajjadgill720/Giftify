import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
export function authConfigured() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}
function client() {
  if (!authConfigured())
    throw new Error("Supabase Auth credentials are not configured.");
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export function validLocalCredential(value: string) {
  const expected = process.env.OPS_TOKEN || "";
  return (
    !authConfigured() &&
    process.env.NODE_ENV !== "production" &&
    expected.length >= 32 &&
    value.length === expected.length &&
    timingSafeEqual(Buffer.from(value), Buffer.from(expected))
  );
}
export async function signInOperator(
  email: string,
  password: string,
  code?: string,
) {
  const c = client();
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error || !data.session)
    throw new Error("Sign-in failed. Check your credentials.");
  const factor = data.user.factors?.find(
    (f) => f.factor_type === "totp" && f.status === "verified",
  );
  if (!factor)
    throw new Error(
      "An enrolled authenticator is required for operations access.",
    );
  if (!code) throw new Error("Enter your authenticator code.");
  const verified = await c.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code,
  });
  if (verified.error || !verified.data)
    throw new Error("Authenticator verification failed.");
  const token = verified.data.access_token;
  const actor = await verifyOperator(token);
  return { actor, token };
}
export async function verifyOperator(token: string) {
  const { data, error } = await client().auth.getUser(token);
  if (error || !data.user)
    throw new Error("Operations authentication required.");
  const claims = JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString(),
  );
  if (
    claims.aal !== "aal2" ||
    claims.sub !== data.user.id ||
    claims.exp * 1000 < Date.now() ||
    !["ops", "admin"].includes(data.user.app_metadata.role)
  )
    throw new Error(
      "Operations role and multi-factor authentication required.",
    );
  return data.user.id;
}
