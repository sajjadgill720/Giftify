"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, money, date, statusLabel } from "../lib/client";
import { Artwork } from "./artwork";
import { Icon } from "./icons";
export default function MyOrders() {
  const [orders, setOrders] = useState<any[]>([]),
    [drafts, setDrafts] = useState<any[]>([]),
    [tab, setTab] = useState("orders"),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [user, setUser] = useState<any>();
  async function load() {
    setLoading(true);
    setError("");
    try {
      await api("session", {});
      const [o, d] = await Promise.all([api("orders"), api("drafts")]);
      setOrders(o);
      setDrafts(d);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    api("auth/me")
      .then(setUser)
      .catch(() => {});
  }, []);
  const items = tab === "orders" ? orders : drafts;
  return (
    <section className="section my-orders">
      <div className="section-heading">
        <div>
          <p className="eyebrow">YOUR STORIES, ALL TOGETHER</p>
          <h1>
            My <em>keepsakes.</em>
          </h1>
          <p>
            Saved designs, thoughtful gifts, and the next step for each one.
          </p>
        </div>
        <Link href="/shop" className="button secondary">
          Create something new <Icon name="arrow" size={17} />
        </Link>
      </div>
      <div className="portal-tabs">
        {["orders", "drafts"].map((t) => (
          <button
            className={tab === t ? "active" : ""}
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
            key={t}
          >
            {t === "orders" ? "My orders" : "Saved designs"}{" "}
            <span>{t === "orders" ? orders.length : drafts.length}</span>
          </button>
        ))}
        <button onClick={load} className="text-button">
          <Icon name="clock" size={15} />
          Refresh
        </button>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <div className="skeleton tall" aria-label="Loading your keepsakes" />
      ) : !items.length ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Icon name={tab === "orders" ? "bag" : "frame"} size={34} />
          </div>
          <h2>
            {tab === "orders"
              ? "Your next story starts here."
              : "A little inspiration, saved for later."}
          </h2>
          <p>
            {tab === "orders"
              ? "When you place a test order, you’ll find its proof and progress here."
              : "Save a design in the studio and come back whenever your moment arrives."}
          </p>
          <Link href="/shop" className="button">
            Explore the collection <Icon name="arrow" />
          </Link>
        </div>
      ) : (
        <div className="keepsake-grid">
          {items.map((o) => (
            <article key={o.id}>
              <Link
                className="keepsake-card"
                href={
                  tab === "orders"
                    ? "/orders/" + o.id
                    : `/design/${o.design.template}?draft=${o.id}`
                }
              >
                <div className="keepsake-art">
                  <Artwork design={o.proof_design || o.design} />
                </div>
                <div>
                  <span className="caption">
                    {tab === "orders"
                      ? "ORDER #" + o.id.slice(0, 8).toUpperCase()
                      : "YOUR SAVED DESIGN"}
                  </span>
                  <h3>{(o.proof_design || o.design).title}</h3>
                  <p>
                    {o.design.size} ·{" "}
                    {o.design.finish === "oak" ? "Oak effect" : "Matte black"}
                  </p>
                  <span className="status-badge">
                    {tab === "orders"
                      ? o.approved_hash
                        ? "Proof approved"
                        : statusLabel[o.payment]
                      : "Ready to personalize"}
                  </span>
                  <div className="keepsake-bottom">
                    <span>
                      {date(tab === "orders" ? o.created_at : o.updated_at)}
                    </span>
                    <Icon name="arrow" size={18} />
                  </div>
                </div>
              </Link>
              {tab === "drafts" && (
                <div className="draft-actions">
                  <button
                    className="text-button"
                    onClick={async () => {
                      try {
                        const copy = await api("drafts", { design: o.design });
                        location.assign(
                          `/design/${copy.design.template}?draft=${copy.id}`,
                        );
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    Duplicate design
                  </button>
                  <button
                    className="text-button"
                    onClick={async () => {
                      try {
                        await api(`drafts/${o.id}/archive`, {
                          revision: o.revision,
                        });
                        const key = "keepsake-v2-" + o.design.template;
                        if (
                          localStorage.getItem(key) === JSON.stringify(o.design)
                        )
                          localStorage.removeItem(key);
                        await load();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    Delete draft
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      <div className="guest-note">
        <Icon name="shield" size={19} />
        <p>
          {user ? (
            `Signed in as ${user.email}. Your verified account can access the guest keepsakes linked to it across devices.`
          ) : (
            <>
              Your guest orders and saved designs are private to this browser’s
              seven-day session.{" "}
              <Link href="/account">Link a verified account</Link> to keep them
              accessible across devices.
            </>
          )}
        </p>
      </div>
    </section>
  );
}
