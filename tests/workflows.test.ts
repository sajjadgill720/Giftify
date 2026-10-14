import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { migrate, scoped, DB } from "../packages/domain/src/db";
import {
  newSession,
  quote,
  orderFromQuote,
  runRender,
  approve,
  captured,
  release,
} from "../packages/domain/src/commerce";
import {
  saveDraft,
  createRequest,
  reviseProof,
  advanceProduction,
  recordShipment,
  resolveRequest,
  createOpsSession,
  opsActor,
} from "../packages/domain/src/workflows";
import {
  enqueueVerifiedEvent,
  runPaymentInbox,
  postVerifiedRefund,
} from "../packages/domain/src/payment-inbox";
import { sampleDesign, catalog } from "../packages/domain/src/index";
import { svg, pdf, hash } from "../packages/rendering/src/index";
import { validLocalCredential } from "../packages/integrations/src/auth";
const db = new PGlite() as unknown as DB;
let a: { id: string; token: string }, b: { id: string; token: string };
const address = {
  name: "Test recipient",
  phone: "03001234567",
  line: "Test address only",
  city: "Islamabad",
  country: "PK",
  confirmed: true,
};
before(async () => {
  await migrate(db);
  a = await newSession(db);
  b = await newSession(db);
});
after(() => db.close());
async function make() {
  const q = await quote(db, a.id, {
    ...sampleDesign(),
    title: "Our next chapter",
    date: "14.10.2026",
  });
  const o = await orderFromQuote(db, a.id, q.id);
  await db.query("UPDATE art.orders SET address=$2 WHERE id=$1", [
    o.id,
    address,
  ]);
  while (await runRender(db)) {}
  return (await db.query("SELECT * FROM art.orders WHERE id=$1", [o.id]))
    .rows[0];
}
async function fund(o: Record<string, any>) {
  const tracker = "track_" + o.id;
  await db.query("UPDATE art.orders SET tracker=$2 WHERE id=$1", [
    o.id,
    tracker,
  ]);
  await captured(
    db,
    o.id,
    "evt_capture_" + o.id,
    o.price.total,
    "PKR",
    tracker,
  );
  return tracker;
}
test("all versioned artworks export exact A4 and A3 proofs; legacy art remains stable", async () => {
  const outputs = new Set<string>();
  for (const p of catalog.filter(p => p.version < 4))
    for (const size of ["A4", "A3"] as const) {
      const d = { ...sampleDesign(p.id), size };
      const bytes = await pdf(d);
      outputs.add(hash(bytes));
      const box = /\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(
        bytes.toString("latin1"),
      );
      assert.ok(box);
      const expected = size === "A4" ? [595.276, 841.89] : [841.89, 1190.551];
      assert.ok(Math.abs(Number(box[1]) - expected[0]) < 0.01);
      assert.ok(Math.abs(Number(box[2]) - expected[1]) < 0.01);
      assert.ok(
        svg(d).includes(size === "A4" ? 'width="210mm"' : 'width="297mm"'),
      );
    }
  assert.equal(outputs.size, catalog.filter(p => p.version < 4).length * 2);
  assert.ok(
    svg({ ...sampleDesign("chapter"), version: 1 }).includes("#234e45"),
  );
});
test("durable drafts are private and another owner cannot edit or enumerate them", async () => {
  const d = await saveDraft(db, a.id, sampleDesign());
  await assert.rejects(saveDraft(db, b.id, sampleDesign(), d.id));
  const r = await scoped(db, b.id, "guest", (tx) =>
    tx.query("SELECT * FROM art.drafts"),
  );
  assert.equal(r.rows.length, 0);
  const updated = await saveDraft(
    db,
    a.id,
    { ...sampleDesign(), title: "Updated draft" },
    d.id,
    d.revision,
  );
  assert.equal(updated.design.title, "Updated draft");
});
test("included wording revision clears approval, preserves purchase and old PDF, and requires new approval", async () => {
  const o = await make();
  await approve(db, a.id, o.id, o.proof_hash);
  await createRequest(db, a.id, o.id, {
    category: "revision",
    message: "Please change the title to Our happy chapter.",
  });
  await assert.rejects(
    reviseProof(db, o.id, { ...o.design, size: "A4" }, "named-ops"),
    /new quote/,
  );
  await reviseProof(
    db,
    o.id,
    { ...o.design, title: "Our happy chapter" },
    "named-ops",
  );
  const changed = (
    await db.query("SELECT * FROM art.orders WHERE id=$1", [o.id])
  ).rows[0];
  assert.equal(changed.approved_hash, null);
  assert.equal(changed.proof_hash, null);
  assert.equal(changed.design.title, o.design.title);
  while (await runRender(db)) {}
  const ready = (await db.query("SELECT * FROM art.orders WHERE id=$1", [o.id]))
    .rows[0];
  assert.notEqual(ready.proof_hash, o.proof_hash);
  await assert.rejects(approve(db, a.id, o.id, o.proof_hash));
  await approve(db, a.id, o.id, ready.proof_hash);
  assert.equal(
    (
      await db.query("SELECT * FROM art.proof_history WHERE order_id=$1", [
        o.id,
      ])
    ).rows.length,
    2,
  );
  await assert.rejects(reviseProof(db, o.id, o.design, "ops"), /unavailable/);
});
test("support ownership and open revision block release; response is private", async () => {
  const o = await make();
  await fund(o);
  await approve(db, a.id, o.id, o.proof_hash);
  await assert.rejects(
    createRequest(db, b.id, o.id, {
      category: "other",
      message: "Unauthorized request",
    }),
  );
  const r = await createRequest(db, a.id, o.id, {
    category: "revision",
    message: "Please confirm the wording is correct.",
  });
  await assert.rejects(release(db, o.id), /blocked/);
  const foreign = await scoped(db, b.id, "guest", (tx) =>
    tx.query("SELECT * FROM art.requests WHERE id=$1", [r.id]),
  );
  assert.equal(foreign.rows.length, 0);
  await resolveRequest(
    db,
    r.id,
    "The existing wording matches your submitted design.",
    "ops-user",
  );
  await release(db, o.id, "ops-user");
  await assert.rejects(reviseProof(db, o.id, o.design, "ops-user"));
});
test("production and courier transitions require real evidence and valid order state", async () => {
  const o = await make();
  await assert.rejects(
    advanceProduction(db, o.id, "printing", "Supplier reference test", "ops"),
  );
  await fund(o);
  await approve(db, a.id, o.id, o.proof_hash);
  await release(db, o.id, "ops-user");
  await assert.rejects(
    advanceProduction(db, o.id, "ready", "Quality checked reference", "ops"),
  );
  await assert.rejects(advanceProduction(db, o.id, "printing", "", "ops"));
  for (const state of ["printing", "qa", "ready"])
    await advanceProduction(
      db,
      o.id,
      state,
      "Test evidence fixture; not an actual supplier",
      "ops-user",
    );
  const shipment = {
    carrier: "Test carrier fixture",
    reference: "TEST-REFERENCE",
    state: "booked",
    evidence: "Test evidence fixture; not a real shipment",
  };
  await assert.rejects(
    recordShipment(db, o.id, { ...shipment, state: "delivered" }, "ops"),
  );
  await recordShipment(db, o.id, shipment, "ops-user");
  await assert.rejects(
    recordShipment(
      db,
      o.id,
      { ...shipment, state: "in-transit", reference: "OTHER-REFERENCE" },
      "ops",
    ),
  );
  await recordShipment(
    db,
    o.id,
    { ...shipment, state: "in-transit" },
    "ops-user",
  );
  await recordShipment(
    db,
    o.id,
    { ...shipment, state: "delivered" },
    "ops-user",
  );
  assert.equal(
    (await db.query("SELECT fulfillment FROM art.orders WHERE id=$1", [o.id]))
      .rows[0].fulfillment,
    "delivered",
  );
  const audits = (
    await db.query("SELECT actor FROM art.audit WHERE order_id=$1", [o.id])
  ).rows;
  assert.ok(audits.some((a) => a.actor === "ops-user"));
});
test("verified inbox is durable and replay-safe; partial/full refunds are monotonic and balanced", async () => {
  const o = await make(),
    tracker = "track_" + o.id;
  await db.query("UPDATE art.orders SET tracker=$2 WHERE id=$1", [
    o.id,
    tracker,
  ]);
  const event = {
    token: "evt_inbox_" + o.id,
    merchant_api_key: "test-fixture",
    type: "payment.succeeded",
    data: {
      tracker,
      amount: o.price.total,
      currency: "PKR",
      metadata: { order_id: o.id },
    },
  };
  await enqueueVerifiedEvent(db, event);
  await enqueueVerifiedEvent(db, event);
  assert.equal(
    (
      await db.query("SELECT * FROM art.payment_inbox WHERE order_id=$1", [
        o.id,
      ])
    ).rows.length,
    1,
  );
  const provider = async () => ({
    token: tracker,
    purchase_totals: {
      quote_amount: { amount: o.price.total, currency: "PKR" },
    },
    state: "TRACKER_ENDED",
  });
  await runPaymentInbox(db, o.id, provider);
  assert.equal(
    (await db.query("SELECT payment FROM art.orders WHERE id=$1", [o.id]))
      .rows[0].payment,
    "captured",
  );
  await postVerifiedRefund(
    db,
    o.id,
    "evt_refund1_" + o.id,
    tracker,
    o.price.total - 100000,
    "PKR",
  );
  await postVerifiedRefund(
    db,
    o.id,
    "evt_refund1_" + o.id,
    tracker,
    o.price.total - 100000,
    "PKR",
  );
  await postVerifiedRefund(db, o.id, "evt_refund2_" + o.id, tracker, 0, "PKR");
  await postVerifiedRefund(
    db,
    o.id,
    "evt_late_" + o.id,
    tracker,
    o.price.total - 50000,
    "PKR",
  );
  await captured(
    db,
    o.id,
    "late_capture_" + o.id,
    o.price.total,
    "PKR",
    tracker,
  );
  const refunded = (
    await db.query("SELECT * FROM art.orders WHERE id=$1", [o.id])
  ).rows[0];
  assert.equal(refunded.payment, "refunded");
  assert.equal(Number(refunded.refunded_amount), o.price.total);
  const ledger = (
    await db.query("SELECT * FROM art.journal WHERE order_id=$1", [o.id])
  ).rows;
  assert.equal(ledger.length, 3);
  assert.ok(
    ledger.every(
      (l) => l.debit === l.credit && l.debit_account !== l.credit_account,
    ),
  );
  assert.equal(
    ledger
      .filter((l) => l.kind === "provider refund")
      .reduce((n, l) => n + Number(l.debit), 0),
    o.price.total,
  );
});
test("payment mismatch cannot post funds and refund inbox holds production immediately", async () => {
  const o = await make(),
    tracker = "track_" + o.id;
  await db.query("UPDATE art.orders SET tracker=$2 WHERE id=$1", [
    o.id,
    tracker,
  ]);
  await assert.rejects(
    enqueueVerifiedEvent(db, {
      token: "evt_bad_" + o.id,
      merchant_api_key: "test",
      type: "payment.succeeded",
      data: {
        tracker,
        amount: 1,
        currency: "PKR",
        metadata: { order_id: o.id },
      },
    }),
  );
  await enqueueVerifiedEvent(db, {
    token: "evt_hold_" + o.id,
    merchant_api_key: "test",
    type: "payment.refunded",
    data: {
      tracker,
      balance: 0,
      refund_amount: o.price.total,
      currency: "PKR",
    },
  });
  assert.equal(
    (await db.query("SELECT production FROM art.orders WHERE id=$1", [o.id]))
      .rows[0].production,
    "hold",
  );
  await assert.rejects(
    postVerifiedRefund(db, o.id, "evt_uncaptured", tracker, 0, "PKR"),
  );
});
test("operations cookie tokens are hashed and expiring; local credentials are rejected in production", async () => {
  const token = await createOpsSession(db, "named-local-operator");
  assert.equal(await opsActor(db, token), "named-local-operator");
  await assert.rejects(opsActor(db, "random"));
  await db.query(
    "UPDATE art.ops_sessions SET expires_at=now()-interval '1 second' WHERE token_hash=$1",
    [hash(token)],
  );
  await assert.rejects(opsActor(db, token));
  const env = process.env as Record<string, string | undefined>;
  const previous = env.NODE_ENV;
  env.NODE_ENV = "production";
  assert.equal(validLocalCredential(process.env.OPS_TOKEN || ""), false);
  if (previous === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = previous;
});
test("stale proof version cannot approve a revision even when the PDF bytes are identical", async () => {
  const o = await make();
  await approve(db, a.id, o.id, o.proof_hash, 0);
  await createRequest(db, a.id, o.id, {
    category: "revision",
    message: "Please prepare the same wording again for review.",
  });
  await reviseProof(db, o.id, o.design, "ops");
  while (await runRender(db)) {}
  const revised = (
    await db.query("SELECT * FROM art.orders WHERE id=$1", [o.id])
  ).rows[0];
  assert.equal(revised.proof_hash, o.proof_hash);
  await assert.rejects(approve(db, a.id, o.id, o.proof_hash, 0));
  await approve(db, a.id, o.id, o.proof_hash, 1);
  assert.equal(
    (
      await db.query("SELECT approved_revision FROM art.orders WHERE id=$1", [
        o.id,
      ])
    ).rows[0].approved_revision,
    1,
  );
});
