import { createClient } from "@supabase/supabase-js";
export async function mirrorProof(
  orderId: string,
  checksum: string,
  data: Buffer,
) {
  if (!process.env.SUPABASE_STORAGE_BUCKET) return null;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error("Private proof storage credentials are missing.");
  const c = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  const info = await c.storage.getBucket(bucket);
  if (info.error || info.data.public)
    throw new Error("Proof bucket must exist and be private.");
  const key = `proofs/${orderId}/${checksum}.pdf`;
  const { error } = await c.storage
    .from(bucket)
    .upload(key, data, { contentType: "application/pdf", upsert: false });
  if (
    error &&
    !["409", "Duplicate"].includes(String((error as any).statusCode)) &&
    !error.message.toLowerCase().includes("already exists")
  )
    throw new Error("Private proof storage failed; production is held.");
  return key;
}
