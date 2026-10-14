import { randomUUID, randomBytes } from "node:crypto";
import { DB, scoped } from "./db";
import { designSchema, price, eligible } from "./index";
import { canonical, hash, pdf } from "../../rendering/src/index";
import { mirrorProof } from "../../integrations/src/storage";
export async function newSession(db: DB) {
  const id = randomUUID(),
    token = randomBytes(32).toString("hex");
  await scoped(db, "", "ops", (tx) =>
    tx.query(
      "INSERT INTO art.sessions(id,token_hash,expires_at) VALUES ($1,$2,now()+interval '7 days')",
      [id, hash(token)],
    ),
  );
  return { id, token };
}
export async function owner(db: DB, token: string) {
  const r = await scoped(db, "", "ops", (tx) =>
    tx.query<{ id: string }>(
      "SELECT id FROM art.sessions WHERE token_hash=$1 AND expires_at>now() AND (customer_id IS NULL OR customer_id::text=$2)",
      [hash(token), db.customerId || ""],
    ),
  );
  if (!r.rows[0]) throw new Error("Purchaser session expired.");
  return r.rows[0].id;
}
export async function quote(db: DB, ownerId: string, input: unknown) {
  const design = designSchema.parse(input),
    id = randomUUID();
  return scoped(db, ownerId, "guest", async (tx) => {
    const r = await tx.query(
      "INSERT INTO art.quotes VALUES ($1,$2,$3,$4,$5,now()+interval '15 minutes') RETURNING *",
      [id, ownerId, design, hash(canonical(design)), price(design)],
    );
    return r.rows[0];
  });
}
export async function orderFromQuote(db: DB, ownerId: string, quoteId: string) {
  return scoped(db, ownerId, "guest", async (tx) => {
    const existing = await tx.query(
      "SELECT * FROM art.orders WHERE quote_id=$1",
      [quoteId],
    );
    if (existing.rows[0]) return existing.rows[0];
    const q = (
      await tx.query(
        "SELECT * FROM art.quotes WHERE id=$1 AND expires_at>now()",
        [quoteId],
      )
    ).rows[0];
    if (!q)
      throw new Error("Quote expired or unavailable. Request a new quote.");
    const id = randomUUID();
    const r = await tx.query(
      "INSERT INTO art.orders(id,owner_id,quote_id,design,design_hash,price) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT(quote_id) DO NOTHING RETURNING *",
      [id, q.owner_id, q.id, q.design, q.design_hash, q.price],
    );
    const o =
      r.rows[0] ||
      (await tx.query("SELECT * FROM art.orders WHERE quote_id=$1", [quoteId]))
        .rows[0];
    await tx.query(
      "INSERT INTO art.jobs(id,order_id,kind) VALUES($1,$2,'render') ON CONFLICT DO NOTHING",
      [randomUUID(), o.id],
    );
    return o;
  });
}
export async function approve(
  db: DB,
  ownerId: string,
  id: string,
  proofHash: string,
) {
  return scoped(db, ownerId, "guest", async (tx) => {
    const o = (
      await tx.query("SELECT * FROM art.orders WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    if (!o || !o.proof_hash || o.proof_hash !== proofHash)
      throw new Error("Proof changed or is not ready. Review the current PDF.");
    await tx.query(
      "UPDATE art.orders SET approved_hash=proof_hash WHERE id=$1",
      [id],
    );
    await tx.query(
      "INSERT INTO art.audit(id,order_id,actor,action) VALUES($1,$2,$3,$4)",
      [randomUUID(), id, ownerId, "approved exact PDF " + proofHash],
    );
  });
}
export async function captured(
  db: DB,
  id: string,
  eventId: string,
  amount: number,
  currency: string,
  tracker: string,
) {
  return scoped(db, "", "ops", async (tx) => {
    const o = (
      await tx.query("SELECT * FROM art.orders WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    if (
      !o ||
      o.tracker !== tracker ||
      o.price.total !== amount ||
      currency !== "PKR"
    )
      throw new Error("Payment reconciliation mismatch.");
    await tx.query(
      "INSERT INTO art.events VALUES($1,$2,'capture',now()) ON CONFLICT DO NOTHING",
      [eventId, id],
    );
    if (o.payment !== "pending") return;
    await tx.query(
      "INSERT INTO art.journal(id,order_id,debit,credit,kind) VALUES($1,$2,$3,$3,'customer advance') ON CONFLICT DO NOTHING",
      ["capture:" + id, id, amount],
    );
    await tx.query("UPDATE art.orders SET payment='captured' WHERE id=$1", [
      id,
    ]);
  });
}
// A refund webhook holds production immediately. Financial posting is deferred
// until the operator reconciles the actual provider refund and settlement.
export async function holdRefund(
  db: DB,
  id: string,
  eventId: string,
  tracker: string,
  currency: string,
) {
  return scoped(db, "", "ops", async (tx) => {
    const o = (
      await tx.query("SELECT * FROM art.orders WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    if (!o || o.tracker !== tracker || currency !== "PKR")
      throw new Error("Refund reconciliation mismatch.");
    await tx.query(
      "INSERT INTO art.events VALUES($1,$2,'refund needs reconciliation',now()) ON CONFLICT DO NOTHING",
      [eventId, id],
    );
    await tx.query("UPDATE art.orders SET production='hold' WHERE id=$1", [id]);
  });
}
export async function release(db: DB, id: string, actor = "ops") {
  return scoped(db, "", "ops", async (tx) => {
    const o = (
      await tx.query("SELECT * FROM art.orders WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    if (o?.production === "queued") return;
    const open = (
      await tx.query(
        "SELECT id FROM art.requests WHERE order_id=$1 AND status='open' AND category IN ('revision','refund')",
        [id],
      )
    ).rows.length;
    if (
      !o ||
      !eligible(o) ||
      !o.proof_pdf ||
      !o.address?.confirmed ||
      open ||
      hash(Buffer.from(o.proof_pdf)) !== o.proof_hash
    )
      throw new Error(
        "Release blocked: verified payment and exact approved print PDF required.",
      );
    await tx.query(
      "INSERT INTO art.production_jobs VALUES($1,$2,now()) ON CONFLICT DO NOTHING",
      [id, o.proof_hash],
    );
    await tx.query(
      "UPDATE art.orders SET production='queued',ops_owner=$2,due_at=now()+interval '2 days' WHERE id=$1",
      [id, actor],
    );
    await tx.query(
      "INSERT INTO art.audit VALUES($1,$2,$3,'Released to manual production queue',now())",
      [randomUUID(), id, actor],
    );
  });
}
export async function runRender(db: DB, orderId?: string) {
  const token = randomUUID();
  const job = await scoped(db, "", "ops", async (tx) => {
    await tx.query(
      "UPDATE art.jobs SET status='failed',error='Render lease expired after maximum attempts' WHERE kind='render' AND status='running' AND lease_until<now() AND attempts>=3",
    );
    const j = (
      await tx.query(
        "SELECT * FROM art.jobs WHERE kind='render' AND attempts<3 AND (status='pending' OR (status='running' AND lease_until<now())) AND ($1::uuid IS NULL OR order_id=$1) ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1",
        [orderId || null],
      )
    ).rows[0];
    if (!j) return;
    await tx.query(
      "UPDATE art.jobs SET status='running',attempts=attempts+1,lease_until=now()+interval '2 minutes',lease_token=$2 WHERE id=$1",
      [j.id, token],
    );
    return j;
  });
  if (!job) return false;
  try {
    const o = await scoped(
      db,
      "",
      "ops",
      async (tx) =>
        (await tx.query("SELECT * FROM art.orders WHERE id=$1", [job.order_id]))
          .rows[0],
    );
    const design = o.proof_design || o.design;
    const data = await pdf(design);
    const storage = await mirrorProof(o.id, hash(data), data);
    await scoped(db, "", "ops", async (tx) => {
      const j = (
        await tx.query(
          "SELECT * FROM art.jobs WHERE id=$1 AND lease_token=$2 FOR UPDATE",
          [job.id, token],
        )
      ).rows[0];
      if (!j) return;
      await tx.query(
        "UPDATE art.orders SET proof_pdf=$2,proof_hash=$3,approved_hash=NULL,render_error=NULL,proof_storage_key=$4 WHERE id=$1",
        [o.id, data, hash(data), storage],
      );
      await tx.query(
        "INSERT INTO art.proof_history(order_id,revision,design,hash,pdf) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
        [o.id, o.proof_revision, design, hash(data), data],
      );
      await tx.query(
        "UPDATE art.jobs SET status='done',lease_until=NULL WHERE id=$1",
        [job.id],
      );
    });
  } catch (e) {
    await scoped(db, "", "ops", async (tx) => {
      const changed = await tx.query(
        "UPDATE art.jobs SET status=CASE WHEN attempts>=3 THEN 'failed' ELSE 'pending' END,error=$3 WHERE id=$1 AND lease_token=$2 RETURNING id",
        [job.id, token, (e as Error).message],
      );
      if (!changed.rows.length) return;
      await tx.query("UPDATE art.orders SET render_error=$2 WHERE id=$1", [
        job.order_id,
        (e as Error).message,
      ]);
    });
  }
  return true;
}
