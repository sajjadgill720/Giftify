import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { PGlite } from "@electric-sql/pglite";
import { NextRequest } from "next/server";
import { ARTWORK_POLICY_VERSION } from "../packages/domain/src/artwork-policy";
import { DB, migrate, scoped } from "../packages/domain/src/db";
import {
  newSession,
  quote,
  orderFromQuote,
  runRender,
  approve,
  captured,
} from "../packages/domain/src/commerce";
import {
  uploadAsset,
  artworkPictures,
  MAX_UPLOAD,
} from "../packages/domain/src/assets";
import {
  saveDraft,
  createRequest,
  reviseProof,
} from "../packages/domain/src/workflows";
import {
  sampleDesign,
  Design,
  designSchema,
} from "../packages/domain/src/index";
import { cropGeometry, memoryTemplates } from "../packages/domain/src/memory";
import { memoryPictures } from "../packages/rendering/src/memory-layout";
import { pdf, hash } from "../packages/rendering/src/index";
import { preview } from "../packages/rendering/src/preview";
import { handle } from "../apps/web/lib/api";
const db = new PGlite() as unknown as DB;
let a: { id: string; token: string },
  b: { id: string; token: string },
  storage: string,
  photo: any,
  second: any,
  source: Buffer;
const base = process.env.APP_URL || "http://localhost:3011";
before(async () => {
  await migrate(db);
  a = await newSession(db);
  b = await newSession(db);
  storage = await mkdtemp(path.join(tmpdir(), "keepsake-photo-test-"));
  Object.assign(process.env, {
    NODE_ENV: "development",
    ASSET_STORAGE_ROOT: storage,
    SUPABASE_URL: "",
    SUPABASE_ANON_KEY: "",
    SUPABASE_STORAGE_BUCKET: "",
    OPS_TOKEN: "isolated-photo-test-operator-000000000000000",
    MAPTILER_API_KEY: "",
    MAP_PRINT_LICENSE_CONFIRMED: "false",
  });
  (globalThis as any).keepsakeDatabase = Promise.resolve(db);
  source = await sharp({
    create: { width: 3200, height: 2400, channels: 3, background: "#527d6d" },
  })
    .jpeg()
    .toBuffer();
  photo = await uploadAsset(db, a.id, source);
  second = await uploadAsset(
    db,
    a.id,
    await sharp({
      create: { width: 3200, height: 2400, channels: 3, background: "#bd8a59" },
    })
      .png()
      .toBuffer(),
  );
});
after(async () => {
  await db.close();
  if (storage.startsWith(path.join(tmpdir(), "keepsake-photo-test-")))
    await rm(storage, { recursive: true, force: true });
});
async function request(
  route: string,
  token = a.token,
  body?: unknown,
  ops = false,
  bytes?: Buffer,
) {
  return handle(
    new NextRequest(base + "/api/" + route, {
      method: body === undefined && !bytes ? "GET" : "POST",
      headers: {
        Origin: base,
        Cookie: "purchaser=" + token,
        "Content-Type": bytes ? "image/svg+xml" : "application/json",
        ...(bytes ? { "x-artwork-policy": ARTWORK_POLICY_VERSION } : {}),
        ...(ops ? { Authorization: "Bearer " + process.env.OPS_TOKEN } : {}),
      },
      body: bytes
        ? new Uint8Array(bytes)
        : body === undefined
          ? undefined
          : JSON.stringify(body),
    }),
    { params: Promise.resolve({ path: route.split("?")[0].split("/") }) },
  );
}
function design(template: Design["template"] = "photo"): Design {
  const d = sampleDesign(template);
  return {
    ...d,
    memory: {
      ...d.memory!,
      photos: [
        {
          assetId: photo.id,
          x: 0.5,
          y: 0.5,
          zoom: 1,
          rotation: 0,
          filter: "original",
        },
      ],
      qualityAcknowledged: true,
    },
  };
}
test("uploads validate decoded bytes instead of browser MIME, normalize EXIF orientation and strip preview metadata", async () => {
  await assert.rejects(
    uploadAsset(
      db,
      a.id,
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
    ),
  );
  await assert.rejects(uploadAsset(db, a.id, Buffer.from([255, 216, 0, 0])));
  await assert.rejects(uploadAsset(db, a.id, Buffer.alloc(MAX_UPLOAD + 1)));
  const oriented = await uploadAsset(
    db,
    a.id,
    await sharp({
      create: { width: 800, height: 600, channels: 3, background: "#999999" },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer(),
  );
  assert.equal(oriented.width, 600);
  assert.equal(oriented.height, 800);
  const r = await request(`assets/${oriented.id}/preview`);
  assert.equal(r.status, 200);
  const metadata = await sharp(Buffer.from(await r.arrayBuffer())).metadata();
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.orientation, undefined);
  assert.ok(metadata.width! <= 640 && metadata.height! <= 640);
  const uploaded = await request("assets", a.token, undefined, false, source);
  assert.equal(uploaded.status, 201); // Deliberately wrong MIME still uses decoding.
  const missingDeclaration = await handle(
    new NextRequest(base + "/api/assets", {
      method: "POST",
      headers: { Origin: base, Cookie: "purchaser=" + a.token },
      body: new Uint8Array(source),
    }),
    { params: Promise.resolve({ path: ["assets"] }) },
  );
  assert.equal(missingDeclaration.status, 400);
  assert.match((await missingDeclaration.json()).error, /no people or animals/);
  const saved = (
    await db.query("SELECT source_metadata FROM art.assets WHERE id=$1", [
      (await uploaded.json()).id,
    ])
  ).rows[0];
  assert.equal(
    saved.source_metadata.contentDeclaration.version,
    ARTWORK_POLICY_VERSION,
  );
});
test("originals and print images are not customer endpoints, asset IDs are isolated and only safe metadata is returned", async () => {
  assert.equal(
    (await request(`assets/${photo.id}/preview`, b.token)).status,
    404,
  );
  assert.equal((await request(`assets/${photo.id}/original`)).status, 403);
  const safe = await (await request(`assets/${photo.id}`)).json();
  assert.equal(safe.id, photo.id);
  for (const key of [
    "original_key",
    "normalized_key",
    "preview_key",
    "checksum",
    "owner_id",
  ])
    assert.equal(key in safe, false);
  await assert.rejects(saveDraft(db, b.id, design()));
  await assert.rejects(quote(db, b.id, design()));
  assert.equal(
    designSchema.safeParse({
      ...design(),
      memory: {
        ...design().memory!,
        photos: [{ ...design().memory!.photos[0], assetId: "../../private" }],
      },
    }).success,
    false,
  );
});
test("crop geometry is bounded after rotation, quality warnings require acknowledgement and severely low resolution blocks quotes", async () => {
  const p = design().memory!.photos[0];
  const rotatedDesign = design();
  rotatedDesign.memory!.photos[0].rotation = 90;
  const rotatedImages = await artworkPictures(
    db,
    a.id,
    rotatedDesign,
    "guest",
    true,
  );
  const rotatedMeta = await sharp(rotatedImages[0]!).metadata();
  assert.ok(rotatedMeta.width! > 0 && rotatedMeta.height! > 0);
  for (const rotation of [0, 90, 180, 270] as const) {
    const crop = cropGeometry(3200, 2400, 0.8, {
      ...p,
      x: 1,
      y: 1,
      zoom: 3,
      rotation,
    });
    assert.ok(crop.left >= 0 && crop.top >= 0);
    assert.ok(
      crop.left + crop.width <= crop.sourceWidth &&
        crop.top + crop.height <= crop.sourceHeight,
    );
  }
  await assert.rejects(
    quote(db, a.id, {
      ...design(),
      memory: { ...design().memory!, qualityAcknowledged: false },
    }),
    /quality warning/,
  );
  await quote(db, a.id, design());
  await assert.rejects(
    quote(db, a.id, {
      ...design(),
      memory: { ...design().memory!, photos: [{ ...p, zoom: 3 }] },
    }),
    /100 DPI/,
  );
  await assert.rejects(
    quote(db, a.id, sampleDesign("photo")),
    /Upload a photograph/,
  );
});
test("every memory category renders a distinct layout, reuses the uploaded photo and words need no asset", async () => {
  const hashes = new Set<string>();
  for (const template of memoryTemplates.filter((t) => t !== "place")) {
    const d = design(template);
    const textOnly = ["words", "quran", "hadith"].includes(template);
    if (textOnly) {
      d.memory!.mode = "words";
      d.memory!.narrative = "The morning we found a place that felt like home.";
      d.memory!.photos = [];
      if (template !== "words") d.memory!.names = "Test fixture reference";
    }
    if (template === "family")
      d.memory!.photos.push({ ...d.memory!.photos[0], assetId: second.id });
    if (template === "birthday") d.memory!.age = 30;
    const images = await artworkPictures(db, a.id, d, "guest", true),
      bytes = await pdf(d, images);
    hashes.add(hash(bytes));
    assert.ok(bytes.subarray(0, 4).toString() === "%PDF");
    if (!textOnly)
      assert.ok(bytes.toString("latin1").includes("/Subtype /Image"));
    const jpg = await preview(d, await artworkPictures(db, a.id, d, "guest"));
    assert.equal((await sharp(jpg).metadata()).format, "jpeg");
  }
  assert.equal(hashes.size, memoryTemplates.length - 1);
});
test("a photo purchase locks assets, saves a real raster proof, and allows audited originals only to the order operator", async () => {
  const d = design(),
    q = await quote(db, a.id, d),
    o = await orderFromQuote(db, a.id, q.id);
  await runRender(db, o.id);
  const record = (
    await db.query("SELECT * FROM art.orders WHERE id=$1", [o.id])
  ).rows[0];
  assert.ok(record.proof_pdf);
  assert.equal(record.render_error, null);
  assert.equal(
    (await db.query("SELECT * FROM art.order_assets WHERE order_id=$1", [o.id]))
      .rows.length,
    1,
  );
  assert.equal(
    (await request(`ops/orders/${o.id}/assets/${photo.id}/original`)).status,
    401,
  );
  assert.equal(
    (
      await request(
        `ops/orders/${o.id}/assets/${second.id}/original`,
        a.token,
        undefined,
        true,
      )
    ).status,
    404,
  );
  const original = await request(
    `ops/orders/${o.id}/assets/${photo.id}/original`,
    a.token,
    undefined,
    true,
  );
  assert.equal(original.status, 200);
  assert.equal(hash(Buffer.from(await original.arrayBuffer())), hash(source));
  assert.equal((await request(`orders/${o.id}/proof`, b.token)).status, 404);
  const customer = await request(`orders/${o.id}/proof`);
  assert.equal(customer.headers.get("content-type"), "image/jpeg");
  assert.equal(
    (await request(`ops/orders/${o.id}/export`, a.token, undefined, true))
      .status,
    400,
  );
  await approve(db, a.id, o.id, record.proof_hash, 0);
  const tracker = "track_isolated_photo_" + o.id;
  await db.query("UPDATE art.orders SET tracker=$2 WHERE id=$1", [
    o.id,
    tracker,
  ]);
  await captured(
    db,
    o.id,
    "isolated-photo-fixture-" + o.id,
    o.price.total,
    "PKR",
    tracker,
  );
  const final = await request(
    `ops/orders/${o.id}/export`,
    a.token,
    undefined,
    true,
  );
  assert.equal(final.status, 200);
  assert.equal(hash(Buffer.from(await final.arrayBuffer())), record.proof_hash);
  const audits = (
    await db.query("SELECT action FROM art.audit WHERE order_id=$1", [o.id])
  ).rows;
  assert.ok(
    audits.some((a) => a.action.startsWith("Original upload accessed:")),
  );
});
test("full-frame settings survive quote and order snapshots and render through the worker", async () => {
  const d = design();
  d.memory!.layout = "fullbleed";
  d.memory!.font = "editorial";
  d.memory!.titleScale = 1.6;
  d.memory!.textColor = "#663344";
  const q = await quote(db, a.id, d),
    o = await orderFromQuote(db, a.id, q.id);
  await runRender(db, o.id);
  const record = (
    await db.query("SELECT * FROM art.orders WHERE id=$1", [o.id])
  ).rows[0];
  assert.equal(record.design.memory.layout, "fullbleed");
  assert.equal(record.design.memory.titleScale, 1.6);
  assert.equal(record.design.memory.textColor, "#663344");
  assert.equal(record.render_error, null);
  assert.ok(record.proof_pdf);
  assert.equal(record.proof_hash, hash(Buffer.from(record.proof_pdf)));
});
test("asset snapshots are immutable and an included names revision preserves photos while clearing approval", async () => {
  const d = design(),
    q = await quote(db, a.id, d),
    o = await orderFromQuote(db, a.id, q.id);
  await runRender(db, o.id);
  const ready = (await db.query("SELECT * FROM art.orders WHERE id=$1", [o.id]))
    .rows[0];
  await approve(db, a.id, o.id, ready.proof_hash, 0);
  await assert.rejects(
    scoped(db, a.id, "guest", (tx) =>
      tx.query("UPDATE art.assets SET bytes=bytes+1 WHERE id=$1", [photo.id]),
    ),
  );
  await assert.rejects(
    scoped(db, "", "ops", (tx) =>
      tx.query("UPDATE art.assets SET archived=true WHERE id=$1", [photo.id]),
    ),
  );
  await assert.rejects(
    scoped(db, a.id, "guest", (tx) =>
      tx.query("INSERT INTO art.order_assets VALUES($1,$2)", [o.id, second.id]),
    ),
  );
  await createRequest(db, a.id, o.id, {
    category: "revision",
    message: "Please correct the names in the artwork.",
  });
  await assert.rejects(
    reviseProof(
      db,
      o.id,
      {
        ...d,
        memory: {
          ...d.memory!,
          photos: [{ ...d.memory!.photos[0], zoom: 1.1 }],
        },
      },
      "test-operator",
    ),
  );
  await reviseProof(
    db,
    o.id,
    { ...d, memory: { ...d.memory!, names: "Corrected test names" } },
    "test-operator",
  );
  await runRender(db, o.id);
  const revised = (
    await db.query("SELECT * FROM art.orders WHERE id=$1", [o.id])
  ).rows[0];
  assert.equal(revised.approved_hash, null);
  assert.equal(revised.design.memory.names, d.memory!.names);
  assert.equal(revised.proof_design.memory.names, "Corrected test names");
  assert.deepEqual(
    revised.design.memory.photos,
    revised.proof_design.memory.photos,
  );
  await assert.rejects(
    quote(db, a.id, {
      ...d,
      memory: { ...d.memory!, names: "غیر تصدیق شدہ فونٹ" },
    }),
    /English print text/,
  );
});
test("checkout waits for a printable proof and makes no provider call while rendering is pending", async () => {
  const q = await quote(db, a.id, design()),
    o = await orderFromQuote(db, a.id, q.id);
  const fetchBefore = globalThis.fetch,
    secret = process.env.SAFEPAY_SECRET_KEY,
    pub = process.env.SAFEPAY_PUBLIC_KEY;
  let providerCalled = false;
  try {
    process.env.SAFEPAY_SECRET_KEY = "isolated-test-key";
    process.env.SAFEPAY_PUBLIC_KEY = "isolated-test-key";
    globalThis.fetch = async () => {
      providerCalled = true;
      throw new Error("Provider must not be called before rendering.");
    };
    const r = await request(`orders/${o.id}/resume-checkout`, a.token, {});
    assert.equal(r.status, 409);
    assert.equal((await r.json()).code, "proof_preparing");
    assert.equal(providerCalled, false);
  } finally {
    globalThis.fetch = fetchBefore;
    if (secret === undefined) delete process.env.SAFEPAY_SECRET_KEY;
    else process.env.SAFEPAY_SECRET_KEY = secret;
    if (pub === undefined) delete process.env.SAFEPAY_PUBLIC_KEY;
    else process.env.SAFEPAY_PUBLIC_KEY = pub;
  }
});
test("licensed map setup fails closed and a photo checksum mismatch prevents production", async () => {
  const selection = {
    latitude: 0,
    longitude: 0,
    zoom: 12,
    style: "streets-v4" as const,
  };
  const syntheticMap = await uploadAsset(db, a.id, source, "map", {
    selection,
    attribution: "Synthetic test fixture, not geographic data",
  });
  const mapDesign = sampleDesign("place");
  mapDesign.memory!.map = { assetId: syntheticMap.id, ...selection };
  mapDesign.memory!.qualityAcknowledged = true;
  await assert.rejects(
    quote(db, a.id, mapDesign),
    /confirmed commercial print rights/,
  );
  assert.equal(
    (await request("places/search", a.token, { query: "Paris, France" }))
      .status,
    503,
  );
  await assert.rejects(quote(db, a.id, sampleDesign("place")), /licensed map/);
  const unique = await uploadAsset(db, a.id, source),
    d = design();
  d.memory!.photos[0].assetId = unique.id;
  const q = await quote(db, a.id, d),
    o = await orderFromQuote(db, a.id, q.id),
    record = (
      await db.query("SELECT * FROM art.assets WHERE id=$1", [unique.id])
    ).rows[0];
  await writeFile(
    path.join(storage, record.normalized_key),
    Buffer.from("corrupted test fixture"),
  );
  await runRender(db, o.id);
  const order = (await db.query("SELECT * FROM art.orders WHERE id=$1", [o.id]))
    .rows[0];
  assert.equal(order.proof_pdf, null);
  assert.match(order.render_error, /checksum mismatch/);
});
