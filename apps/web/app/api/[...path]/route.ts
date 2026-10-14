import { NextRequest, NextResponse } from "next/server";
import { randomUUID, timingSafeEqual } from "node:crypto";
import {
  database,
  migrate,
  scoped,
} from "../../../../../packages/domain/src/db";
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
} from "../../../../../packages/domain/src/commerce";
import {
  catalog,
  addressSchema,
} from "../../../../../packages/domain/src/index";
import { svg } from "../../../../../packages/rendering/src/index";
import {
  createCheckout,
  checkoutURL,
  reconcile,
  verifyWebhook,
} from "../../../../../packages/integrations/src/payments";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
let initialized: Promise<void> | undefined;
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
function ops(req: NextRequest) {
  const value = req.headers.get("authorization")?.replace(/^Bearer /, "") || "",
    expected = process.env.OPS_TOKEN || "";
  if (
    expected.length < 32 ||
    value.length !== expected.length ||
    !timingSafeEqual(Buffer.from(value), Buffer.from(expected))
  )
    throw new Error("Operations authentication required.");
}
const buckets = new Map<string, { count: number; until: number }>();
async function handle(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const db = await database();
    await (initialized ??= process.env.DATABASE_URL
      ? Promise.resolve()
      : migrate(db));
    const { path } = await context.params;
    const route = path.join("/");
    if (route === "session" || route.startsWith("ops/")) {
      const key = route === "session" ? "session-limit" : "ops-limit";
      const b = buckets.get(key);
      if (!b || b.until < Date.now())
        buckets.set(key, { count: 1, until: Date.now() + 60000 });
      else if (++b.count > 60)
        return json(
          { error: "Too many requests. Try again in a minute." },
          429,
        );
    }
    if (
      req.method === "POST" &&
      route !== "webhooks/payments" &&
      req.headers.get("origin") !==
        (process.env.APP_URL || "http://localhost:3000")
    )
      return json({ error: "Origin rejected." }, 403);
    if (Number(req.headers.get("content-length") || 0) > 16384)
      return json({ error: "Request too large." }, 413);
    const raw = req.method === "POST" ? await req.text() : "";
    if (raw.length > 16384) return json({ error: "Request too large." }, 413);
    const body = raw ? JSON.parse(raw) : {};
    if (route === "catalog" && req.method === "GET") return json(catalog);
    if (route === "webhooks/payments" && req.method === "POST") {
      const event = verifyWebhook(raw, req.headers.get("x-sfpy-signature"));
      if (event.merchant_api_key !== process.env.SAFEPAY_PUBLIC_KEY)
        return json({ error: "Merchant mismatch." }, 400);
      const o = await scoped(
        db,
        "",
        "ops",
        async (tx) =>
          (
            await tx.query("SELECT * FROM art.orders WHERE tracker=$1", [
              event.data?.tracker,
            ])
          ).rows[0],
      );
      if (!o) return json({ error: "Unknown tracker." }, 404);
      if (event.type === "payment.succeeded") {
        if (
          event.data?.metadata?.order_id !== o.id ||
          event.data.amount !== o.price.total ||
          event.data.currency !== "PKR"
        )
          return json(
            { error: "Event amount or order reference mismatch." },
            400,
          );
        const t = await reconcile(o.tracker);
        if (t.state !== "TRACKER_ENDED")
          return json({ error: "Payment not confirmed." }, 409);
        await captured(
          db,
          o.id,
          event.token,
          t.purchase_totals.quote_amount.amount,
          t.purchase_totals.quote_amount.currency,
          t.token,
        );
      } else if (event.type === "payment.refunded") {
        await holdRefund(
          db,
          o.id,
          event.token,
          event.data.tracker,
          event.data.currency,
        );
      }
      return json({ received: true });
    }
    if (route.startsWith("ops/")) {
      ops(req);
      if (route === "ops/orders" && req.method === "GET")
        return json(
          await scoped(
            db,
            "",
            "ops",
            async (tx) =>
              (
                await tx.query(
                  "SELECT id,payment,production,fulfillment,proof_hash,approved_hash,price,render_error,created_at FROM art.orders ORDER BY created_at DESC LIMIT 100",
                )
              ).rows,
          ),
        );
      if (
        path[1] === "orders" &&
        path[3] === "release" &&
        req.method === "POST"
      ) {
        await release(db, path[2]);
        return json({
          queued: true,
          message: "Manual queue only; no supplier order or shipment created.",
        });
      }
      return json({ error: "Not found." }, 404);
    }
    if (route === "session" && req.method === "POST") {
      const current = req.cookies.get("purchaser")?.value;
      if (current) {
        try {
          return json({ id: await owner(db, current) });
        } catch {}
      }
      const s = await newSession(db);
      const response = json({ id: s.id });
      response.cookies.set("purchaser", s.token, {
        httpOnly: true,
        secure: req.nextUrl.protocol === "https:",
        sameSite: "lax",
        maxAge: 604800,
        path: "/",
      });
      return response;
    }
    const token = req.cookies.get("purchaser")?.value;
    if (!token) return json({ error: "Start a purchaser session." }, 401);
    const id = await owner(db, token);
    const bucket = buckets.get(id);
    if (buckets.size > 10000) {
      for (const [key, value] of buckets)
        if (value.until < Date.now()) buckets.delete(key);
    }
    if (!bucket || bucket.until < Date.now())
      buckets.set(id, { count: 1, until: Date.now() + 60000 });
    else if (++bucket.count > 60)
      return json({ error: "Too many requests. Try again in a minute." }, 429);
    if (route === "quotes" && req.method === "POST")
      return json(await quote(db, id, body), 201);
    if (route === "checkouts" && req.method === "POST") {
      const address = addressSchema.parse(body.address);
      const o = await orderFromQuote(db, id, body.quoteId);
      if (!o.address)
        await scoped(db, id, "guest", (tx) =>
          tx.query("UPDATE art.orders SET address=$2 WHERE id=$1", [
            o.id,
            address,
          ]),
        );
      if (!process.env.DATABASE_URL) await runRender(db);
      if (o.checkout_state === "ambiguous")
        return json(
          {
            error:
              "Checkout outcome is uncertain. Operator reconciliation required before retrying.",
            orderId: o.id,
          },
          409,
        );
      if (o.tracker) {
        const url = await checkoutURL(o.tracker, o.id);
        return json({ orderId: o.id, url });
      }
      if (!process.env.SAFEPAY_SECRET_KEY || !process.env.SAFEPAY_PUBLIC_KEY)
        return json(
          {
            error:
              "Safepay sandbox credentials are required. No payment has been taken.",
            orderId: o.id,
          },
          503,
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
              "Checkout is already being created. Reconcile before retrying.",
            orderId: o.id,
          },
          409,
        );
      const { tracker } = await createCheckout(o.id, o.price.total);
      await scoped(db, id, "guest", (tx) =>
        tx.query(
          "UPDATE art.orders SET tracker=$2,checkout_state='created' WHERE id=$1",
          [o.id, tracker],
        ),
      );
      const url = await checkoutURL(tracker, o.id);
      return json({ orderId: o.id, url });
    }
    if (path[0] === "orders") {
      const o = await scoped(
        db,
        id,
        "guest",
        async (tx) =>
          (await tx.query("SELECT * FROM art.orders WHERE id=$1", [path[1]]))
            .rows[0],
      );
      if (!o) return json({ error: "Order unavailable." }, 404);
      if (path[2] === "approve-proof" && req.method === "POST") {
        await approve(db, id, o.id, body.hash);
        return json({ approved: true });
      }
      if (path[2] === "reconcile" && req.method === "POST") {
        if (!o.tracker)
          throw new Error("No provider checkout exists for this order.");
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
      if (path[2] === "proof" && req.method === "GET") {
        if (!o.proof_pdf)
          return json(
            { error: o.render_error || "Proof is being prepared." },
            409,
          );
        return new NextResponse(new Uint8Array(o.proof_pdf), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'inline; filename="proof.pdf"',
            "Cache-Control": "private, no-store",
          },
        });
      }
      if (req.method === "GET") {
        const { proof_pdf, checkout_url, ...safe } = o;
        return json({ ...safe, preview: svg(o.design) });
      }
    }
    return json({ error: "Not found." }, 404);
  } catch (e) {
    if (e && typeof e === "object" && "issues" in e)
      return json(
        {
          error:
            "Check your inputs. Delivery details must be confirmed; title and message must fit the limits.",
        },
        400,
      );
    if (e && typeof e === "object" && "code" in e)
      return json(
        {
          error:
            "Request could not be completed. Check the order or contact support.",
        },
        400,
      );
    const message = e instanceof Error ? e.message : "Request failed.";
    const status =
      message.includes("authentication") || message.includes("session")
        ? 401
        : 400;
    return json({ error: message }, status);
  }
}
export const GET = handle;
export const POST = handle;
