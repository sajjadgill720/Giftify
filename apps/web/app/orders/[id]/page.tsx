"use client";
import { use, useEffect, useState } from "react";
export default function Order({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params),
    [o, setO] = useState<any>(),
    [error, setError] = useState("");
  async function load() {
    const r = await fetch("/api/orders/" + id);
    const data = await r.json();
    if (!r.ok) setError(data.error);
    else setO(data);
  }
  useEffect(() => {
    void load();
  }, [id]);
  async function action(name: string, body: unknown = {}) {
    setError("");
    const r = await fetch(`/api/orders/${id}/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) setError(d.error);
    await load();
  }
  return (
    <section>
      <p className="eyebrow">YOUR KEEPSAKE</p>
      <h1>Review your order.</h1>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {o && (
        <>
          <p>Order {o.id}</p>
          <div className="row statuses">
            <p>
              Payment: <strong>{o.payment}</strong>
            </p>
            <p>
              Proof:{" "}
              <strong>
                {o.approved_hash ? "approved" : "awaiting approval"}
              </strong>
            </p>
            <p>
              Production: <strong>{o.production}</strong>
            </p>
            <p>
              Delivery: <strong>{o.fulfillment}</strong>
            </p>
          </div>
          <p>
            Sandbox order · No real money or shipment. Amount due PKR{" "}
            {o.price.total / 100}.
          </p>
          <button onClick={() => action("reconcile")}>
            Check payment with Safepay
          </button>
          {o.proof_hash ? (
            <>
              <h2>Your exact print proof</h2>
              <p>
                <a target="_blank" href={`/api/orders/${id}/proof`}>
                  Open print PDF for review ↗
                </a>
              </p>
              <iframe
                title="Print proof"
                src={`/api/orders/${id}/proof`}
                style={{ width: "100%", height: 600 }}
              />
              <p>
                Check every name, date, and layout. Approval binds this exact
                PDF.
              </p>
              <button
                onClick={() => action("approve-proof", { hash: o.proof_hash })}
              >
                Approve this design
              </button>
            </>
          ) : (
            <p className="error">
              {o.render_error ||
                "Proof pending. Run the render worker when using PostgreSQL."}
            </p>
          )}
        </>
      )}
    </section>
  );
}
