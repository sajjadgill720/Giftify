import assert from "node:assert/strict";
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
  template: "arch",
  title: "Product smoke fixture",
  subtitle: "No payment or real shipment",
  date: "14.10.2026",
  size: "A3",
  finish: "oak",
  version: 2,
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
assert.equal(
  (await call(`orders/${id}/approve-proof`, { hash: original.proof_hash }))
    .status,
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
assert.equal(
  (await call(`orders/${id}/approve-proof`, { hash: original.proof_hash }))
    .status,
  400,
);
assert.equal(
  (await call(`orders/${id}/approve-proof`, { hash: revised.proof_hash }))
    .status,
  200,
);
cookie = operator;
assert.equal((await call("ops/logout", {})).status, 200);
cookie = operator;
assert.equal((await call("ops/orders")).status, 401);
console.log(
  "Product HTTP smoke passed: all public routes, private drafts, checkout validation, unpaid proof, support revision, cleared approval, stale-proof denial, private ownership, authenticated ops, production/shipment guards, and logout revocation. No payment or shipment success simulated.",
);
