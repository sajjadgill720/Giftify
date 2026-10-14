import { randomUUID } from "node:crypto";
import { DB, scoped } from "./db";
import { dimensions, designSchema } from "./index";
import { hash } from "../../rendering/src/index";

// Call only after the API has verified a named operator (or dev-only session).
export async function productionExport(db: DB, orderId: string, actor: string) {
  return scoped(db, "", "ops", async (tx) => {
    const o = (
      await tx.query("SELECT * FROM art.orders WHERE id=$1 FOR UPDATE", [
        orderId,
      ])
    ).rows[0];
    if (
      !o ||
      o.payment !== "captured" ||
      o.production === "hold" ||
      !o.proof_pdf ||
      !o.proof_hash ||
      o.approved_hash !== o.proof_hash ||
      o.approved_revision !== o.proof_revision
    )
      throw new Error(
        "Export requires verified payment and the current approved proof without a hold.",
      );
    const unresolved = (
      await tx.query(
        "SELECT id FROM art.requests WHERE order_id=$1 AND status='open' AND category IN ('revision','refund')",
        [orderId],
      )
    ).rows;
    if (unresolved.length)
      throw new Error("Resolve artwork and refund requests before exporting.");
    const bytes = Buffer.from(o.proof_pdf);
    if (hash(bytes) !== o.proof_hash)
      throw new Error("Production checksum mismatch.");
    const d = designSchema.parse(o.proof_design || o.design),
      [w, h] = dimensions[d.size];
    if (
      d.memory?.mode === "place" &&
      process.env.MAP_PRINT_LICENSE_CONFIRMED !== "true"
    )
      throw new Error(
        "Map print exports require current confirmed commercial print rights.",
      );
    const metadata = (
      await tx.query(
        "INSERT INTO art.production_exports(id,order_id,revision,template,template_version,format,checksum,width_mm,height_mm,actor,status) VALUES($1,$2,$3,$4,$5,'pdf',$6,$7,$8,$9,'ready') RETURNING *",
        [
          randomUUID(),
          orderId,
          o.proof_revision,
          d.template,
          d.version || 1,
          o.proof_hash,
          w,
          h,
          actor,
        ],
      )
    ).rows[0];
    await tx.query(
      "INSERT INTO art.audit VALUES(gen_random_uuid(),$1,$2,$3,now())",
      [
        orderId,
        actor,
        `Production PDF exported: revision ${o.proof_revision}, checksum ${o.proof_hash}`,
      ],
    );
    return { bytes, metadata };
  });
}
