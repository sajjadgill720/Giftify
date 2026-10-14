import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { sampleDesign } from "../packages/domain/src/index";
try {
  process.loadEnvFile(".env");
} catch {}
const base = process.env.APP_URL || "http://localhost:3011";
if (
  !["localhost", "127.0.0.1"].includes(new URL(base).hostname) ||
  process.env.SAFEPAY_SECRET_KEY
)
  throw new Error(
    "Run this unpaid smoke only against local development with payment credentials absent.",
  );
let cookie = "";
async function call(route: string, body?: unknown, bytes?: Buffer) {
  const response = await fetch(base + "/api/" + route, {
    method: body === undefined && !bytes ? "GET" : "POST",
    headers: {
      Origin: base,
      Cookie: cookie,
      "Content-Type": bytes ? "application/octet-stream" : "application/json",
    },
    body: bytes
      ? new Uint8Array(bytes)
      : body === undefined
        ? undefined
        : JSON.stringify(body),
  });
  const set = response.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  return { status: response.status, data: await response.json() };
}
for (const route of [
  "/",
  "/products/photo",
  "/products/family",
  "/products/pet",
  "/products/words",
  "/design/photo",
]) {
  assert.equal((await fetch(base + route)).status, 200, route);
}
await call("session", {});
const purchaser = cookie;
const upload = await call(
  "assets",
  undefined,
  await readFile(".local/ui-fixtures/memory-illustration.jpg"),
);
assert.equal(upload.status, 201);
assert.equal("original_key" in upload.data, false);
const design = {
  ...sampleDesign("couple"),
  title: "Local smoke fixture",
  memory: {
    ...sampleDesign("couple").memory!,
    names: "Test fixture only",
    photos: [
      {
        assetId: upload.data.id,
        x: 0.5,
        y: 0.5,
        zoom: 1,
        rotation: 0 as const,
        filter: "original" as const,
      },
    ],
  },
};
const draft = await call("drafts", { design });
assert.equal(draft.status, 201);
const q = await call("quotes", design);
assert.equal(q.status, 201);
const checkout = await call("checkouts", {
  quoteId: q.data.id,
  address: {
    name: "Local test fixture",
    phone: "03001234567",
    line: "Test address fixture only",
    city: "Islamabad",
    country: "PK",
    confirmed: true,
  },
});
assert.equal(checkout.status, 503);
assert.equal(checkout.data.code, "payment_setup_required");
const id = checkout.data.orderId,
  order = (await call("orders/" + id)).data;
assert.equal(order.payment, "pending");
assert.equal(order.fulfillment, "unbooked");
assert.equal(order.render_error, null);
assert.equal(order.design.memory.photos[0].assetId, upload.data.id);
assert.ok(order.proof_hash);
const proof = await fetch(base + `/api/orders/${id}/proof`, {
  headers: { Cookie: cookie },
});
assert.equal(proof.headers.get("content-type"), "image/jpeg");
const metadata = await sharp(Buffer.from(await proof.arrayBuffer())).metadata();
assert.ok(metadata.width! <= 640 && metadata.height! <= 640);
assert.equal(metadata.exif, undefined);
assert.equal((await call(`assets/${upload.data.id}/original`)).status, 403);
assert.equal((await call(`orders/${id}/proof?download=1`)).status, 403);
cookie = "";
await call("session", {});
assert.equal((await call(`assets/${upload.data.id}/preview`)).status, 404);
assert.equal((await call(`orders/${id}`)).status, 404);
cookie = purchaser;
assert.equal(
  (await call(`ops/orders/${id}/assets/${upload.data.id}/original`)).status,
  401,
);
const config = (await call("config")).data;
if (config.operationsMode === "local") {
  assert.equal(
    (await call("ops/login", { credential: process.env.OPS_TOKEN })).status,
    200,
  );
  const detail = (await call(`ops/orders/${id}`)).data;
  assert.ok(detail.assets.some((a: any) => a.id === upload.data.id));
  const original = await fetch(
    base + `/api/ops/orders/${id}/assets/${upload.data.id}/original`,
    { headers: { Cookie: cookie } },
  );
  assert.equal(original.status, 200);
  assert.equal(
    original.headers.get("content-type"),
    "application/octet-stream",
  );
  assert.equal((await call(`ops/orders/${id}/export`)).status, 400);
  await call("ops/logout", {});
}
console.log(
  "Photo HTTP smoke passed: real private upload, saved draft, server quote, unpaid order with JPEG proof, private ownership and original-download restrictions, admin upload review and unpaid export denial. No payment or shipment was simulated.",
);
