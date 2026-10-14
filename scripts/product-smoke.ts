import assert from "node:assert/strict";
import sharp from "sharp";
import { sampleDesign } from "../packages/domain/src/index";
try {
  process.loadEnvFile(".env");
} catch {}
const base = process.env.APP_URL || "http://localhost:3011";
let cookie = "";
async function call(route: string, body?: unknown) {
  const r = await fetch(base + "/api/" + route, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Origin: base,
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const set = r.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  return { status: r.status, data: await r.json() };
}
for (const route of [
  "/",
  "/shop",
  "/products/chapter",
  "/design/chapter",
  "/products/coordinates",
  "/design/coordinates",
  "/orders",
  "/help",
  "/delivery",
  "/privacy",
  "/terms",
  "/ops/orders",
])
  assert.equal((await fetch(base + route)).status, 200, route);
assert.equal((await call("session", {})).status, 200);
const purchaser = cookie;
const design = {
  ...sampleDesign("coordinates"),
  title: "Product smoke fixture",
  subtitle: "No payment or real shipment",
  date: "14.10.2026",
  size: "A3",
  finish: "oak",
};
const draft = await call("drafts", { design });
assert.equal(draft.status, 201);
assert.equal((await call("drafts/" + draft.data.id)).status, 200);
const quote = await call("quotes", design);
assert.equal(quote.status, 201);
assert.equal((await fetch(base + "/checkout/" + quote.data.id)).status, 200);
const invalid = await call("checkouts", {
  quoteId: quote.data.id,
  address: { name: "" },
});
assert.equal(invalid.status, 400);
assert.ok(invalid.data.fields["address.name"]);
const checkout = await call("checkouts", {
  quoteId: quote.data.id,
  address: {
    name: "Test recipient fixture",
    phone: "03001234567",
    line: "Test address fixture only",
    city: "Islamabad",
    country: "PK",
    confirmed: true,
  },
});
assert.equal(checkout.status, 503);
assert.equal(checkout.data.code, "payment_setup_required");
const id = checkout.data.orderId;
const original = (await call("orders/" + id)).data;
assert.equal(original.payment, "pending");
assert.ok(original.proof_hash);
assert.equal("proof_pdf" in original, false);
assert.equal("proof_storage_key" in original, false);
const proof = await fetch(base + `/api/orders/${id}/proof`, {
  headers: { Cookie: purchaser },
});
assert.equal(proof.status, 200);
assert.equal(proof.headers.get("content-type"), "image/jpeg");
const metadata = await sharp(Buffer.from(await proof.arrayBuffer())).metadata();
assert.ok(metadata.width! <= 640 && metadata.height! <= 640);
assert.equal((await call(`orders/${id}/proof?download=1`)).status, 403);
assert.equal((await call(`ops/orders/${id}/export`)).status, 401);
const saved = await call("drafts", {
  id: draft.data.id,
  revision: draft.data.revision,
  design: { ...design, title: "Accepted autosave fixture" },
});
assert.equal(saved.status, 201);
assert.equal(
  (
    await call("drafts", {
      id: draft.data.id,
      revision: draft.data.revision,
      design,
    })
  ).status,
  409,
);
assert.equal(
  (
    await call(`orders/${id}/approve-proof`, {
      hash: original.proof_hash,
      revision: original.proof_revision,
    })
  ).status,
  200,
);
const request = await call(`orders/${id}/requests`, {
  category: "revision",
  message: "Please change the title to Revised smoke fixture.",
});
assert.equal(request.status, 201);
cookie = "";
await call("session", {});
assert.equal((await call("drafts/" + draft.data.id)).status, 404);
assert.equal((await call("orders/" + id)).status, 404);
cookie = purchaser;
assert.equal((await call("ops/orders")).status, 401);
const login = await call("ops/login", { credential: process.env.OPS_TOKEN });
assert.equal(login.status, 200);
const operator = cookie;
const list = await call("ops/orders");
assert.equal(list.status, 200);
assert.ok(list.data.some((o: any) => o.id === id));
assert.equal((await call(`ops/orders/${id}/export`)).status, 400);
assert.equal((await call(`ops/orders/${id}/release`, {})).status, 400);
assert.equal(
  (
    await call(`ops/orders/${id}/shipment`, {
      carrier: "Test fixture",
      reference: "TEST-NOT-SHIPPED",
      state: "delivered",
      evidence: "Test fixture; no actual shipment",
    })
  ).status,
  400,
);
assert.equal(
  (
    await call(`ops/orders/${id}/revise`, {
      design: { ...design, title: "Revised smoke fixture" },
    })
  ).status,
  200,
);
cookie = purchaser;
const revised = (await call("orders/" + id)).data;
assert.equal(revised.approved_hash, null);
assert.notEqual(revised.proof_hash, original.proof_hash);
assert.equal(revised.design.title, design.title);
assert.equal(revised.proof_design.title, "Revised smoke fixture");
assert.equal(revised.requests[0].status, "resolved");
const duplicated = await call(`orders/${id}/duplicate`, {});
assert.equal(duplicated.status, 201);
assert.equal(duplicated.data.design.title, "Revised smoke fixture");
assert.equal(
  (
    await call(`drafts/${draft.data.id}/archive`, {
      revision: saved.data.revision,
    })
  ).status,
  200,
);
assert.equal((await call(`drafts/${draft.data.id}`)).status, 404);
assert.equal(
  (
    await call(`orders/${id}/approve-proof`, {
      hash: original.proof_hash,
      revision: original.proof_revision,
    })
  ).status,
  400,
);
assert.equal(
  (
    await call(`orders/${id}/approve-proof`, {
      hash: revised.proof_hash,
      revision: revised.proof_revision,
    })
  ).status,
  200,
);
cookie = operator;
assert.equal((await call("ops/logout", {})).status, 200);
cookie = operator;
assert.equal((await call("ops/orders")).status, 401);
console.log(
  "Product HTTP smoke passed: coordinates purchase, bounded JPEG proof, customer production-download denial, admin export gates, private revision-safe drafts, archive/copy, checkout validation, support revision, stale-proof denial, ownership, production/shipment guards, and ops logout. No payment or shipment success simulated.",
);
