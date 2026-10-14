import { createHmac, timingSafeEqual } from "node:crypto";
const host = "https://sandbox.api.getsafepay.com";
function config() {
  if (process.env.PAYMENT_MODE && process.env.PAYMENT_MODE !== "sandbox")
    throw new Error("Live payment mode is disabled.");
  const secret = process.env.SAFEPAY_SECRET_KEY,
    key = process.env.SAFEPAY_PUBLIC_KEY;
  if (!secret || !key)
    throw new Error(
      "Safepay sandbox credentials are required. No payment has been taken.",
    );
  return { secret, key };
}
async function request(route: string, body?: unknown) {
  const c = config();
  const r = await fetch(host + route, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      "X-SFPY-MERCHANT-SECRET": c.secret,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok)
    throw new Error(
      "Safepay request failed. Reconcile before retrying checkout.",
    );
  const data = await r.json();
  if (data.status?.errors?.length)
    throw new Error("Safepay rejected the request.");
  return data;
}
export async function createCheckout(orderId: string, amount: number) {
  const { key } = config();
  const result = await request("/order/payments/v3/", {
    merchant_api_key: key,
    intent: "CYBERSOURCE",
    mode: "payment",
    entry_mode: "raw",
    currency: "PKR",
    amount,
    metadata: { order_id: orderId },
    include_fees: false,
  });
  const tracker = result.data?.tracker?.token;
  if (!tracker)
    throw new Error(
      "Safepay tracker missing; operator reconciliation required.",
    );
  return { tracker };
}
export async function checkoutURL(tracker: string, orderId: string) {
  const token = await request("/client/passport/v1/token", {});
  if (typeof token.data !== "string")
    throw new Error("Safepay checkout token missing.");
  const app = process.env.APP_URL || "http://localhost:3000";
  const q = new URLSearchParams({
    tracker,
    tbt: token.data,
    environment: "sandbox",
    source: "hosted",
    redirect_url: `${app}/orders/${orderId}`,
    cancel_url: `${app}/orders/${orderId}`,
  });
  return `${host}/checkout/auth/login?${q}`;
}
export async function reconcile(tracker: string) {
  const result = await request(
    `/reporter/api/v1/payments/${encodeURIComponent(tracker)}`,
  );
  const t = result.data?.tracker;
  if (
    !t ||
    t.token !== tracker ||
    t.environment !== "sandbox" ||
    t.client !== config().key
  )
    throw new Error("Provider identity mismatch.");
  return t;
}
export function verifyWebhook(
  raw: string,
  signature: string | null,
  secret = process.env.SAFEPAY_WEBHOOK_SECRET,
) {
  if (!secret || !signature || !/^[a-fA-F0-9]{128}$/.test(signature))
    throw new Error("Invalid webhook signature.");
  const expected = createHmac("sha512", secret).update(raw).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex")))
    throw new Error("Invalid webhook signature.");
  return JSON.parse(raw);
}
