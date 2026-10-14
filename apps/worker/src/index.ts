import { database } from "../../../packages/domain/src/db";
import { runRender } from "../../../packages/domain/src/commerce";
import { runPaymentInbox } from "../../../packages/domain/src/payment-inbox";
const db = await database();
console.log("Render worker started; no supplier or shipment side effects.");
if (!process.env.DATABASE_URL)
  throw new Error(
    "Separate worker requires DATABASE_URL. Embedded development mode renders through the web API.",
  );
let running = true;
process.on("SIGINT", () => (running = false));
while (running) {
  const payment = await runPaymentInbox(db),
    render = await runRender(db);
  if (!payment && !render) await new Promise((r) => setTimeout(r, 1000));
}
await db.close();
