import assert from "node:assert/strict";
try {
  process.loadEnvFile(".env");
} catch {}
const base = process.env.APP_URL || "http://localhost:3000";
let cookie = "";
async function call(
  route: string,
  body?: unknown,
  options: { cookie?: string; origin?: string } = {},
) {
  const r = await fetch(base + "/api/" + route, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: options.origin || base,
      Cookie: options.cookie ?? cookie,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const set = r.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  const data = await r.json();
  return { r, data };
}
assert.equal((await fetch(base)).status, 200);
assert.equal((await call("session", {})).r.status, 200);
const design = {
  template: "chapter",
  title: "A new chapter",
  subtitle: "Smoke test",
  date: "06 October 2026",
  size: "A3",
  finish: "black",
};
assert.equal((await call("quotes", { ...design, total: 1 })).r.status, 400);
const { data: q, r: qr } = await call("quotes", design);
assert.equal(qr.status, 201);
assert.equal(q.price.total, 444000);
const checkout = await call("checkouts", {
  quoteId: q.id,
  address: {
    name: "Test Recipient",
    phone: "03001234567",
    line: "Sandbox sample address",
    city: "Islamabad",
    country: "PK",
    confirmed: true,
  },
});
assert.equal(checkout.r.status, 503);
assert.equal(checkout.data.code, "payment_setup_required");
const id = checkout.data.orderId;
const order = await call("orders/" + id);
assert.equal(order.r.status, 200);
assert.equal(order.data.payment, "pending");
assert.ok(order.data.proof_hash);
assert.equal(order.data.fulfillment, "unbooked");
const proof = await fetch(base + `/api/orders/${id}/proof`, {
  headers: { Cookie: cookie },
});
assert.equal(proof.status, 200);
assert.ok(
  Buffer.from(await proof.arrayBuffer())
    .subarray(0, 4)
    .toString() === "%PDF",
);
assert.equal(
  (await call(`orders/${id}/approve-proof`, { hash: "wrong" })).r.status,
  400,
);
assert.equal(
  (await call(`orders/${id}/approve-proof`, { hash: order.data.proof_hash })).r
    .status,
  200,
);
const savedCookie = cookie;
await call("session", {}, { cookie: "" });
assert.equal((await call("orders/" + id)).r.status, 404);
cookie = savedCookie;
assert.equal(
  (await call("quotes", design, { origin: "https://untrusted.example" })).r
    .status,
  403,
);
assert.equal((await call("ops/orders")).r.status, 401);
assert.equal((await call(`ops/orders/${id}/release`, {})).r.status, 401);
console.log(
  "HTTP smoke passed: catalog, guest session, quote tampering, checkout credential gate, private PDF, exact approval, ownership, CSRF and operations auth. No provider payment or shipment simulated.",
);
