import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { PGlite } from "@electric-sql/pglite";
import { NextRequest } from "next/server";
import { DB, migrate, scoped } from "../packages/domain/src/db";
import { designSchema, sampleDesign } from "../packages/domain/src/index";
import { formatCoordinate } from "../packages/domain/src/coordinates";
import { historyReducer, History } from "../packages/domain/src/editor-history";
import {
  newSession,
  quote,
  orderFromQuote,
  runRender,
  approve,
  captured,
} from "../packages/domain/src/commerce";
import {
  saveDraft,
  archiveDraft,
  createRequest,
  reviseProof,
} from "../packages/domain/src/workflows";
import { productionExport } from "../packages/domain/src/exports";
import { preview } from "../packages/rendering/src/preview";
import { pdf, canonical, hash } from "../packages/rendering/src/index";
import { handle } from "../apps/web/lib/api";
const db = new PGlite() as unknown as DB;
let a: { id: string; token: string }, b: { id: string; token: string };
const base = process.env.APP_URL || "http://localhost:3011";
before(async () => {
  await migrate(db);
  a = await newSession(db);
  b = await newSession(db);
  (globalThis as any).keepsakeDatabase = Promise.resolve(db);
  Object.assign(process.env, { NODE_ENV: "development" });
  process.env.SUPABASE_URL = "";
  process.env.SUPABASE_ANON_KEY = "";
  process.env.OPS_TOKEN = "isolated-test-operator-credential-000000000000000";
});
after(() => db.close());
async function request(
  route: string,
  token = a.token,
  body?: unknown,
  ops = false,
) {
  const req = new NextRequest(base + "/api/" + route, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Origin: base,
      "Content-Type": "application/json",
      Cookie: "purchaser=" + token,
      ...(ops ? { Authorization: "Bearer " + process.env.OPS_TOKEN } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handle(req, {
    params: Promise.resolve({ path: route.split("?")[0].split("/") }),
  });
}
async function make() {
  const q = await quote(db, a.id, {
    ...sampleDesign("coordinates"),
    title: "Isolated test artwork",
  });
  const o = await orderFromQuote(db, a.id, q.id);
  await runRender(db, o.id);
  return (await db.query("SELECT * FROM art.orders WHERE id=$1", [o.id]))
    .rows[0];
}
test("coordinates enforce finite ranges, compatible version and stable formatting", () => {
  const d = sampleDesign("coordinates");
  assert.ok(designSchema.safeParse(d).success);
  for (const location of [
    { latitude: 91, longitude: 0 },
    { latitude: 0, longitude: NaN },
    { latitude: 0, longitude: 181 },
  ])
    assert.equal(designSchema.safeParse({ ...d, location }).success, false);
  assert.equal(designSchema.safeParse({ ...d, version: 2 }).success, false);
  assert.equal(
    designSchema.safeParse({ ...sampleDesign(), location: d.location }).success,
    false,
  );
  assert.equal(formatCoordinate(-2.11425, "longitude"), "2.11425°W");
  assert.equal(formatCoordinate(52.80558, "latitude"), "52.80558°N");
  assert.equal(formatCoordinate(89.999999, "latitude", "dms"), "90°0'0\"N");
  assert.equal(formatCoordinate(-0, "latitude"), "0.00000°N");
  assert.throws(() => formatCoordinate(Infinity, "latitude"));
  assert.notEqual(
    canonical(d),
    canonical({ ...d, location: { latitude: 0, longitude: 0 } }),
  );
});
test("coordinate themes and typography produce bounded watermarked raster previews and deterministic PDFs", async () => {
  for (const theme of ["ivory", "midnight", "rose"] as const) {
    const d = { ...sampleDesign("coordinates"), theme };
    const bytes = await preview(d),
      meta = await sharp(bytes).metadata();
    assert.equal(meta.format, "jpeg");
    assert.ok(meta.width! <= 640 && meta.height! <= 640);
    assert.equal(meta.exif, undefined);
    assert.equal(hash(await pdf(d)), hash(await pdf(d)));
  }
});
test("history undo and redo restore nested edits and discard a branched future", () => {
  let s: History<ReturnType<typeof sampleDesign>> = {
    past: [],
    present: sampleDesign("coordinates"),
    future: [],
  };
  const original = s.present;
  s = historyReducer(s, {
    type: "edit",
    value: { ...s.present, location: { latitude: 1, longitude: 2 } },
  });
  s = historyReducer(s, { type: "undo" });
  assert.deepEqual(s.present, original);
  s = historyReducer(s, { type: "redo" });
  assert.equal(s.present.location?.latitude, 1);
  s = historyReducer(s, { type: "undo" });
  s = historyReducer(s, {
    type: "edit",
    value: { ...s.present, title: "Another memory" },
  });
  assert.equal(s.future.length, 0);
});
test("conflicting saves and deleted drafts cannot overwrite the last accepted revision or the purchased snapshot", async () => {
  const draft = await saveDraft(db, a.id, sampleDesign("coordinates"));
  const next = await saveDraft(
    db,
    a.id,
    { ...draft.design, title: "Accepted save" },
    draft.id,
    draft.revision,
  );
  await assert.rejects(
    saveDraft(
      db,
      a.id,
      { ...draft.design, title: "Stale save" },
      draft.id,
      draft.revision,
    ),
  );
  await assert.rejects(archiveDraft(db, b.id, draft.id, next.revision));
  const q = await quote(db, a.id, next.design),
    order = await orderFromQuote(db, a.id, q.id);
  await archiveDraft(db, a.id, draft.id, next.revision);
  await assert.rejects(
    saveDraft(db, a.id, draft.design, draft.id, next.revision + 1),
  );
  assert.equal((await request("drafts/" + draft.id)).status, 404);
  assert.equal(
    (await db.query("SELECT design FROM art.orders WHERE id=$1", [order.id]))
      .rows[0].design.title,
    "Accepted save",
  );
});
test("customer proofs contain JPEG pixels only, reject downloads, deny other owners and exclude production fields", async () => {
  const o = await make();
  const proof = await request(`orders/${o.id}/proof`);
  assert.equal(proof.status, 200);
  assert.equal(proof.headers.get("content-type"), "image/jpeg");
  const bytes = Buffer.from(await proof.arrayBuffer());
  assert.ok(bytes.subarray(0, 2).equals(Buffer.from([255, 216])));
  assert.notEqual(hash(bytes), o.proof_hash);
  assert.equal((await request(`orders/${o.id}/proof?download=1`)).status, 403);
  assert.equal((await request(`orders/${o.id}/proof`, b.token)).status, 404);
  assert.equal((await request(`ops/orders/${o.id}/export`)).status, 401);
  const safe = await (await request(`orders/${o.id}`)).json();
  for (const key of [
    "proof_pdf",
    "proof_storage_key",
    "preview",
    "tracker",
    "owner_id",
  ])
    assert.equal(key in safe, false);
});
test("admin export requires funded current approval and records immutable metadata; guests cannot access export history", async () => {
  const o = await make();
  assert.equal(
    (await request(`ops/orders/${o.id}/export`, a.token, undefined, true))
      .status,
    400,
  );
  await approve(db, a.id, o.id, o.proof_hash, 0);
  await assert.rejects(productionExport(db, o.id, "test-operator"));
  const tracker = "track_isolated_" + o.id;
  await db.query("UPDATE art.orders SET tracker=$2 WHERE id=$1", [
    o.id,
    tracker,
  ]);
  // Isolated database financial fixture; no provider call or real payment.
  await captured(
    db,
    o.id,
    "isolated-capture-" + o.id,
    o.price.total,
    "PKR",
    tracker,
  );
  const response = await request(
    `ops/orders/${o.id}/export`,
    a.token,
    undefined,
    true,
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.equal(hash(Buffer.from(await response.arrayBuffer())), o.proof_hash);
  const history = (
    await db.query("SELECT * FROM art.production_exports WHERE order_id=$1", [
      o.id,
    ])
  ).rows;
  assert.equal(history.length, 1);
  assert.equal(history[0].template_version, 3);
  assert.equal(history[0].checksum, o.proof_hash);
  assert.equal(history[0].width_mm, 297);
  assert.equal(
    (
      await scoped(db, a.id, "guest", (tx) =>
        tx.query("SELECT * FROM art.production_exports"),
      )
    ).rows.length,
    0,
  );
  await assert.rejects(
    scoped(db, "", "ops", (tx) =>
      tx.query(
        "UPDATE art.production_exports SET actor='changed' WHERE order_id=$1",
        [o.id],
      ),
    ),
  );
  await createRequest(db, a.id, o.id, {
    category: "revision",
    message: "Please change the wording before printing.",
  });
  await assert.rejects(productionExport(db, o.id, "test-operator"));
  await assert.rejects(
    reviseProof(
      db,
      o.id,
      { ...o.design, location: { latitude: 0, longitude: 0 } },
      "test-operator",
    ),
  );
  await reviseProof(
    db,
    o.id,
    { ...o.design, title: "A revised memory" },
    "test-operator",
  );
  await runRender(db, o.id);
  await assert.rejects(productionExport(db, o.id, "test-operator"));
});
test("copy from an owned order creates an independent draft and rejects a different purchaser", async () => {
  const o = await make();
  assert.equal(
    (await request(`orders/${o.id}/duplicate`, b.token, {})).status,
    404,
  );
  const r = await request(`orders/${o.id}/duplicate`, a.token, {});
  assert.equal(r.status, 201);
  const draft = await r.json();
  assert.deepEqual(draft.design, o.design);
  await saveDraft(
    db,
    a.id,
    { ...draft.design, title: "A fresh story" },
    draft.id,
    draft.revision,
  );
  assert.equal(
    (await db.query("SELECT design FROM art.orders WHERE id=$1", [o.id]))
      .rows[0].design.title,
    o.design.title,
  );
});
