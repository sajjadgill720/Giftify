import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
function checked(key: string) {
  if (
    !/^assets\/[a-f0-9-]{36}\/(original\.bin|normalized\.jpg|preview\.jpg)$/.test(
      key,
    )
  )
    throw new Error("Invalid private asset key.");
  return key;
}
async function cloud() {
  if (
    !process.env.SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.SUPABASE_STORAGE_BUCKET
  )
    throw new Error(
      "Private photo storage requires Supabase server credentials and a private bucket.",
    );
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  const info = await client.storage.getBucket(bucket);
  if (info.error || info.data.public)
    throw new Error("Customer uploads require an existing private bucket.");
  return client.storage.from(bucket);
}
function directory() {
  const cwd = process.cwd();
  const root =
    process.env.PROJECT_ROOT ||
    (path.basename(cwd) === "web" ? path.resolve(cwd, "../..") : cwd);
  return (
    process.env.ASSET_STORAGE_ROOT || path.join(root, ".local/private-assets")
  );
}
function useCloud() {
  if (process.env.SUPABASE_STORAGE_BUCKET) return true;
  if (
    process.env.NODE_ENV === "production" ||
    (process.env.DATABASE_URL && !process.env.ASSET_STORAGE_ROOT)
  )
    throw new Error(
      "Configure private object storage before accepting customer uploads.",
    );
  return false;
}
export async function putAsset(
  key: string,
  bytes: Buffer,
  contentType: string,
) {
  checked(key);
  if (useCloud()) {
    const result = await (
      await cloud()
    ).upload(key, bytes, { contentType, upsert: false });
    if (result.error) throw new Error("Private upload storage failed.");
  } else {
    const file = path.join(directory(), key);
    await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
    await writeFile(file, bytes, { flag: "wx", mode: 0o600 });
  }
}
export async function getAsset(key: string): Promise<Buffer> {
  checked(key);
  if (useCloud()) {
    const result = await (await cloud()).download(key);
    if (result.error || !result.data)
      throw new Error("Private asset is unavailable.");
    return Buffer.from(await result.data.arrayBuffer());
  }
  return readFile(path.join(directory(), key));
}
export async function removeAssetFiles(keys: string[]) {
  keys.forEach(checked);
  if (useCloud()) {
    const result = await (await cloud()).remove(keys);
    if (result.error) throw new Error("Private asset cleanup failed.");
  } else
    await Promise.all(
      keys.map((key) =>
        unlink(path.join(directory(), key)).catch((e: any) => {
          if (e.code !== "ENOENT") throw e;
        }),
      ),
    );
}
