"use client";
import { useEffect, useState } from "react";
import { api, money, date, statusLabel, ApiError } from "../lib/client";
import { Artwork } from "./artwork";
import { Icon } from "./icons";
type Order = Record<string, any>;
export default function Operations() {
  const [config, setConfig] = useState<any>(),
    [actor, setActor] = useState(""),
    [credential, setCredential] = useState(""),
    [login, setLogin] = useState({ email: "", password: "", code: "" }),
    [orders, setOrders] = useState<Order[]>([]),
    [selected, setSelected] = useState<Order>(),
    [tab, setTab] = useState("all"),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  async function refresh() {
    setLoading(true);
    try {
      const list = await api<Order[]>("ops/orders");
      setOrders(list);
      if (selected) setSelected(await api("ops/orders/" + selected.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    api("config")
      .then(setConfig)
      .catch((e) => setError(e.message));
    api("ops/session")
      .then((d) => {
        setActor(d.actor);
        void refresh();
      })
      .catch(() => setLoading(false));
  }, []);
  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await api(
        "ops/login",
        config?.operationsMode === "supabase" ? login : { credential },
      );
      setActor(data.actor);
      setCredential("");
      setLogin({ email: "", password: "", code: "" });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function choose(o: Order) {
    setError("");
    setNotice("");
    try {
      setSelected(await api("ops/orders/" + o.id));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function action(path: string, body: unknown = {}) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await api("ops/orders/" + selected!.id + "/" + path, body);
      setNotice("Recorded. Order and audit history updated.");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    try {
      await api("ops/logout", {});
      setActor("");
      setOrders([]);
      setSelected(undefined);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (!actor)
    return (
      <section className="ops-login">
        <div className="ops-login-story">
          <span className="eyebrow">THE CARE BEHIND EVERY KEEPSAKE</span>
          <h1>
            Thoughtful art.
            <br />
            <em>Thoughtful operations.</em>
          </h1>
          <Artwork />
          <p>
            One clear place to review proofs, reconcile exceptions,
            <br />
            and keep each personal order moving.
          </p>
        </div>
        <form className="ops-login-form" onSubmit={signIn}>
          <span className="login-emblem">
            <Icon name="shield" size={27} />
          </span>
          <p className="eyebrow">KEEPSAKE OPERATIONS</p>
          <h2>Welcome to the studio.</h2>
          <p>Sign in to review the real order queue and recorded workflow.</p>
          {config?.operationsMode === "supabase" ? (
            <>
              <label className="field">
                Work email
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={login.email}
                  onChange={(e) =>
                    setLogin({ ...login, email: e.target.value })
                  }
                />
              </label>
              <label className="field">
                Password
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={login.password}
                  onChange={(e) =>
                    setLogin({ ...login, password: e.target.value })
                  }
                />
              </label>
              <label className="field">
                Authenticator code
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={login.code}
                  onChange={(e) => setLogin({ ...login, code: e.target.value })}
                />
              </label>
            </>
          ) : (
            <label className="field">
              Local operations credential
              <input
                type="password"
                required
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                autoComplete="off"
              />
              <span className="field-hint">
                Use the credential in your local .env file. Run npm run
                setup:dev if it is not configured. This mode is disabled in
                production.
              </span>
            </label>
          )}
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <button className="button wide" disabled={busy}>
            {busy ? "Signing in…" : "Enter operations"}
            <Icon name="arrow" />
          </button>
          <p className="fine-print">
            Named Supabase operators require an enrolled authenticator and an
            ops or admin role. Every workflow action is audited.
          </p>
        </form>
      </section>
    );
  const counts = {
    payment: orders.filter((o) => o.payment === "pending").length,
    proof: orders.filter((o) => !o.approved_hash).length,
    ready: orders.filter(
      (o) =>
        o.payment === "captured" &&
        o.approved_hash &&
        o.production === "blocked" &&
        !o.open_requests,
    ).length,
    exceptions: orders.filter(
      (o) =>
        o.production === "hold" ||
        o.render_error ||
        o.checkout_state === "ambiguous",
    ).length,
  };
  const filtered = orders.filter(
    (o) =>
      [o.id, o.design.title, o.address?.name, o.address?.city]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (tab === "all" ||
        (tab === "payment" && o.payment === "pending") ||
        (tab === "proof" && !o.approved_hash) ||
        (tab === "ready" &&
          o.payment === "captured" &&
          o.approved_hash &&
          o.production === "blocked" &&
          !o.open_requests) ||
        (tab === "exceptions" &&
          (o.production === "hold" ||
            o.render_error ||
            o.checkout_state === "ambiguous"))),
  );
  return (
    <section className="ops-app">
      <aside className="ops-sidebar">
        <p className="eyebrow">OPERATIONS</p>
        <h3>The studio desk.</h3>
        <nav aria-label="Operations filters">
          {[
            ["all", "Order queue", "bag"],
            ["payment", "Payment review", "shield"],
            ["proof", "Proof approvals", "frame"],
            ["ready", "Ready to release", "check"],
            ["exceptions", "Exceptions", "help"],
          ].map(([key, label, icon]) => (
            <button
              className={tab === key ? "active" : ""}
              key={key}
              onClick={() => setTab(key)}
            >
              <Icon name={icon} size={18} />
              {label}
              {key !== "all" && (
                <span>{counts[key as keyof typeof counts]}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="ops-sidebar-bottom">
          <span className="status-badge">SANDBOX</span>
          <p>
            Real records.
            <br />
            Test payments.
            <br />
            Manual fulfillment.
          </p>
          <button className="text-button" onClick={signOut}>
            <Icon name="logout" size={16} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="ops-workspace">
        <div className="ops-heading">
          <div>
            <p className="eyebrow">THE NEXT RIGHT STEP, FOR EVERY ORDER</p>
            <h1>Your order queue.</h1>
            <p>
              {orders.length} latest orders ·{" "}
              {actor === "local-operator"
                ? "Local development operator"
                : actor}
            </p>
          </div>
          <button
            className="button secondary"
            disabled={loading || busy}
            onClick={refresh}
          >
            <Icon name="clock" size={17} />
            Refresh queue
          </button>
        </div>
        <div className="ops-metrics">
          {[
            ["Awaiting payment", counts.payment, "shield"],
            ["Proofs to approve", counts.proof, "frame"],
            ["Ready to release", counts.ready, "check"],
            ["Need attention", counts.exceptions, "help"],
          ].map(([label, count, icon]) => (
            <div key={String(label)}>
              <Icon name={String(icon)} size={20} />
              <span>{label}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
        <div className="ops-table-heading">
          <div className="filter-pills">
            {["all", "payment", "proof", "ready", "exceptions"].map((t) => (
              <button
                key={t}
                className={"pill " + (tab === t ? "selected" : "")}
                onClick={() => setTab(t)}
              >
                {t === "all"
                  ? "All orders"
                  : t === "ready"
                    ? "Ready to release"
                    : t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <label className="search-field">
            <Icon name="search" size={16} />
            <input
              aria-label="Search orders"
              placeholder="Order, name, or city"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="success-message" role="status">
            <Icon name="check" size={16} />
            {notice}
          </p>
        )}
        <div className="ops-split">
          <div className="ops-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order / artwork</th>
                  <th>Payment</th>
                  <th>Next step</th>
                  <th>Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    className={selected?.id === o.id ? "selected" : ""}
                  >
                    <td>
                      <button
                        className="order-select"
                        onClick={() => choose(o)}
                      >
                        <strong>{o.design.title}</strong>
                        <small>
                          #{o.id.slice(0, 8).toUpperCase()} ·{" "}
                          {date(o.created_at)}
                        </small>
                        <small>
                          {o.address?.name || "Recipient not set"} ·{" "}
                          {o.address?.city || "—"}
                        </small>
                      </button>
                    </td>
                    <td>
                      <span
                        className={
                          "status-badge " +
                          (o.payment === "captured" ? "positive" : "")
                        }
                      >
                        {statusLabel[o.payment]}
                      </span>
                    </td>
                    <td>
                      <span>
                        {o.render_error
                          ? "Render issue"
                          : o.open_requests
                            ? `${o.open_requests} support request${o.open_requests === 1 ? "" : "s"}`
                            : !o.approved_hash
                              ? "Proof approval"
                              : statusLabel[o.production]}
                      </span>
                    </td>
                    <td>{money(o.price.total)}</td>
                    <td>
                      <button
                        className="icon-button"
                        onClick={() => choose(o)}
                        aria-label={"Review order " + o.id.slice(0, 8)}
                      >
                        <Icon name="chevron" size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <div className="empty-state compact">
                <Icon name="bag" size={30} />
                <h3>{loading ? "Loading your queue…" : "A clear desk."}</h3>
                <p>
                  {loading
                    ? "Reading current records."
                    : "No orders match this view. New orders will appear here."}
                </p>
              </div>
            )}
          </div>
          {selected ? (
            <OrderWorkbench
              key={selected.id + ":" + selected.proof_revision}
              o={selected}
              busy={busy}
              action={action}
              onClose={() => setSelected(undefined)}
            />
          ) : (
            <div className="workbench-empty">
              <Icon name="frame" size={32} />
              <h3>A little care, at every step.</h3>
              <p>
                Select an order to review its proof, requests, and audited
                workflow.
              </p>
            </div>
          )}
        </div>
        <p className="fine-print">
          Counts are calculated from the latest {orders.length} loaded records.
          No synthetic sales or delivery metrics are shown.
        </p>
      </div>
    </section>
  );
}
function OrderWorkbench({
  o,
  busy,
  action,
  onClose,
}: {
  o: Order;
  busy: boolean;
  action: (path: string, body?: unknown) => Promise<void>;
  onClose: () => void;
}) {
  const d = o.proof_design || o.design,
    [revision, setRevision] = useState(d),
    [evidence, setEvidence] = useState(""),
    [reply, setReply] = useState(""),
    [requestId, setRequestId] = useState(""),
    [tracker, setTracker] = useState(""),
    [shipment, setShipment] = useState({
      carrier: o.shipment?.carrier || "",
      reference: o.shipment?.reference || "",
      state: "booked",
      evidence: "",
    });
  const next: Record<string, string> = {
      queued: "printing",
      printing: "qa",
      qa: "ready",
    },
    shipmentNext: Record<string, string[]> = {
      unbooked: ["booked"],
      booked: ["in-transit", "exception"],
      "in-transit": ["delivered", "exception", "returned"],
      exception: ["in-transit", "returned"],
      delivered: [],
      returned: [],
    };
  useEffect(() => {
    setEvidence("");
  }, [o.production]);
  useEffect(() => {
    setShipment((s) => ({
      ...s,
      carrier: o.shipment?.carrier || s.carrier,
      reference: o.shipment?.reference || s.reference,
      state: shipmentNext[o.fulfillment]?.[0] || "",
      evidence: "",
    }));
  }, [o.fulfillment, o.shipment?.reference]);
  const openRevision = o.requests?.find(
    (r: any) => r.category === "revision" && r.status === "open",
  );
  const eligible =
    o.payment === "captured" &&
    !!o.approved_hash &&
    o.production === "blocked" &&
    o.address?.confirmed &&
    !o.requests?.some(
      (r: any) =>
        ["revision", "refund"].includes(r.category) && r.status === "open",
    );
  return (
    <aside className="order-workbench">
      <div className="workbench-heading">
        <div>
          <p className="eyebrow">ORDER #{o.id.slice(0, 8).toUpperCase()}</p>
          <h3>{d.title}</h3>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close order details"
        >
          <Icon name="close" size={17} />
        </button>
      </div>
      <div className="workbench-art">
        <Artwork design={d} />
        <div>
          <strong>
            {d.size} · {d.finish === "oak" ? "Oak effect" : "Matte black"}
          </strong>
          <span>{o.proof_revision ? "Revised proof" : "Original proof"}</span>
          <span>{o.approved_hash ? "Approved" : "Not approved"}</span>
          {o.proof_hash && (
            <a
              className="text-link"
              target="_blank"
              rel="noreferrer"
              href={`/api/ops/orders/${o.id}/proof`}
            >
              Open exact PDF <Icon name="arrow" size={14} />
            </a>
          )}
        </div>
      </div>
      {o.render_error && (
        <div className="error-message">
          <p>{o.render_error}</p>
          <button
            className="text-button"
            onClick={() => action("retry-render")}
            disabled={busy}
          >
            Retry failed render
          </button>
        </div>
      )}
      <div className="workbench-section">
        <h4>Delivery details</h4>
        <p>
          {o.address ? (
            <>
              {o.address.name}
              <br />
              {o.address.line}
              <br />
              {o.address.city} · {o.address.phone}
            </>
          ) : (
            "No confirmed address."
          )}
        </p>
        <span className="caption">
          Owner: {o.ops_owner || "Unassigned"}{" "}
          {o.due_at ? "· Due " + date(o.due_at) : ""}
        </span>
      </div>
      <div className="workbench-section">
        <h4>Production release</h4>
        <p>
          Verified payment, the exact approved PDF, a confirmed address, and no
          blocking requests are required.
        </p>
        <button
          className="button wide"
          disabled={!eligible || busy}
          onClick={() => action("release")}
        >
          Release to manual queue <Icon name="arrow" size={16} />
        </button>
        <p className="fine-print">
          Queues production only. It does not place a supplier order.
        </p>
      </div>
      {next[o.production] && (
        <form
          className="workbench-section"
          onSubmit={(e) => {
            e.preventDefault();
            void action("production", { state: next[o.production], evidence });
          }}
        >
          <h4>Record {statusLabel[next[o.production]].toLowerCase()}</h4>
          <label className="field">
            Supplier / QA evidence
            <textarea
              required
              minLength={8}
              maxLength={500}
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="Record the actual supplier acknowledgement or quality-check reference."
              rows={3}
            />
          </label>
          <button
            className="button secondary wide"
            disabled={busy || evidence.trim().length < 8}
          >
            Record verified stage
          </button>
        </form>
      )}
      {o.production === "ready" && shipmentNext[o.fulfillment]?.length > 0 && (
        <form
          className="workbench-section"
          onSubmit={(e) => {
            e.preventDefault();
            void action("shipment", shipment);
          }}
        >
          <h4>Actual courier update</h4>
          <label className="field">
            Carrier
            <input
              required
              minLength={2}
              disabled={!!o.shipment}
              value={shipment.carrier}
              onChange={(e) =>
                setShipment({ ...shipment, carrier: e.target.value })
              }
            />
          </label>
          <label className="field">
            Tracking reference
            <input
              required
              minLength={5}
              disabled={!!o.shipment}
              value={shipment.reference}
              onChange={(e) =>
                setShipment({ ...shipment, reference: e.target.value })
              }
            />
          </label>
          <label className="field">
            Verified state
            <select
              value={shipment.state}
              onChange={(e) =>
                setShipment({ ...shipment, state: e.target.value })
              }
            >
              {shipmentNext[o.fulfillment].map((s) => (
                <option key={s} value={s}>
                  {statusLabel[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Evidence
            <textarea
              required
              minLength={8}
              maxLength={500}
              value={shipment.evidence}
              onChange={(e) =>
                setShipment({ ...shipment, evidence: e.target.value })
              }
              rows={3}
            />
          </label>
          <button disabled={busy} className="button secondary wide">
            Record courier update
          </button>
        </form>
      )}
      {o.checkout_state === "ambiguous" && (
        <form
          className="workbench-section"
          onSubmit={(e) => {
            e.preventDefault();
            void action("recover-checkout", { tracker });
          }}
        >
          <h4>Recover uncertain checkout</h4>
          <p>
            The provider must confirm this exact order reference and amount.
          </p>
          <label className="field">
            Provider tracker
            <input
              required
              value={tracker}
              onChange={(e) => setTracker(e.target.value)}
              placeholder="track_…"
            />
          </label>
          <button className="button secondary wide" disabled={busy}>
            Verify and attach tracker
          </button>
        </form>
      )}
      <div className="workbench-section">
        <h4>Support requests</h4>
        {!o.requests?.length ? (
          <p>No requests on this order.</p>
        ) : (
          o.requests.map((r: any) => (
            <article className="ops-request" key={r.id}>
              <div>
                <strong>{r.category}</strong>
                <span className="status-badge">{r.status}</span>
              </div>
              <p>{r.message}</p>
              {r.response && <p className="request-response">{r.response}</p>}
              {r.status === "open" && (
                <button
                  className="text-button"
                  onClick={() => {
                    setRequestId(r.id);
                    setReply("");
                  }}
                >
                  Write response
                </button>
              )}
            </article>
          ))
        )}
        {requestId && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action("resolve-request", { requestId, response: reply });
              setRequestId("");
            }}
          >
            <label className="field">
              Customer response
              <textarea
                required
                minLength={8}
                maxLength={1000}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
              />
            </label>
            <button
              className="button secondary"
              disabled={busy || reply.trim().length < 8}
            >
              Send response
            </button>
          </form>
        )}
      </div>
      {openRevision && o.proof_revision < 1 && (
        <form
          className="workbench-section"
          onSubmit={(e) => {
            e.preventDefault();
            void action("revise", { design: revision });
          }}
        >
          <h4>Prepare included wording revision</h4>
          <p>
            Only wording can change. The original purchase stays immutable and
            approval will be cleared.
          </p>
          {["title", "subtitle", "date"].map((k) => (
            <label className="field" key={k}>
              {k === "title"
                ? "Headline"
                : k === "subtitle"
                  ? "Message"
                  : "Date"}
              <input
                value={revision[k]}
                maxLength={k === "title" ? 32 : k === "subtitle" ? 48 : 24}
                onChange={(e) =>
                  setRevision({ ...revision, [k]: e.target.value })
                }
              />
            </label>
          ))}
          <button className="button wide" disabled={busy}>
            Prepare revised proof
          </button>
        </form>
      )}
      <div className="workbench-section">
        <h4>Audit history</h4>
        {o.audit?.length ? (
          <ol className="ops-audit">
            {o.audit.map((a: any) => (
              <li key={a.id}>
                <strong>{a.action}</strong>
                <small>
                  {date(a.created_at)} · {a.actor}
                </small>
              </li>
            ))}
          </ol>
        ) : (
          <p>No operator actions yet.</p>
        )}
      </div>
      {o.payments?.some((p: any) => p.status === "failed") && (
        <div className="error-message">
          <strong>Payment reconciliation needs review</strong>
          {o.payments
            .filter((p: any) => p.status === "failed")
            .map((p: any) => (
              <p key={p.id}>{p.error}</p>
            ))}
        </div>
      )}
    </aside>
  );
}
