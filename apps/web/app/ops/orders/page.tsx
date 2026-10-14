"use client";
import { useState } from "react";
export default function Ops() {
  const [token, setToken] = useState(""),
    [orders, setOrders] = useState<any[]>([]),
    [error, setError] = useState("");
  async function load() {
    setError("");
    const r = await fetch("/api/ops/orders", {
      headers: { Authorization: "Bearer " + token },
    });
    const d = await r.json();
    if (!r.ok) setError(d.error);
    else setOrders(d);
  }
  async function release(id: string) {
    const r = await fetch(`/api/ops/orders/${id}/release`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    const d = await r.json();
    if (!r.ok) setError(d.error);
    else await load();
  }
  return (
    <section>
      <p className="eyebrow">OPERATIONS · SANDBOX</p>
      <h1>Order queue.</h1>
      <p>
        Verified funds and the exact approved PDF are required for release.
        Release only queues manual production.
      </p>
      <label>
        Operations credential
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoComplete="off"
        />
      </label>
      <button onClick={load}>Open queue</button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Proof</th>
              <th>Production</th>
              <th>Next action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.id.slice(0, 8)}</td>
                <td>PKR {o.price.total / 100}</td>
                <td>{o.payment}</td>
                <td>
                  {o.approved_hash
                    ? "Approved"
                    : o.render_error || "Awaiting approval"}
                </td>
                <td>{o.production}</td>
                <td>
                  <button onClick={() => release(o.id)}>
                    Release to manual queue
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!orders.length && <p>No orders loaded.</p>}
    </section>
  );
}
