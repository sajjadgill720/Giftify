"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Artwork } from "./artwork";
import { Icon } from "./icons";
import { api, money, ApiError } from "../lib/client";
export default function Checkout({ quoteId }: { quoteId: string }) {
  const router = useRouter(),
    [q, setQ] = useState<any>(),
    [config, setConfig] = useState<any>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [fields, setFields] = useState<Record<string, string>>({}),
    [remaining, setRemaining] = useState(0),
    [address, setAddress] = useState({
      name: "",
      phone: "",
      line: "",
      city: "Islamabad",
      country: "PK",
      confirmed: false,
    });
  useEffect(() => {
    Promise.all([api("quotes/" + quoteId), api("config")])
      .then(([quote, configuration]) => {
        setQ(quote);
        setConfig(configuration);
      })
      .catch((e) => setError(e.message));
  }, [quoteId]);
  useEffect(() => {
    if (!q) return;
    const update = () =>
      setRemaining(
        Math.max(
          0,
          Math.ceil((new Date(q.expires_at).getTime() - Date.now()) / 1000),
        ),
      );
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [q]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFields({});
    setBusy(true);
    try {
      const d = await api("checkouts", { quoteId, address });
      location.assign(d.url);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.data.code === "payment_setup_required" && e.data.orderId) {
          router.push("/orders/" + e.data.orderId);
          return;
        }
        setFields(e.data.fields || {});
      }
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!q)
    return (
      <section className="section narrow">
        <h1>Your keepsake checkout</h1>
        {error ? (
          <>
            <p className="error-message" role="alert">
              {error}
            </p>
            <Link href="/shop" className="button">
              Return to the collection
            </Link>
          </>
        ) : (
          <div className="skeleton tall" aria-label="Loading your quote" />
        )}
      </section>
    );
  return (
    <section className="section checkout-page">
      <Link
        href={"/design/" + q.design.template}
        className="text-link back-link"
      >
        ← Back to your studio
      </Link>
      <div className="checkout-heading">
        <p className="eyebrow">ONE STEP CLOSER TO SOMETHING PERSONAL</p>
        <h1>
          Your keepsake, <em>made yours.</em>
        </h1>
        <p>
          <Icon name="shield" size={16} /> Private details · Exact proof
          approval · Test checkout
        </p>
      </div>
      {!remaining && (
        <div className="error-message" role="alert">
          This quote has expired.{" "}
          <Link href={"/design/" + q.design.template}>
            Return to the studio for a fresh quote.
          </Link>
        </div>
      )}
      <div className="checkout-layout">
        <form onSubmit={submit} className="checkout-form">
          <div className="form-heading">
            <span className="number-circle">1</span>
            <div>
              <h2>Where should it go?</h2>
              <p>Domestic delivery within our four pilot cities.</p>
            </div>
          </div>
          <div className="form-grid">
            {[
              {
                key: "name",
                label: "Recipient’s full name",
                autocomplete: "name",
                placeholder: "Full name",
                type: "text",
              },
              {
                key: "phone",
                label: "Pakistan phone number",
                autocomplete: "tel",
                placeholder: "0300 1234567",
                type: "tel",
              },
            ].map((f) => (
              <label className="field" key={f.key}>
                {f.label}
                <input
                  required
                  type={f.type}
                  autoComplete={f.autocomplete}
                  value={address[f.key as "name" | "phone"]}
                  onChange={(e) =>
                    setAddress({
                      ...address,
                      [f.key]: e.target.value.replace(
                        f.key === "phone" ? /[\s()-]/g : /$^/g,
                        "",
                      ),
                    })
                  }
                  placeholder={f.placeholder}
                  maxLength={f.key === "name" ? 80 : 16}
                  aria-invalid={!!fields["address." + f.key]}
                />
                {fields["address." + f.key] && (
                  <small className="field-error">
                    {fields["address." + f.key]}
                  </small>
                )}
              </label>
            ))}
          </div>
          <label className="field">
            Street address
            <input
              required
              minLength={8}
              maxLength={160}
              autoComplete="street-address"
              value={address.line}
              onChange={(e) => setAddress({ ...address, line: e.target.value })}
              placeholder="House, street, neighborhood"
            />
            {fields["address.line"] && (
              <small className="field-error">{fields["address.line"]}</small>
            )}
          </label>
          <div className="form-grid">
            <label className="field">
              City
              <select
                value={address.city}
                onChange={(e) =>
                  setAddress({ ...address, city: e.target.value })
                }
              >
                {["Islamabad", "Rawalpindi", "Lahore", "Karachi"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Country
              <input disabled value="Pakistan" />
            </label>
          </div>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={address.confirmed}
              onChange={(e) =>
                setAddress({ ...address, confirmed: e.target.checked })
              }
              required
            />
            <span>
              I confirm these details and have permission to provide them for
              this order. <Link href="/privacy">Privacy details</Link>
            </span>
          </label>
          <div className="form-heading payment-heading">
            <span className="number-circle">2</span>
            <div>
              <h2>A clear next step.</h2>
              <p>
                {config?.paymentReady
                  ? "You’ll continue to Safepay’s hosted test checkout."
                  : "You can save your order and review your proof."}
              </p>
            </div>
          </div>
          <div className="soft-note">
            <Icon name="shield" />
            <p>
              {config?.paymentReady
                ? "Payment is verified by the provider. Your card details stay on their hosted checkout. No real money is collected in test mode."
                : "Test payment is not connected yet. Saving creates an unpaid order with a private proof. No payment or shipping will be simulated."}
            </p>
          </div>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <button className="button wide" disabled={busy || !remaining}>
            {busy
              ? "Saving your order…"
              : config?.paymentReady
                ? "Continue to test payment"
                : "Save order & review proof"}
            <Icon name="arrow" />
          </button>
          <p className="fine-print">
            By continuing you accept the <Link href="/terms">pilot terms</Link>.
            Approval of your proof is a separate step.
          </p>
        </form>
        <aside className="checkout-summary">
          <h3>Your personal keepsake</h3>
          <div className="summary-product">
            <Artwork design={q.design} />
            <div>
              <strong>{q.design.title}</strong>
              <span>
                {q.design.size} ·{" "}
                {q.design.finish === "oak" ? "Oak effect" : "Matte black"}
              </span>
              <span>Personalized milestone art</span>
              <Link href={"/design/" + q.design.template}>Edit design</Link>
            </div>
          </div>
          <dl className="price-breakdown">
            <div>
              <dt>Artwork</dt>
              <dd>{money(q.price.product)}</dd>
            </div>
            <div>
              <dt>Frame upgrade</dt>
              <dd>{q.price.frame ? money(q.price.frame) : "Included"}</dd>
            </div>
            <div>
              <dt>Delivery allowance</dt>
              <dd>{money(q.price.shipping)}</dd>
            </div>
            <div>
              <dt>Tax</dt>
              <dd>Not yet configured</dd>
            </div>
            <div className="price-total">
              <dt>Test order total</dt>
              <dd>{money(q.price.total)}</dd>
            </div>
          </dl>
          <p className="quote-expiry">
            <Icon name="clock" size={15} />
            {remaining
              ? `Quote valid for ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
              : "Quote expired"}
          </p>
          <div className="summary-note">
            <Icon name="frame" size={18} />
            <p>
              You review the exact print PDF before production. One wording
              revision is included.
            </p>
          </div>
          <p className="fine-print">
            Prices are provisional. Tax and supplier specifications must be
            confirmed before live ordering.
          </p>
        </aside>
      </div>
    </section>
  );
}
