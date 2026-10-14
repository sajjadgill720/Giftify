"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api, ApiError, money, date, statusLabel } from "../lib/client";
import { Artwork } from "./artwork";
import { Icon } from "./icons";
export default function OrderDetail({ id }: { id: string }) {
  const [o, setO] = useState<any>(),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(""),
    [reviewed, setReviewed] = useState(false),
    [category, setCategory] = useState("revision"),
    [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      setO(await api("orders/" + id));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => setReviewed(false), [o?.proof_hash]);
  async function action(name: string, body: unknown = {}) {
    setError("");
    setNotice("");
    setBusy(name);
    try {
      const d = await api(`orders/${id}/${name}`, body);
      if (d.url) {
        location.assign(d.url);
        return;
      }
      setNotice(
        name === "approve-proof"
          ? "Your exact print proof is approved."
          : name === "requests"
            ? "Your request is saved. The team can now review it."
            : "Payment status checked with the provider.",
      );
      if (name === "requests") setMessage("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  if (!o)
    return (
      <section className="section narrow">
        <Link href="/orders" className="text-link">
          ← My keepsakes
        </Link>
        <h1>Your order</h1>
        {error ? (
          <div className="empty-state">
            <Icon name="shield" size={30} />
            <h2>This order is private.</h2>
            <p>{error}</p>
            <p>
              Guest orders are available in the browser where they were created,
              for the duration of your session.
            </p>
            <Link href="/orders" className="button">
              My keepsakes
            </Link>
          </div>
        ) : (
          <div className="skeleton tall" aria-label="Loading order" />
        )}
      </section>
    );
  const d = o.proof_design || o.design,
    stages = [
      {
        name: "Payment",
        complete: o.payment === "captured",
        text: statusLabel[o.payment],
      },
      {
        name: "Proof approval",
        complete: !!o.approved_hash,
        text: o.approved_hash
          ? "Approved"
          : o.proof_hash
            ? "Ready to review"
            : "Being prepared",
      },
      {
        name: "Production",
        complete: o.production === "ready",
        text: statusLabel[o.production],
      },
      {
        name: "Delivery",
        complete: o.fulfillment === "delivered",
        text: statusLabel[o.fulfillment],
      },
    ];
  return (
    <section className="section order-page">
      <Link href="/orders" className="text-link back-link">
        ← My keepsakes
      </Link>
      <div className="order-heading">
        <div>
          <p className="eyebrow">YOUR PERSONAL KEEPSAKE</p>
          <h1>
            A story worth <em>keeping.</em>
          </h1>
          <p>
            Order #{id.slice(0, 8).toUpperCase()} <span>·</span> Created{" "}
            {date(o.created_at)}
          </p>
        </div>
        <span
          className={
            "status-badge " + (o.production === "hold" ? "warning" : "")
          }
        >
          {o.production === "hold"
            ? "Needs attention"
            : o.approved_hash
              ? "Proof approved"
              : "Ready for your next step"}
        </span>
      </div>
      <div className="order-progress">
        {stages.map((s, i) => (
          <div className={s.complete ? "complete" : ""} key={s.name}>
            <span className="progress-dot">
              {s.complete ? <Icon name="check" size={16} /> : i + 1}
            </span>
            <div>
              <strong>{s.name}</strong>
              <span>{s.text}</span>
            </div>
          </div>
        ))}
      </div>
      {o.payment === "pending" && (
        <div className="soft-note payment-note">
          <Icon name="shield" />
          <div>
            <strong>No payment has been verified.</strong>
            <p>
              This is a test order. Your artwork and details are saved.{" "}
              {o.hasCheckout
                ? "Complete or reconcile the existing test checkout before trying again."
                : "Payment credentials must be configured before a test charge can be verified."}
            </p>
          </div>
          {o.hasCheckout && (
            <button
              className="button secondary"
              onClick={() => action("resume-checkout")}
              disabled={!!busy}
            >
              Continue test checkout <Icon name="arrow" size={17} />
            </button>
          )}
        </div>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="success-message" role="status">
          <Icon name="check" size={17} />
          {notice}
        </p>
      )}
      <div className="order-layout">
        <div>
          <article className="proof-card">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">THE DETAILS MAKE IT YOURS</p>
                <h2>Your print proof</h2>
              </div>
              <span className="status-badge">
                {o.proof_revision ? "Revised proof" : "Original proof"}
              </span>
            </div>
            <div className="proof-preview">
              <Artwork design={d} />
              <div>
                <h3>{d.title}</h3>
                <p>{d.subtitle}</p>
                <span>{d.date}</span>
                <dl className="compact-spec">
                  <div>
                    <dt>Print</dt>
                    <dd>{d.size}</dd>
                  </div>
                  <div>
                    <dt>Finish</dt>
                    <dd>{d.finish === "oak" ? "Oak effect" : "Matte black"}</dd>
                  </div>
                  <div>
                    <dt>Revision</dt>
                    <dd>{o.proof_revision}/1 included</dd>
                  </div>
                </dl>
              </div>
            </div>
            {o.proof_hash ? (
              <>
                <div className="proof-links">
                  <a
                    className="text-link"
                    href={`/api/orders/${id}/proof`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Review exact print PDF <Icon name="arrow" size={16} />
                  </a>
                  <a
                    className="text-link"
                    href={`/api/orders/${id}/proof?download=1`}
                  >
                    <Icon name="download" size={15} /> Download proof
                  </a>
                </div>
                {o.approved_hash ? (
                  <div className="approval-complete">
                    <Icon name="check" />
                    <div>
                      <strong>You’ve approved this exact proof.</strong>
                      <p>
                        Your approval stays attached to this PDF. A revision
                        requires a new approval.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="approval-box">
                    <h3>A final look, then it’s yours.</h3>
                    <p>
                      Open the PDF and check every name, date, and detail. The
                      artwork above is a preview; the PDF is the exact file you
                      approve.
                    </p>
                    <label className="checkbox-field">
                      <input
                        type="checkbox"
                        checked={reviewed}
                        onChange={(e) => setReviewed(e.target.checked)}
                      />
                      <span>
                        I’ve reviewed the print PDF and checked the spelling,
                        date, and layout.
                      </span>
                    </label>
                    <button
                      className="button"
                      disabled={!reviewed || !!busy}
                      onClick={() =>
                        action("approve-proof", { hash: o.proof_hash })
                      }
                    >
                      {busy === "approve-proof"
                        ? "Approving…"
                        : "Approve this print proof"}
                      <Icon name="check" size={17} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="soft-note">
                <Icon name="clock" />
                <p>
                  {o.render_error ||
                    "Your print proof is being prepared. Check back shortly."}
                </p>
              </div>
            )}
          </article>
          <article className="panel order-support">
            <p className="eyebrow">A LITTLE HELP WHEN YOU NEED IT</p>
            <h2>We’re here for your story.</h2>
            <p>
              Request a wording revision before production, or ask about payment
              and delivery. A request does not start a refund or shipment.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void action("requests", { category, message });
              }}
            >
              <label className="field">
                How can we help?
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="revision">
                    Request my included wording revision
                  </option>
                  <option value="delivery">Delivery question</option>
                  <option value="refund">Refund request</option>
                  <option value="other">Something else</option>
                </select>
              </label>
              <label className="field">
                Tell us a little more
                <textarea
                  required
                  minLength={8}
                  maxLength={1000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Include the wording you’d like changed, or describe what you need help with."
                  rows={4}
                />
              </label>
              <button
                className="button secondary"
                disabled={!!busy || message.trim().length < 8}
              >
                {busy === "requests" ? "Sending…" : "Send request"}
                <Icon name="arrow" size={16} />
              </button>
            </form>
            {o.requests?.length > 0 && (
              <div className="request-list">
                {o.requests.map((r: any) => (
                  <article key={r.id}>
                    <div>
                      <strong>
                        {r.category === "revision"
                          ? "Wording revision"
                          : r.category[0].toUpperCase() +
                            r.category.slice(1) +
                            " request"}
                      </strong>
                      <span className="status-badge">
                        {r.status === "open" ? "With the team" : "Responded"}
                      </span>
                    </div>
                    <p>{r.message}</p>
                    {r.response && (
                      <p className="request-response">{r.response}</p>
                    )}
                    <small>{date(r.created_at)}</small>
                  </article>
                ))}
              </div>
            )}
          </article>
        </div>
        <aside>
          <article className="panel order-summary">
            <h3>Your order at a glance</h3>
            <dl className="price-breakdown">
              <div>
                <dt>Artwork & frame</dt>
                <dd>{money(o.price.product + o.price.frame)}</dd>
              </div>
              <div>
                <dt>Delivery allowance</dt>
                <dd>{money(o.price.shipping)}</dd>
              </div>
              <div className="price-total">
                <dt>Test order total</dt>
                <dd>{money(o.price.total)}</dd>
              </div>
            </dl>
            {o.refunded_amount > 0 && (
              <p>
                Provider-confirmed refund: {money(Number(o.refunded_amount))}
              </p>
            )}
            <p className="fine-print">
              Provisional prices · Tax configuration pending.
            </p>
            {o.address && (
              <div className="delivery-address">
                <Icon name="truck" size={20} />
                <div>
                  <strong>Delivery details</strong>
                  <p>
                    {o.address.name}
                    <br />
                    {o.address.line}
                    <br />
                    {o.address.city}, Pakistan
                    <br />
                    {o.address.phone}
                  </p>
                </div>
              </div>
            )}
            {o.shipment && (
              <div className="shipment-reference">
                <strong>{o.shipment.carrier}</strong>
                <p>Reference: {o.shipment.reference}</p>
                <span>{statusLabel[o.fulfillment]}</span>
              </div>
            )}
            <button
              className="text-button"
              onClick={() => action("reconcile")}
              disabled={!!busy || !o.hasCheckout}
            >
              <Icon name="shield" size={15} />
              {busy === "reconcile" ? "Checking…" : "Check test payment status"}
            </button>
            <button className="text-button" onClick={load} disabled={!!busy}>
              <Icon name="clock" size={15} />
              Refresh order
            </button>
          </article>
          <article className="panel timeline-panel">
            <h3>Your order journey</h3>
            <ol className="timeline">
              <li>
                <span />
                <div>
                  <strong>Order saved</strong>
                  <small>{date(o.created_at)}</small>
                </div>
              </li>
              {o.audit?.map((a: any, i: number) => (
                <li key={i}>
                  <span />
                  <div>
                    <strong>
                      {a.action.startsWith("approved exact PDF")
                        ? "Print proof approved"
                        : a.action}
                    </strong>
                    <small>{date(a.created_at)}</small>
                  </div>
                </li>
              ))}
            </ol>
            <p className="fine-print">
              We’ll only show delivery progress after an actual courier update
              is recorded.
            </p>
          </article>
        </aside>
      </div>
    </section>
  );
}
