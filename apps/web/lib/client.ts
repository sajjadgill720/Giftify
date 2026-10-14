export class ApiError extends Error {
  constructor(
    public data: any,
    public status: number,
  ) {
    super(data.error || "Something went wrong. Please try again.");
  }
}
export async function api<T = any>(path: string, body?: unknown): Promise<T> {
  const r = await fetch("/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data: any;
  try {
    data = await r.json();
  } catch {
    throw new Error("The server could not respond. Please try again.");
  }
  if (!r.ok) throw new ApiError(data, r.status);
  return data;
}
export function money(value: number) {
  return "PKR " + (value / 100).toLocaleString("en-PK");
}
export function date(value: string) {
  return new Date(value).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi",
  });
}
export const statusLabel: Record<string, string> = {
  pending: "Awaiting payment",
  captured: "Payment verified",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
  blocked: "Awaiting release",
  queued: "In production queue",
  printing: "Printing",
  qa: "Quality check",
  ready: "Ready for dispatch",
  hold: "On hold",
  unbooked: "Not dispatched",
  booked: "Courier booked",
  "in-transit": "On the way",
  delivered: "Delivered",
  exception: "Delivery issue",
  returned: "Returned",
};
