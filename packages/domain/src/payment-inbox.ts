import { randomUUID } from "node:crypto";
import { z } from "zod";
import { DB, scoped } from "./db";
import { captured, holdRefund } from "./commerce";
import { reconcile } from "../../integrations/src/payments";
const eventSchema = z.object({
  token: z.string().min(4).max(150),
  merchant_api_key: z.string(),
  type: z.enum(["payment.succeeded", "payment.refunded", "payment.failed"]),
  data: z.object({
    tracker: z.string().min(4).max(150),
    currency: z.string().optional(),
    amount: z.number().int().optional(),
    balance: z.number().int().nonnegative().optional(),
    refund_amount: z.number().int().positive().optional(),
    metadata: z.object({ order_id: z.string().uuid().optional() }).optional(),
  }),
});
export async function enqueueVerifiedEvent(db: DB, input: unknown) {
  const e = eventSchema.parse(input);
  return scoped(db, "", "ops", async (tx) => {
    const o = (
      await tx.query("SELECT * FROM art.orders WHERE tracker=$1 FOR UPDATE", [
        e.data.tracker,
      ])
    ).rows[0];
    if (!o) throw new Error("Unknown provider tracker.");
    if (
      e.type === "payment.succeeded" &&
      (e.data.amount !== o.price.total ||
        e.data.currency !== "PKR" ||
        e.data.metadata?.order_id !== o.id)
    )
      throw new Error("Event amount or order reference mismatch.");
    if (
      e.type === "payment.refunded" &&
      (e.data.currency !== "PKR" ||
        !Number.isSafeInteger(e.data.balance) ||
        !Number.isSafeInteger(e.data.refund_amount))
    )
      throw new Error("Refund event is incomplete.");
    const existing = (
      await tx.query("SELECT order_id FROM art.payment_inbox WHERE id=$1", [
        e.token,
      ])
    ).rows[0];
    if (existing && existing.order_id !== o.id)
      throw new Error("Provider event is already bound to another order.");
    await tx.query(
      "INSERT INTO art.payment_inbox(id,order_id,payload) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
      [e.token, o.id, e],
    );
    if (e.type === "payment.refunded")
      await tx.query("UPDATE art.orders SET production='hold' WHERE id=$1", [
        o.id,
      ]);
    return o.id;
  });
}
export async function postVerifiedRefund(
  db: DB,
  id: string,
  eventId: string,
  tracker: string,
  balance: number,
  currency: string,
) {
  return scoped(db, "", "ops", async (tx) => {
    const o = (
      await tx.query("SELECT * FROM art.orders WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    if (
      !o ||
      o.tracker !== tracker ||
      currency !== "PKR" ||
      !Number.isSafeInteger(balance) ||
      balance < 0 ||
      balance > o.price.total ||
      o.payment === "pending"
    )
      throw new Error(
        "Refund needs captured payment and a valid provider balance.",
      );
    const total = o.price.total - balance;
    const delta = total - Number(o.refunded_amount);
    if (delta <= 0) return;
    await tx.query(
      "INSERT INTO art.journal(id,order_id,debit,credit,kind,debit_account,credit_account) VALUES($1,$2,$3,$3,'provider refund','customer_advances','provider_clearing')",
      ["refund:" + eventId, id, delta],
    );
    await tx.query(
      "UPDATE art.orders SET refunded_amount=$2,payment=$3,production='hold' WHERE id=$1",
      [id, total, total === o.price.total ? "refunded" : "partially_refunded"],
    );
    await tx.query(
      "INSERT INTO art.events VALUES($1,$2,'reconciled refund',now()) ON CONFLICT DO NOTHING",
      [eventId, id],
    );
    await tx.query(
      "INSERT INTO art.audit VALUES($1,$2,'verified-provider','Refund reconciled from authenticated provider event',now())",
      [randomUUID(), id],
    );
  });
}
export async function runPaymentInbox(
  db: DB,
  orderId?: string,
  provider = reconcile,
) {
  const token = randomUUID();
  const job = await scoped(db, "", "ops", async (tx) => {
    await tx.query(
      "UPDATE art.payment_inbox SET status='failed',error='Reconciliation retries exhausted' WHERE status='processing' AND lease_until<now() AND attempts>=5",
    );
    const j = (
      await tx.query(
        "SELECT * FROM art.payment_inbox WHERE attempts<5 AND ((status='pending' AND (lease_until IS NULL OR lease_until<now())) OR (status='processing' AND lease_until<now())) AND ($1::uuid IS NULL OR order_id=$1) ORDER BY CASE WHEN payload->>'type'='payment.succeeded' THEN 0 ELSE 1 END,created_at FOR UPDATE SKIP LOCKED LIMIT 1",
        [orderId || null],
      )
    ).rows[0];
    if (!j) return;
    await tx.query(
      "UPDATE art.payment_inbox SET status='processing',attempts=attempts+1,lease_until=now()+interval '30 seconds',lease_token=$2 WHERE id=$1",
      [j.id, token],
    );
    return j;
  });
  if (!job) return false;
  try {
    const e = job.payload;
    if (e.type === "payment.succeeded") {
      const t = await provider(e.data.tracker);
      const amount = t.purchase_totals?.quote_amount;
      if (
        !amount ||
        amount.amount !== e.data.amount ||
        amount.currency !== "PKR"
      )
        throw new Error("Provider total mismatch.");
      await captured(
        db,
        job.order_id,
        e.token,
        amount.amount,
        amount.currency,
        t.token,
      );
    } else if (e.type === "payment.refunded") {
      await postVerifiedRefund(
        db,
        job.order_id,
        e.token,
        e.data.tracker,
        e.data.balance,
        e.data.currency,
      );
    }
    await scoped(db, "", "ops", (tx) =>
      tx.query(
        "UPDATE art.payment_inbox SET status='processed',lease_until=NULL,error=NULL WHERE id=$1 AND lease_token=$2",
        [job.id, token],
      ),
    );
  } catch (e) {
    await scoped(db, "", "ops", (tx) =>
      tx.query(
        "UPDATE art.payment_inbox SET status=CASE WHEN attempts>=5 THEN 'failed' ELSE 'pending' END,lease_until=now()+interval '30 seconds',error=$3 WHERE id=$1 AND lease_token=$2",
        [job.id, token, (e as Error).message],
      ),
    );
  }
  return true;
}
