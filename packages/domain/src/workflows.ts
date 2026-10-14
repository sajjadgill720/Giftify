import { randomUUID, randomBytes } from "node:crypto";
import { z } from "zod";
import { DB, scoped } from "./db";
import { designSchema, requestSchema, Design } from "./index";
import { hash } from "../../rendering/src/index";
export async function saveDraft(
  db: DB,
  owner: string,
  input: unknown,
  id?: string,
) {
  const design = designSchema.parse(input);
  return scoped(db, owner, "guest", async (tx) => {
    if (id) {
      const r = await tx.query(
        "UPDATE art.drafts SET design=$2,updated_at=now() WHERE id=$1 RETURNING *",
        [id, design],
      );
      if (!r.rows[0]) throw new Error("Draft unavailable.");
      return r.rows[0];
    }
    return (
      await tx.query(
        "INSERT INTO art.drafts(id,owner_id,design) VALUES($1,$2,$3) RETURNING *",
        [randomUUID(), owner, design],
      )
    ).rows[0];
  });
}
export async function createRequest(
  db: DB,
  owner: string,
  orderId: string,
  input: unknown,
) {
  const data = requestSchema.parse(input);
  return scoped(db, owner, "guest", async (tx) => {
    const o = (
      await tx.query("SELECT * FROM art.orders WHERE id=$1", [orderId])
    ).rows[0];
    if (!o) throw new Error("Order unavailable.");
    if (
      data.category === "revision" &&
      (o.proof_revision >= 1 || !["blocked", "hold"].includes(o.production))
    )
      throw new Error(
        "Included revision unavailable. Contact support about further changes.",
      );
    const exists = (
      await tx.query(
        "SELECT * FROM art.requests WHERE order_id=$1 AND category=$2 AND status=$3",
        [orderId, data.category, "open"],
      )
    ).rows[0];
    if (exists)
      throw new Error("You already have an open request of this type.");
    return (
      await tx.query(
        "INSERT INTO art.requests(id,order_id,owner_id,category,message) VALUES($1,$2,$3,$4,$5) RETURNING *",
        [randomUUID(), orderId, o.owner_id, data.category, data.message],
      )
    ).rows[0];
  });
}
export async function claimPurchaser(
  db: DB,
  ownerId: string,
  customerId: string,
) {
  z.uuid().parse(customerId);
  return scoped(db, "", "ops", async (tx) => {
    const s = (
      await tx.query(
        "SELECT * FROM art.sessions WHERE id=$1 AND expires_at>now() FOR UPDATE",
        [ownerId],
      )
    ).rows[0];
    if (!s || (s.customer_id && s.customer_id !== customerId))
      throw new Error(
        "This purchaser session cannot be linked to this account.",
      );
    await tx.query("UPDATE art.sessions SET customer_id=$2 WHERE id=$1", [
      ownerId,
      customerId,
    ]);
  });
}
export async function reviseProof(
  db: DB,
  orderId: string,
  input: unknown,
  actor: string,
) {
  const next = designSchema.parse(input);
  return scoped(db, "", "ops", async (tx) => {
    const o = (
      await tx.query("SELECT * FROM art.orders WHERE id=$1 FOR UPDATE", [
        orderId,
      ])
    ).rows[0];
    if (
      !o ||
      !["blocked", "hold"].includes(o.production) ||
      o.proof_revision >= 1
    )
      throw new Error(
        "Proof revision is unavailable after release or the included revision.",
      );
    if (
      ["template", "size", "finish", "version"].some(
        (key) => (next as any)[key] !== o.design[key],
      )
    )
      throw new Error(
        "Product changes require a new quote. Only proof wording may be revised.",
      );
    const request = (
      await tx.query(
        "SELECT id FROM art.requests WHERE order_id=$1 AND category='revision' AND status='open' FOR UPDATE",
        [orderId],
      )
    ).rows[0];
    if (!request) throw new Error("A customer revision request is required.");
    await tx.query(
      "UPDATE art.orders SET proof_design=$2,proof_revision=proof_revision+1,proof_hash=NULL,proof_pdf=NULL,approved_hash=NULL,render_error=NULL WHERE id=$1",
      [orderId, next],
    );
    await tx.query(
      "UPDATE art.jobs SET status='pending',attempts=0,lease_token=NULL,lease_until=NULL,error=NULL WHERE order_id=$1 AND kind='render'",
      [orderId],
    );
    await tx.query(
      "UPDATE art.requests SET status='resolved',response='Your updated proof is being prepared. Please review and approve it.',resolved_at=now() WHERE id=$1",
      [request.id],
    );
    await tx.query("INSERT INTO art.audit VALUES($1,$2,$3,$4,now())", [
      randomUUID(),
      orderId,
      actor,
      "Proof revision requested; prior approval invalidated",
    ]);
  });
}
export async function createOpsSession(db: DB, actor: string) {
  const token = randomBytes(32).toString("hex");
  await scoped(db, "", "ops", (tx) =>
    tx.query(
      "INSERT INTO art.ops_sessions VALUES($1,$2,now()+interval '8 hours')",
      [hash(token), actor],
    ),
  );
  return token;
}
export async function opsActor(db: DB, token: string) {
  const o = await scoped(
    db,
    "",
    "ops",
    async (tx) =>
      (
        await tx.query(
          "SELECT actor FROM art.ops_sessions WHERE token_hash=$1 AND expires_at>now()",
          [hash(token)],
        )
      ).rows[0],
  );
  if (!o) throw new Error("Operations authentication required.");
  return o.actor as string;
}
export async function resolveRequest(
  db: DB,
  id: string,
  response: string,
  actor: string,
  orderId?: string,
) {
  const value = z.string().trim().min(8).max(1000).parse(response);
  return scoped(db, "", "ops", async (tx) => {
    const r = (
      await tx.query(
        "UPDATE art.requests SET status='resolved',response=$2,resolved_at=now() WHERE id=$1 AND status='open' AND ($3::uuid IS NULL OR order_id=$3) RETURNING order_id",
        [id, value, orderId || null],
      )
    ).rows[0];
    if (!r) throw new Error("Request unavailable.");
    await tx.query("INSERT INTO art.audit VALUES($1,$2,$3,$4,now())", [
      randomUUID(),
      r.order_id,
      actor,
      "Support request resolved",
    ]);
  });
}
export async function advanceProduction(
  db: DB,
  id: string,
  next: string,
  evidence: string,
  actor: string,
) {
  if (evidence.trim().length < 8 || evidence.length > 500)
    throw new Error("Record supplier or quality-check evidence.");
  const allowed: Record<string, string> = {
    queued: "printing",
    printing: "qa",
    qa: "ready",
  };
  return scoped(db, "", "ops", async (tx) => {
    const o = (
      await tx.query("SELECT * FROM art.orders WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    if (
      !o ||
      allowed[o.production] !== next ||
      o.payment !== "captured" ||
      o.approved_hash !== o.proof_hash
    )
      throw new Error("Production transition is not eligible.");
    await tx.query(
      "UPDATE art.orders SET production=$2,ops_owner=$3 WHERE id=$1",
      [id, next, actor],
    );
    await tx.query("INSERT INTO art.audit VALUES($1,$2,$3,$4,now())", [
      randomUUID(),
      id,
      actor,
      `Production: ${next}. Evidence: ${evidence}`,
    ]);
  });
}
export async function recordShipment(
  db: DB,
  id: string,
  input: unknown,
  actor: string,
) {
  const data = z
    .object({
      carrier: z.string().trim().min(2).max(80),
      reference: z.string().trim().min(5).max(100),
      state: z.enum([
        "booked",
        "in-transit",
        "delivered",
        "exception",
        "returned",
      ]),
      evidence: z.string().trim().min(8).max(500),
    })
    .strict()
    .parse(input);
  const allowed: Record<string, string[]> = {
    unbooked: ["booked"],
    booked: ["in-transit", "exception"],
    "in-transit": ["delivered", "exception", "returned"],
    exception: ["in-transit", "returned"],
    delivered: [],
    returned: [],
  };
  return scoped(db, "", "ops", async (tx) => {
    const o = (
      await tx.query("SELECT * FROM art.orders WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    if (
      !o ||
      o.production !== "ready" ||
      o.payment !== "captured" ||
      !allowed[o.fulfillment]?.includes(data.state)
    )
      throw new Error("Shipment transition is not eligible.");
    if (
      o.shipment &&
      (o.shipment.carrier !== data.carrier ||
        o.shipment.reference !== data.reference)
    )
      throw new Error("Existing courier reference cannot be overwritten.");
    await tx.query(
      "UPDATE art.orders SET fulfillment=$2,shipment=$3 WHERE id=$1",
      [id, data.state, data],
    );
    await tx.query("INSERT INTO art.audit VALUES($1,$2,$3,$4,now())", [
      randomUUID(),
      id,
      actor,
      `Courier update: ${data.state}. Evidence: ${data.evidence}`,
    ]);
  });
}
