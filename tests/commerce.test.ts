import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { migrate, scoped, DB } from "../packages/domain/src/db";
import {
  newSession,
  owner,
  quote,
  orderFromQuote,
  approve,
  captured,
  release,
  runRender,
  holdRefund,
} from "../packages/domain/src/commerce";
import { Design, addressSchema } from "../packages/domain/src/index";
import { hash, pdf, svg } from "../packages/rendering/src/index";
import { verifyWebhook } from "../packages/integrations/src/payments";
import { createHmac, randomUUID } from "node:crypto";
const db = new PGlite() as unknown as DB;
let a: { id: string; token: string }, b: { id: string; token: string };
const design: Design = {
  template: "chapter",
  title: "A new chapter",
  subtitle: "Together since the beginning",
  date: "06 October 2026",
  size: "A3",
  finish: "black",
};
before(async () => {
  await migrate(db);
  a = await newSession(db);
  b = await newSession(db);
});
after(() => db.close());
test("guest tokens are hashed, unknown and expired tokens fail", async () => {
  assert.equal(await owner(db, a.token), a.id);
  await assert.rejects(owner(db, "random"));
  const c = await newSession(db);
  await db.query(
    "UPDATE art.sessions SET expires_at=now()-interval '1 second' WHERE id=$1",
    [c.id],
  );
  await assert.rejects(owner(db, c.token));
  const r = await db.query("SELECT token_hash FROM art.sessions WHERE id=$1", [
    a.id,
  ]);
  assert.notEqual(r.rows[0].token_hash, a.token);
});
test("server pricing rejects client totals and snapshots integer PKR amounts", async () => {
  await assert.rejects(quote(db, a.id, { ...design, total: 1 }));
  const q = await quote(db, a.id, design);
  assert.equal(q.price.total, 444000);
  assert.equal(q.price.taxVersion, "sandbox-unconfirmed");
  const small = await quote(db, a.id, { ...design, size: "A4", finish: "oak" });
  assert.equal(small.price.total, 364000);
});
test("RLS hides another purchaser and FK prevents cross-owner attachments", async () => {
  const q = await quote(db, a.id, design);
  const hidden = await scoped(db, b.id, "guest", (tx) =>
    tx.query("SELECT * FROM art.quotes WHERE id=$1", [q.id]),
  );
  assert.equal(hidden.rows.length, 0);
  await assert.rejects(orderFromQuote(db, b.id, q.id));
  await assert.rejects(
    scoped(db, b.id, "guest", (tx) =>
      tx.query(
        "INSERT INTO art.orders(id,owner_id,quote_id,design,design_hash,price) VALUES($1,$2,$3,$4,$5,$6)",
        [randomUUID(), b.id, q.id, design, q.design_hash, q.price],
      ),
    ),
  );
  const denied = await scoped(db, "", "guest", (tx) =>
    tx.query("SELECT * FROM art.orders"),
  );
  assert.equal(denied.rows.length, 0);
});
test("expired quote cannot create checkout", async () => {
  const q = await quote(db, a.id, design);
  await db.query(
    "UPDATE art.quotes SET expires_at=now()-interval '1 second' WHERE id=$1",
    [q.id],
  );
  await assert.rejects(orderFromQuote(db, a.id, q.id));
});
test("checkout retries are one order and one render job", async () => {
  const q = await quote(db, a.id, design);
  const [x, y] = await Promise.all([
    orderFromQuote(db, a.id, q.id),
    orderFromQuote(db, a.id, q.id),
  ]);
  assert.equal(x.id, y.id);
  const r = await db.query("SELECT * FROM art.jobs WHERE order_id=$1", [x.id]);
  assert.equal(r.rows.length, 1);
});
test("payment replay posts once; exact approved PDF and payment gate release", async () => {
  const q = await quote(db, a.id, design),
    o = await orderFromQuote(db, a.id, q.id);
  await assert.rejects(release(db, o.id));
  while (await runRender(db)) {}
  const ready = (await db.query("SELECT * FROM art.orders WHERE id=$1", [o.id]))
    .rows[0];
  assert.equal(hash(Buffer.from(ready.proof_pdf)), ready.proof_hash);
  await assert.rejects(approve(db, b.id, o.id, ready.proof_hash));
  await assert.rejects(approve(db, a.id, o.id, "changed"));
  await approve(db, a.id, o.id, ready.proof_hash);
  await assert.rejects(release(db, o.id));
  await db.query("UPDATE art.orders SET tracker=$2 WHERE id=$1", [
    o.id,
    "test-" + o.id,
  ]);
  await assert.rejects(captured(db, o.id, "wrong", 1, "PKR", "test-" + o.id));
  await assert.rejects(
    captured(db, o.id, "wrong", "444000" as any, "USD", "test-" + o.id),
  );
  for (let i = 0; i < 10; i++)
    await captured(db, o.id, "replayed", q.price.total, "PKR", "test-" + o.id);
  await captured(
    db,
    o.id,
    "late-success",
    q.price.total,
    "PKR",
    "test-" + o.id,
  );
  assert.equal(
    (await db.query("SELECT * FROM art.journal WHERE order_id=$1", [o.id])).rows
      .length,
    1,
  );
  await db.query("UPDATE art.orders SET address=$2 WHERE id=$1", [
    o.id,
    {
      name: "Sample recipient",
      phone: "03001234567",
      line: "Sandbox sample address",
      city: "Islamabad",
      country: "PK",
      confirmed: true,
    },
  ]);
  await Promise.all([release(db, o.id), release(db, o.id)]);
  assert.equal(
    (
      await db.query("SELECT * FROM art.production_jobs WHERE order_id=$1", [
        o.id,
      ])
    ).rows.length,
    1,
  );
  await db.query(
    "UPDATE art.orders SET payment='refunded',production='hold' WHERE id=$1",
    [o.id],
  );
  await captured(
    db,
    o.id,
    "late-after-refund",
    q.price.total,
    "PKR",
    "test-" + o.id,
  );
  assert.equal(
    (await db.query("SELECT payment FROM art.orders WHERE id=$1", [o.id]))
      .rows[0].payment,
    "refunded",
  );
});
test("crashed worker lease is recovered and capped", async () => {
  const q = await quote(db, a.id, design),
    o = await orderFromQuote(db, a.id, q.id);
  await db.query(
    "UPDATE art.jobs SET status='running',lease_until=now()-interval '1 second' WHERE order_id=$1",
    [o.id],
  );
  await runRender(db);
  assert.equal(
    (await db.query("SELECT status FROM art.jobs WHERE order_id=$1", [o.id]))
      .rows[0].status,
    "done",
  );
});
test("render escapes active content, embeds exact dimensions, rejects unverified Urdu export", async () => {
  const output = svg({ ...design, title: "<script>&" });
  assert.ok(!output.includes("<script>"));
  assert.ok(output.includes("&lt;script&gt;&amp;"));
  assert.ok(output.includes('width="297mm"'));
  assert.ok((await pdf(design)).subarray(0, 4).toString() === "%PDF");
  await assert.rejects(pdf({ ...design, title: "ہماری کہانی" }), /Bilingual/);
});
test("webhook authenticity rejects modified, absent and malformed signatures", () => {
  const raw = JSON.stringify({ token: "evt-1", type: "payment.succeeded" }),
    secret = "test-only";
  const signature = createHmac("sha512", secret).update(raw).digest("hex");
  assert.equal(verifyWebhook(raw, signature, secret).token, "evt-1");
  assert.throws(() => verifyWebhook(raw + " ", signature, secret));
  assert.throws(() => verifyWebhook(raw, null, secret));
  assert.throws(() => verifyWebhook(raw, "00", secret));
});
test("purchased design and price cannot change; guests cannot fund themselves", async () => {
  const q = await quote(db, a.id, design),
    o = await orderFromQuote(db, a.id, q.id);
  await assert.rejects(
    scoped(db, a.id, "guest", (tx) =>
      tx.query("UPDATE art.orders SET payment='captured' WHERE id=$1", [o.id]),
    ),
    /Operations/,
  );
  await assert.rejects(
    scoped(db, a.id, "guest", (tx) =>
      tx.query("UPDATE art.orders SET design=$2 WHERE id=$1", [
        o.id,
        { ...design, title: "changed" },
      ]),
    ),
    /immutable/,
  );
  await assert.rejects(
    scoped(db, a.id, "guest", (tx) =>
      tx.query("UPDATE art.orders SET price=$2 WHERE id=$1", [
        o.id,
        { ...q.price, total: 1 },
      ]),
    ),
    /immutable/,
  );
});
test("refund replay holds production without claiming completed financial reconciliation", async () => {
  const q = await quote(db, a.id, design),
    o = await orderFromQuote(db, a.id, q.id),
    tracker = "refund-" + o.id;
  await db.query("UPDATE art.orders SET tracker=$2 WHERE id=$1", [
    o.id,
    tracker,
  ]);
  await captured(db, o.id, "capture-for-refund", q.price.total, "PKR", tracker);
  await holdRefund(db, o.id, "refund-event", tracker, "PKR");
  await holdRefund(db, o.id, "refund-event", tracker, "PKR");
  assert.equal(
    (await db.query("SELECT production FROM art.orders WHERE id=$1", [o.id]))
      .rows[0].production,
    "hold",
  );
  assert.equal(
    (await db.query("SELECT * FROM art.events WHERE id='refund-event'")).rows
      .length,
    1,
  );
  await assert.rejects(release(db, o.id));
});
test("address consent and supported domestic delivery are validated; exhausted leases fail", async () => {
  const address = {
    name: "Sample recipient",
    phone: "03001234567",
    line: "Sandbox sample address",
    city: "Islamabad",
    country: "PK",
    confirmed: true,
  };
  assert.ok(addressSchema.safeParse(address).success);
  assert.ok(!addressSchema.safeParse({ ...address, confirmed: false }).success);
  assert.ok(!addressSchema.safeParse({ ...address, country: "US" }).success);
  const q = await quote(db, a.id, design),
    o = await orderFromQuote(db, a.id, q.id);
  await db.query(
    "UPDATE art.jobs SET status='running',attempts=3,lease_until=now()-interval '1 second' WHERE order_id=$1",
    [o.id],
  );
  await runRender(db);
  assert.equal(
    (await db.query("SELECT status FROM art.jobs WHERE order_id=$1", [o.id]))
      .rows[0].status,
    "failed",
  );
});
