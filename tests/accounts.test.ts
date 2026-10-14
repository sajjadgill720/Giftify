import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { DB, migrate, scoped, withCustomer } from "../packages/domain/src/db";
import {
  newSession,
  owner,
  quote,
  orderFromQuote,
  runRender,
  approve,
} from "../packages/domain/src/commerce";
import {
  claimPurchaser,
  saveDraft,
  createRequest,
} from "../packages/domain/src/workflows";
import { sampleDesign } from "../packages/domain/src/index";
const db = new PGlite() as unknown as DB;
before(() => migrate(db));
after(() => db.close());
test("verified customer claims retain purchased ownership and allow another owned device, while other accounts remain isolated", async () => {
  const original = await newSession(db),
    otherBuyer = await newSession(db),
    secondDevice = await newSession(db),
    a = randomUUID(),
    b = randomUUID();
  const q = await quote(db, original.id, sampleDesign()),
    order = await orderFromQuote(db, original.id, q.id);
  const draft = await saveDraft(db, original.id, sampleDesign());
  await claimPurchaser(db, original.id, a);
  await claimPurchaser(db, otherBuyer.id, b);
  await claimPurchaser(db, secondDevice.id, a);
  const mine = withCustomer(db, a),
    foreign = withCustomer(db, b);
  await db.query(
    "UPDATE art.sessions SET expires_at=now()-interval '1 second' WHERE id=$1",
    [original.id],
  );
  assert.equal(
    (
      await scoped(mine, secondDevice.id, "guest", (tx) =>
        tx.query("SELECT * FROM art.orders WHERE id=$1", [order.id]),
      )
    ).rows.length,
    1,
  );
  assert.equal(
    (
      await scoped(foreign, otherBuyer.id, "guest", (tx) =>
        tx.query("SELECT * FROM art.orders WHERE id=$1", [order.id]),
      )
    ).rows.length,
    0,
  );
  await assert.rejects(
    saveDraft(foreign, otherBuyer.id, sampleDesign(), draft.id),
  );
  await saveDraft(
    mine,
    secondDevice.id,
    { ...sampleDesign(), title: "Across devices" },
    draft.id,
    draft.revision,
  );
  await assert.rejects(claimPurchaser(db, secondDevice.id, b));
  while (await runRender(db)) {}
  const rendered = (
    await db.query("SELECT * FROM art.orders WHERE id=$1", [order.id])
  ).rows[0];
  await approve(mine, secondDevice.id, order.id, rendered.proof_hash);
  await createRequest(mine, secondDevice.id, order.id, {
    category: "other",
    message: "Help from my second device.",
  });
  assert.equal(
    (await db.query("SELECT owner_id FROM art.orders WHERE id=$1", [order.id]))
      .rows[0].owner_id,
    original.id,
  );
  const oldQuoteOrder = await orderFromQuote(mine, secondDevice.id, q.id);
  assert.equal(oldQuoteOrder.id, order.id);
});
test("unverified guest context cannot select another purchaser’s claimed records", async () => {
  const one = await newSession(db),
    two = await newSession(db);
  const q = await quote(db, one.id, sampleDesign());
  await claimPurchaser(db, one.id, randomUUID());
  const rows = await scoped(db, two.id, "guest", (tx) =>
    tx.query("SELECT * FROM art.quotes WHERE id=$1", [q.id]),
  );
  assert.equal(rows.rows.length, 0);
});
test("claiming disables standalone guest access even when the original token is still fresh", async () => {
  const s = await newSession(db),
    uid = randomUUID();
  const q = await quote(db, s.id, sampleDesign());
  await claimPurchaser(db, s.id, uid);
  await assert.rejects(owner(db, s.token));
  assert.equal(await owner(withCustomer(db, uid), s.token), s.id);
  assert.equal(
    (
      await scoped(db, s.id, "guest", (tx) =>
        tx.query("SELECT * FROM art.quotes WHERE id=$1", [q.id]),
      )
    ).rows.length,
    0,
  );
  assert.equal(
    (
      await scoped(withCustomer(db, uid), s.id, "guest", (tx) =>
        tx.query("SELECT * FROM art.quotes WHERE id=$1", [q.id]),
      )
    ).rows.length,
    1,
  );
});
