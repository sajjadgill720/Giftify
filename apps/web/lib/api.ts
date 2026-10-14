import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  database,
  migrate,
  scoped,
  DB,
  withCustomer,
} from "../../../packages/domain/src/db";
import {
  newSession,
  owner,
  quote,
  orderFromQuote,
  approve,
  captured,
  release,
  runRender,
} from "../../../packages/domain/src/commerce";
import { catalog, addressSchema } from "../../../packages/domain/src/index";
import {
  saveDraft,
  createRequest,
  reviseProof,
  createOpsSession,
  opsActor,
  resolveRequest,
  advanceProduction,
  recordShipment,
  claimPurchaser,
  archiveDraft,
  DraftConflict,
} from "../../../packages/domain/src/workflows";
import {
  enqueueVerifiedEvent,
  runPaymentInbox,
} from "../../../packages/domain/src/payment-inbox";
import { preview } from "../../../packages/rendering/src/preview";
import { productionExport } from "../../../packages/domain/src/exports";
import {
  uploadAsset,
  assetSummary,
  artworkPictures,
  MAX_UPLOAD,
} from "../../../packages/domain/src/assets";
import { getAsset } from "../../../packages/integrations/src/asset-store";
import sharp from "sharp";
import {
  searchPlaces,
  fetchMap,
} from "../../../packages/integrations/src/maps";
import { hash } from "../../../packages/rendering/src/index";
import {
  authConfigured,
  validLocalCredential,
  signInOperator,
  verifyOperator,
  verifyCustomer,
  signInCustomer,
  signUpCustomer,
  refreshCustomer,
} from "../../../packages/integrations/src/auth";
import {
  createCheckout,
  checkoutURL,
  reconcile,
  verifyWebhook,
} from "../../../packages/integrations/src/payments";
let initialized: Promise<void> | undefined;
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
const buckets = new Map<string, { count: number; until: number }>();
function limit(key: string, max = 90) {
  const now = Date.now();
  if (buckets.size > 5000)
    for (const [k, v] of buckets) if (v.until < now) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || b.until < now) {
    buckets.set(key, { count: 1, until: now + 60000 });
    return false;
  }
  return ++b.count > max;
}
async function operator(req: NextRequest, db: DB) {
  const jwt = req.cookies.get("ops_auth")?.value;
  if (jwt) return verifyOperator(jwt);
  const cookie = req.cookies.get("ops_session")?.value;
  if (cookie) {
    if (authConfigured() || process.env.NODE_ENV === "production")
      throw new Error("Named operations authentication required.");
    return opsActor(db, cookie);
  }
  const bearer =
    req.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  if (validLocalCredential(bearer)) return "local-operator";
  throw new Error("Operations authentication required.");
}
function safeOrder(o: Record<string, any>) {
  const {
    proof_pdf,
    proof_storage_key,
    checkout_url,
    owner_id,
    tracker,
    ...safe
  } = o;
  return {
    ...safe,
    previewUrl: `/api/orders/${o.id}/proof?revision=${o.proof_revision}`,
    hasCheckout: !!tracker,
    canCheckout: !!(
      process.env.SAFEPAY_SECRET_KEY &&
      process.env.SAFEPAY_PUBLIC_KEY &&
      (o.proof_hash || tracker) &&
      !o.render_error
    ),
  };
}
async function startCheckout(db: DB, id: string, o: Record<string, any>) {
  if (o.payment !== "pending")
    return json(
      {
        error: "Payment has already been verified. View your order.",
        orderId: o.id,
      },
      409,
    );
  if (o.checkout_state === "ambiguous")
    return json(
      {
        error:
          "Your checkout needs reconciliation before another attempt. Contact support.",
        orderId: o.id,
      },
      409,
    );
  if (o.tracker)
    return json({ orderId: o.id, url: await checkoutURL(o.tracker, o.id) });
  const q = await scoped(
    db,
    id,
    "guest",
    async (tx) =>
      (
        await tx.query(
          "SELECT expires_at>now() AS fresh FROM art.quotes WHERE id=$1",
          [o.quote_id],
        )
      ).rows[0],
  );
  if (!q?.fresh)
    return json(
      {
        error:
          "This quote has expired. Return to the studio for an updated quote.",
        orderId: o.id,
      },
      409,
    );
  if (o.render_error)
    return json({ error: o.render_error, orderId: o.id }, 409);
  if (!process.env.SAFEPAY_SECRET_KEY || !process.env.SAFEPAY_PUBLIC_KEY)
    return json(
      {
        error:
          "Test checkout is not connected yet. Your order and artwork are saved; no payment was taken.",
        code: "payment_setup_required",
        orderId: o.id,
      },
      503,
    );
  if (!o.proof_hash || !o.proof_pdf)
    return json(
      {
        error:
          "Your print proof is being prepared. No payment was taken. Continue from your saved order when it is ready.",
        code: "proof_preparing",
        orderId: o.id,
      },
      409,
    );
  const claimed = await scoped(
    db,
    id,
    "guest",
    async (tx) =>
      (
        await tx.query(
          "UPDATE art.orders SET checkout_state='ambiguous' WHERE id=$1 AND checkout_state='new' RETURNING id",
          [o.id],
        )
      ).rows.length,
  );
  if (!claimed)
    return json(
      {
        error:
          "Checkout is already being prepared. Check your order before retrying.",
        orderId: o.id,
      },
      409,
    );
  try {
    const { tracker } = await createCheckout(o.id, o.price.total);
    await scoped(db, id, "guest", (tx) =>
      tx.query(
        "UPDATE art.orders SET tracker=$2,checkout_state='created' WHERE id=$1",
        [o.id, tracker],
      ),
    );
    return json({ orderId: o.id, url: await checkoutURL(tracker, o.id) });
  } catch (e) {
    return json({ error: (e as Error).message, orderId: o.id }, 503);
  }
}
export async function handle(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    let db = await database();
    await (initialized ??= process.env.DATABASE_URL
      ? Promise.resolve()
      : migrate(db));
    const { path } = await context.params;
    const route = path.join("/"),
      post = req.method === "POST";
    if (
      post &&
      route !== "webhooks/payments" &&
      req.headers.get("origin") !==
        (process.env.APP_URL || "http://localhost:3000")
    )
      return json({ error: "Request origin rejected." }, 403);
    const upload = route === "assets" && post;
    if (
      Number(req.headers.get("content-length") || 0) >
      (upload ? MAX_UPLOAD : 16384)
    )
      return json({ error: "Request too large." }, 413);
    const raw = post && !upload ? await req.text() : "";
    if (Buffer.byteLength(raw) > 16384)
      return json({ error: "Request too large." }, 413);
    const body = raw ? JSON.parse(raw) : {};
    if (route === "catalog" && !post) return json(catalog);
    if (route === "config" && !post)
      return json({
        paymentReady: !!(
          process.env.SAFEPAY_SECRET_KEY && process.env.SAFEPAY_PUBLIC_KEY
        ),
        paymentMode: "sandbox",
        operationsMode: authConfigured() ? "supabase" : "local",
        storageReady: !!process.env.SUPABASE_STORAGE_BUCKET,
        printLanguage: "English",
        accountsReady: authConfigured(),
        mapsReady:
          !!process.env.MAPTILER_API_KEY &&
          process.env.MAP_PRINT_LICENSE_CONFIRMED === "true",
      });
    if (route.startsWith("auth/")) {
      if (limit("consumer-auth", 30))
        return json(
          { error: "Too many authentication attempts. Try again shortly." },
          429,
        );
      if (route === "auth/sign-out" && post) {
        const guest = req.cookies.get("purchaser")?.value;
        if (guest)
          await scoped(db, "", "ops", (tx) =>
            tx.query(
              "UPDATE art.sessions SET expires_at=now() WHERE token_hash=$1",
              [hash(guest)],
            ),
          );
        const r = json({ signedOut: true });
        for (const [name, path] of [
          ["customer_auth", "/api"],
          ["customer_refresh", "/api/auth"],
          ["purchaser", "/"],
        ])
          r.cookies.set(name, "", { path, maxAge: 0 });
        return r;
      }
      if (!authConfigured())
        return json(
          {
            error:
              "Account sign-in requires the project’s Supabase configuration.",
          },
          503,
        );
      if (route === "auth/me" && !post) {
        const token = req.cookies.get("customer_auth")?.value;
        if (!token)
          return json({ error: "Consumer authentication required." }, 401);
        return json(await verifyCustomer(token));
      }
      let session: any;
      if (route === "auth/refresh" && post) {
        const refresh = req.cookies.get("customer_refresh")?.value;
        if (!refresh)
          return json({ error: "Consumer authentication required." }, 401);
        session = await refreshCustomer(refresh);
      } else if (
        (route === "auth/sign-in" || route === "auth/sign-up") &&
        post
      ) {
        const data = z
          .object({
            email: z.email().max(254),
            password: z
              .string()
              .min(route === "auth/sign-up" ? 12 : 1)
              .max(200),
          })
          .strict()
          .parse(body);
        if (route === "auth/sign-up") {
          const created = await signUpCustomer(data.email, data.password);
          if (!created.session) return json({ requiresConfirmation: true });
          session = created.session;
        } else session = await signInCustomer(data.email, data.password);
      } else return json({ error: "Not found." }, 404);
      const user = await verifyCustomer(session.access_token);
      const guest = req.cookies.get("purchaser")?.value;
      let guestOwner: string | undefined;
      if (guest)
        try {
          guestOwner = await owner(withCustomer(db, user.id), guest);
        } catch {}
      if (guestOwner) await claimPurchaser(db, guestOwner, user.id);
      const r = json(user);
      const secure = req.nextUrl.protocol === "https:";
      r.cookies.set("customer_auth", session.access_token, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/api",
        maxAge: session.expires_in || 3600,
      });
      r.cookies.set("customer_refresh", session.refresh_token, {
        httpOnly: true,
        secure,
        sameSite: "strict",
        path: "/api/auth",
        maxAge: 2419200,
      });
      return r;
    }
    if (route === "webhooks/payments" && post) {
      const event = verifyWebhook(raw, req.headers.get("x-sfpy-signature"));
      if (event.merchant_api_key !== process.env.SAFEPAY_PUBLIC_KEY)
        return json({ error: "Merchant mismatch." }, 400);
      if (
        !["payment.succeeded", "payment.refunded", "payment.failed"].includes(
          event.type,
        )
      )
        return json({ received: true, ignored: true });
      await enqueueVerifiedEvent(db, event);
      return json({ received: true });
    }
    if (route.startsWith("ops/")) {
      if (limit("ops", 180))
        return json({ error: "Too many attempts. Try again shortly." }, 429);
      if (route === "ops/login" && post) {
        if (limit("ops-login", 12))
          return json(
            { error: "Too many sign-in attempts. Try again in a minute." },
            429,
          );
        if (authConfigured()) {
          const data = z
            .object({
              email: z.email(),
              password: z.string().min(1).max(200),
              code: z.string().regex(/^\d{6}$/),
            })
            .parse(body);
          const session = await signInOperator(
            data.email,
            data.password,
            data.code,
          );
          const r = json({ actor: session.actor, mode: "supabase" });
          r.cookies.set("ops_auth", session.token, {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            path: "/api/ops",
            maxAge: 3600,
          });
          return r;
        }
        if (!validLocalCredential(String(body.credential || "")))
          throw new Error("Operations authentication required.");
        const token = await createOpsSession(db, "local-operator");
        const r = json({ actor: "local-operator", mode: "local" });
        r.cookies.set("ops_session", token, {
          httpOnly: true,
          secure: req.nextUrl.protocol === "https:",
          sameSite: "strict",
          path: "/api/ops",
          maxAge: 28800,
        });
        return r;
      }
      const actor = await operator(req, db);
      if (route === "ops/logout" && post) {
        const cookie = req.cookies.get("ops_session")?.value;
        if (cookie)
          await scoped(db, "", "ops", (tx) =>
            tx.query(
              "UPDATE art.ops_sessions SET expires_at=now() WHERE token_hash=$1",
              [hash(cookie)],
            ),
          );
        const r = json({ signedOut: true });
        r.cookies.set("ops_session", "", { path: "/api/ops", maxAge: 0 });
        r.cookies.set("ops_auth", "", { path: "/api/ops", maxAge: 0 });
        return r;
      }
      if (route === "ops/session" && !post) return json({ actor });
      if (route === "ops/orders" && !post)
        return json(
          await scoped(
            db,
            "",
            "ops",
            async (tx) =>
              (
                await tx.query(
                  "SELECT id,design,proof_design,payment,production,fulfillment,proof_hash,approved_hash,price,render_error,created_at,address,ops_owner,due_at,checkout_state,proof_revision,refunded_amount,(SELECT count(*)::int FROM art.requests r WHERE r.order_id=o.id AND status='open') AS open_requests FROM art.orders o ORDER BY created_at DESC LIMIT 200",
                )
              ).rows,
          ),
        );
      if (path[1] === "orders" && path[2]) {
        const oid = z.uuid().parse(path[2]);
        const o = await scoped(
          db,
          "",
          "ops",
          async (tx) =>
            (await tx.query("SELECT * FROM art.orders WHERE id=$1", [oid]))
              .rows[0],
        );
        if (!o) return json({ error: "Order unavailable." }, 404);
        if (path[3] === "assets" && path[4] && !post) {
          const assetId = z.uuid().parse(path[4]);
          const asset = await scoped(
            db,
            "",
            "ops",
            async (tx) =>
              (
                await tx.query(
                  "SELECT a.* FROM art.assets a JOIN art.order_assets oa ON oa.asset_id=a.id WHERE oa.order_id=$1 AND a.id=$2",
                  [oid, assetId],
                )
              ).rows[0],
          );
          if (!asset) return json({ error: "Order upload unavailable." }, 404);
          if (!path[5]) return json(assetSummary(asset));
          const original = path[5] === "original";
          if (!original && path[5] !== "preview")
            return json({ error: "Not found." }, 404);
          const bytes = await getAsset(
            original ? asset.original_key : asset.preview_key,
          );
          if (original)
            await scoped(db, "", "ops", (tx) =>
              tx.query(
                "INSERT INTO art.audit VALUES(gen_random_uuid(),$1,$2,$3,now())",
                [oid, actor, "Original upload accessed: " + assetId],
              ),
            );
          return new NextResponse(new Uint8Array(bytes), {
            headers: {
              "Content-Type": original
                ? "application/octet-stream"
                : "image/jpeg",
              "Content-Disposition": original
                ? `attachment; filename="original-${assetId}.${bytes[0] === 255 ? "jpg" : "png"}"`
                : 'inline; filename="preview.jpg"',
              "Cache-Control": "private, no-store",
            },
          });
        }
        if (path[3] === "proof" && !post) {
          if (!o.proof_pdf) return json({ error: "Proof not ready." }, 409);
          return new NextResponse(
            new Uint8Array(
              await preview(
                o.proof_design || o.design,
                await artworkPictures(
                  db,
                  "",
                  o.proof_design || o.design,
                  "ops",
                ),
              ),
            ),
            {
              headers: {
                "Content-Type": "image/jpeg",
                "Cache-Control": "no-store",
                "Content-Disposition": 'inline; filename="preview.jpg"',
              },
            },
          );
        }
        if (path[3] === "export" && !post) {
          const result = await productionExport(db, oid, actor);
          return new NextResponse(new Uint8Array(result.bytes), {
            headers: {
              "Content-Type": "application/pdf",
              "Cache-Control": "private, no-store",
              "Content-Disposition": `attachment; filename="keepsake-${oid}-r${result.metadata.revision}.pdf"`,
              "X-Content-Type-Options": "nosniff",
            },
          });
        }
        if (!post && !path[3]) {
          const extra = await scoped(db, "", "ops", async (tx) => ({
            assets: (
              await tx.query(
                "SELECT a.id,a.kind,a.width,a.height,a.created_at FROM art.assets a JOIN art.order_assets oa ON oa.asset_id=a.id WHERE oa.order_id=$1",
                [oid],
              )
            ).rows,
            requests: (
              await tx.query(
                "SELECT * FROM art.requests WHERE order_id=$1 ORDER BY created_at",
                [oid],
              )
            ).rows,
            audit: (
              await tx.query(
                "SELECT * FROM art.audit WHERE order_id=$1 ORDER BY created_at",
                [oid],
              )
            ).rows,
            jobs: (
              await tx.query(
                "SELECT kind,status,attempts,error FROM art.jobs WHERE order_id=$1",
                [oid],
              )
            ).rows,
            payments: (
              await tx.query(
                "SELECT id,status,attempts,error FROM art.payment_inbox WHERE order_id=$1",
                [oid],
              )
            ).rows,
            exports: (
              await tx.query(
                "SELECT * FROM art.production_exports WHERE order_id=$1 ORDER BY created_at DESC",
                [oid],
              )
            ).rows,
          }));
          return json({ ...safeOrder(o), ...extra });
        }
        if (post) {
          switch (path[3]) {
            case "release":
              await release(db, oid, actor);
              break;
            case "revise":
              await reviseProof(db, oid, body.design, actor);
              if (!process.env.DATABASE_URL) await runRender(db, oid);
              break;
            case "production":
              await advanceProduction(
                db,
                oid,
                body.state,
                body.evidence || "",
                actor,
              );
              break;
            case "shipment":
              await recordShipment(db, oid, body, actor);
              break;
            case "resolve-request":
              await resolveRequest(
                db,
                z.uuid().parse(body.requestId),
                body.response,
                actor,
                oid,
              );
              break;
            case "retry-render":
              await scoped(db, "", "ops", async (tx) => {
                if (!["blocked", "hold"].includes(o.production))
                  throw new Error("Released proofs cannot be replaced.");
                await tx.query(
                  "UPDATE art.jobs SET status='pending',attempts=0,lease_token=NULL,lease_until=NULL,error=NULL WHERE order_id=$1 AND kind='render' AND status='failed'",
                  [oid],
                );
                await tx.query(
                  "INSERT INTO art.audit VALUES(gen_random_uuid(),$1,$2,$3,now())",
                  [oid, actor, "Render retry requested"],
                );
              });
              if (!process.env.DATABASE_URL) await runRender(db, oid);
              break;
            case "recover-checkout": {
              const tracker = z
                .string()
                .regex(/^track_[\w-]+$/)
                .parse(body.tracker);
              const t = await reconcile(tracker);
              if (
                (t.metadata?.order_id || t.order_id) !== oid ||
                t.purchase_totals?.quote_amount?.amount !== o.price.total
              )
                throw new Error(
                  "Provider must confirm this exact order reference and amount.",
                );
              await scoped(db, "", "ops", async (tx) => {
                const current = (
                  await tx.query(
                    "SELECT tracker FROM art.orders WHERE id=$1 FOR UPDATE",
                    [oid],
                  )
                ).rows[0];
                if (current.tracker && current.tracker !== tracker)
                  throw new Error(
                    "A different provider tracker is already attached.",
                  );
                await tx.query(
                  "UPDATE art.orders SET tracker=$2,checkout_state='created' WHERE id=$1",
                  [oid, tracker],
                );
                await tx.query(
                  "INSERT INTO art.audit VALUES(gen_random_uuid(),$1,$2,$3,now())",
                  [oid, actor, "Provider checkout recovered"],
                );
              });
              break;
            }
            default:
              return json({ error: "Action unavailable." }, 404);
          }
          return json({ updated: true });
        }
      }
      return json({ error: "Not found." }, 404);
    }
    let customer: { id: string; email?: string } | undefined;
    const account = req.cookies.get("customer_auth")?.value;
    if (account) {
      customer = await verifyCustomer(account);
      db = withCustomer(db, customer.id);
    }
    if (route === "session" && post) {
      if (limit("sessions", 60))
        return json({ error: "Too many sessions. Try again shortly." }, 429);
      const token = req.cookies.get("purchaser")?.value;
      if (token)
        try {
          const id = await owner(db, token);
          if (customer) await claimPurchaser(db, id, customer.id);
          return json({ id, account: !!customer });
        } catch {}
      const session = await newSession(db);
      if (customer) await claimPurchaser(db, session.id, customer.id);
      const r = json({ id: session.id });
      r.cookies.set("purchaser", session.token, {
        httpOnly: true,
        secure: req.nextUrl.protocol === "https:",
        sameSite: "lax",
        maxAge: 604800,
        path: "/",
      });
      return r;
    }
    const token = req.cookies.get("purchaser")?.value;
    if (!token)
      return json({ error: "Start a purchaser session to continue." }, 401);
    const id = await owner(db, token);
    if (limit(db.customerId || id, 120))
      return json({ error: "Too many requests. Try again shortly." }, 429);
    if (route.startsWith("places/") && post) {
      if (
        !process.env.MAPTILER_API_KEY ||
        process.env.MAP_PRINT_LICENSE_CONFIRMED !== "true"
      )
        return json(
          {
            error:
              "Map search and printing need provider configuration and commercial print rights. You can create a photo or written memory now.",
            code: "map_setup_required",
          },
          503,
        );
      if (limit("maps:" + id, 12))
        return json({ error: "Please wait before requesting more maps." }, 429);
      if (route === "places/search")
        return json(await searchPlaces(body.query));
      if (route === "places/map") {
        const map = await fetchMap(body);
        const asset = await uploadAsset(db, id, map.bytes, "map", {
          selection: map.selection,
          attribution: map.attribution,
        });
        return json({ ...asset, selection: map.selection }, 201);
      }
    }
    if (route === "assets" && post) {
      if (limit("uploads:" + id, 8))
        return json(
          { error: "Please wait a minute before adding more photographs." },
          429,
        );
      const reader = req.body?.getReader();
      if (!reader) return json({ error: "Choose a JPEG or PNG image." }, 400);
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.length;
        if (size > MAX_UPLOAD) {
          await reader.cancel();
          return json({ error: "Choose a photo up to 8 MB." }, 413);
        }
        chunks.push(chunk.value);
      }
      return json(await uploadAsset(db, id, Buffer.concat(chunks)), 201);
    }
    if (route === "assets" && !post)
      return json(
        await scoped(db, id, "guest", async (tx) =>
          (
            await tx.query(
              "SELECT * FROM art.assets WHERE archived=false ORDER BY created_at DESC LIMIT 50",
            )
          ).rows.map(assetSummary),
        ),
      );
    if (path[0] === "assets" && path[1] && !post) {
      const asset = await scoped(
        db,
        id,
        "guest",
        async (tx) =>
          (
            await tx.query(
              "SELECT * FROM art.assets WHERE id=$1 AND archived=false",
              [z.uuid().parse(path[1])],
            )
          ).rows[0],
      );
      if (!asset)
        return json({ error: "Private photograph unavailable." }, 404);
      if (path[2] === "preview") {
        const rotation = z
          .enum(["0", "90", "180", "270"])
          .parse(req.nextUrl.searchParams.get("rotation") || "0");
        const bytes = await getAsset(asset.preview_key);
        return new NextResponse(
          new Uint8Array(
            rotation === "0"
              ? bytes
              : await sharp(bytes)
                  .rotate(Number(rotation))
                  .jpeg({ quality: 78 })
                  .toBuffer(),
          ),
          {
            headers: {
              "Content-Type": "image/jpeg",
              "Cache-Control": "private, no-store",
              "Content-Disposition": 'inline; filename="photo-preview.jpg"',
            },
          },
        );
      }
      if (!path[2]) return json(assetSummary(asset));
      return json(
        {
          error:
            "Production-quality uploads are reserved for authorized operators.",
        },
        403,
      );
    }
    if (route === "drafts" && !post)
      return json(
        await scoped(
          db,
          id,
          "guest",
          async (tx) =>
            (
              await tx.query(
                "SELECT * FROM art.drafts WHERE archived=false ORDER BY updated_at DESC LIMIT 50",
              )
            ).rows,
        ),
      );
    if (route === "drafts" && post)
      return json(
        await saveDraft(
          db,
          id,
          body.design,
          body.id ? z.uuid().parse(body.id) : undefined,
          body.id ? z.number().int().min(0).parse(body.revision) : undefined,
        ),
        201,
      );
    if (path[0] === "drafts" && path[1] && path[2] === "archive" && post)
      return json(
        await archiveDraft(
          db,
          id,
          z.uuid().parse(path[1]),
          z.number().int().min(0).parse(body.revision),
        ),
      );
    if (path[0] === "drafts" && path[1] && !post) {
      const d = await scoped(
        db,
        id,
        "guest",
        async (tx) =>
          (
            await tx.query(
              "SELECT * FROM art.drafts WHERE id=$1 AND archived=false",
              [z.uuid().parse(path[1])],
            )
          ).rows[0],
      );
      return d ? json(d) : json({ error: "Draft unavailable." }, 404);
    }
    if (route === "orders" && !post)
      return json(
        await scoped(
          db,
          id,
          "guest",
          async (tx) =>
            (
              await tx.query(
                "SELECT id,design,proof_design,payment,production,fulfillment,approved_hash,price,created_at FROM art.orders ORDER BY created_at DESC LIMIT 100",
              )
            ).rows,
        ),
      );
    if (route === "quotes" && post) return json(await quote(db, id, body), 201);
    if (path[0] === "quotes" && path[1] && !post) {
      const q = await scoped(
        db,
        id,
        "guest",
        async (tx) =>
          (
            await tx.query(
              "SELECT *,expires_at>now() AS fresh FROM art.quotes WHERE id=$1",
              [z.uuid().parse(path[1])],
            )
          ).rows[0],
      );
      return q ? json(q) : json({ error: "Quote unavailable." }, 404);
    }
    if (route === "checkouts" && post) {
      const { address } = z
        .object({ quoteId: z.uuid(), address: addressSchema })
        .strict()
        .parse(body);
      let o = await orderFromQuote(db, id, z.uuid().parse(body.quoteId));
      if (!o.address)
        await scoped(db, id, "guest", (tx) =>
          tx.query(
            "UPDATE art.orders SET address=$2 WHERE id=$1 AND address IS NULL",
            [o.id, address],
          ),
        );
      if (!process.env.DATABASE_URL) await runRender(db, o.id);
      o = await scoped(
        db,
        id,
        "guest",
        async (tx) =>
          (await tx.query("SELECT * FROM art.orders WHERE id=$1", [o.id]))
            .rows[0],
      );
      return startCheckout(db, id, o);
    }
    if (path[0] === "orders" && path[1]) {
      const oid = z.uuid().parse(path[1]);
      let o = await scoped(
        db,
        id,
        "guest",
        async (tx) =>
          (await tx.query("SELECT * FROM art.orders WHERE id=$1", [oid]))
            .rows[0],
      );
      if (!o) return json({ error: "Order unavailable." }, 404);
      if (!process.env.DATABASE_URL) {
        await runPaymentInbox(db, oid);
        o = await scoped(
          db,
          id,
          "guest",
          async (tx) =>
            (await tx.query("SELECT * FROM art.orders WHERE id=$1", [oid]))
              .rows[0],
        );
      }
      if (post) {
        if (path[2] === "duplicate")
          return json(await saveDraft(db, id, o.proof_design || o.design), 201);
        if (path[2] === "approve-proof") {
          await approve(
            db,
            id,
            oid,
            z.string().length(64).parse(body.hash),
            z.number().int().min(0).max(1).parse(body.revision),
          );
          return json({ approved: true });
        }
        if (path[2] === "requests")
          return json(await createRequest(db, id, oid, body), 201);
        if (path[2] === "resume-checkout") return startCheckout(db, id, o);
        if (path[2] === "reconcile") {
          if (!o.tracker)
            throw new Error("There is no provider checkout to reconcile yet.");
          const t = await reconcile(o.tracker);
          if (t.state === "TRACKER_ENDED")
            await captured(
              db,
              o.id,
              "reconcile:" + o.tracker,
              t.purchase_totals.quote_amount.amount,
              t.purchase_totals.quote_amount.currency,
              t.token,
            );
          return json({ state: t.state });
        }
      }
      if (path[2] === "proof" && !post) {
        if (req.nextUrl.searchParams.has("download"))
          return json(
            {
              error:
                "Production files are available only to authorized administrators.",
            },
            403,
          );
        if (!o.proof_pdf)
          return json(
            { error: o.render_error || "Your proof is being prepared." },
            409,
          );
        return new NextResponse(
          new Uint8Array(
            await preview(
              o.proof_design || o.design,
              await artworkPictures(
                db,
                id,
                o.proof_design || o.design,
                "guest",
              ),
            ),
          ),
          {
            headers: {
              "Content-Type": "image/jpeg",
              "Content-Disposition": 'inline; filename="preview.jpg"',
              "Cache-Control": "private, no-store",
              "X-Frame-Options": "SAMEORIGIN",
            },
          },
        );
      }
      if (!post && !path[2]) {
        const extra = await scoped(db, id, "guest", async (tx) => ({
          requests: (
            await tx.query(
              "SELECT id,category,message,status,response,created_at FROM art.requests WHERE order_id=$1 ORDER BY created_at",
              [oid],
            )
          ).rows,
          audit: (
            await tx.query(
              "SELECT action,created_at FROM art.audit WHERE order_id=$1 ORDER BY created_at",
              [oid],
            )
          ).rows.map((a: any) => ({
            ...a,
            action: a.action.startsWith("Production:")
              ? a.action.split(". Evidence:")[0]
              : a.action.startsWith("Courier update:")
                ? a.action.split(". Evidence:")[0]
                : a.action,
          })),
        }));
        return json({ ...safeOrder(o), ...extra });
      }
    }
    return json({ error: "Not found." }, 404);
  } catch (e) {
    if (e instanceof DraftConflict)
      return json({ error: e.message, code: "draft_conflict" }, 409);
    if (e instanceof z.ZodError)
      return json(
        {
          error: "Check the highlighted fields and try again.",
          fields: Object.fromEntries(
            e.issues.map((i) => [i.path.join("."), i.message]),
          ),
        },
        400,
      );
    if (e instanceof SyntaxError)
      return json({ error: "Invalid request." }, 400);
    if (e && typeof e === "object" && "code" in e)
      return json(
        { error: "The request could not be completed. Refresh and try again." },
        400,
      );
    const message = e instanceof Error ? e.message : "Request failed.";
    return json(
      { error: message },
      message.includes("authentication") || message.includes("session expired")
        ? 401
        : 400,
    );
  }
}
