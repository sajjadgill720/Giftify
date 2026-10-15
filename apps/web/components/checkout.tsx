"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Artwork } from "./artwork";
import { Icon } from "./icons";
import { api, money, ApiError } from "../lib/client";
import { catalog } from "../../../packages/domain/src/index";
export default function Checkout({ quoteId }: { quoteId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter(),
    params = useSearchParams(),
    [q, setQ] = useState<any>(),
    [config, setConfig] = useState<any>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [summaryOpen, setSummaryOpen] = useState(true),
    [fields, setFields] = useState<Record<string, string>>({}),
    [remaining, setRemaining] = useState<number | null>(null),
    [address, setAddress] = useState({
      name: "",
      phone: "",
      line: "",
      city: "Islamabad",
      country: "PK",
      confirmed: false,
    });
  useEffect(() => {
    if (Object.keys(fields).length)
      formRef.current
        ?.querySelector<HTMLInputElement>("[aria-invalid='true']")
        ?.focus();
  }, [fields]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const update = () => setSummaryOpen(!media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    Promise.all([api("quotes/" + quoteId), api("config")])
      .then(([quote, configuration]) => {
        setQ(quote);
        setConfig(configuration);
        setRemaining(
          Math.max(
            0,
            Math.ceil(
              (new Date(quote.expires_at).getTime() - Date.now()) / 1000,
            ),
          ),
        );
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
    if (busy || !config || remaining === null || remaining === 0) return;
    setError("");
    setFields({});
    setBusy(true);
    try {
      const d = await api("checkouts", { quoteId, address });
      location.assign(d.url);
    } catch (e) {
      if (e instanceof ApiError) {
        if (
          ["payment_setup_required", "proof_preparing"].includes(e.data.code) &&
          e.data.orderId
        ) {
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
  const originDraft = params.get("draft");
  const editHref =
    "/design/" +
    (q?.design.template || "photo") +
    (originDraft && /^[0-9a-f-]{36}$/i.test(originDraft)
      ? "?draft=" + originDraft
      : "");
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
      <Link href={editHref} className="text-link back-link">
        ← Back to your studio
      </Link>
      <div className="checkout-heading">
        <p className="eyebrow">The final details</p>
        <h1>
          A thoughtful finish <em>to your story.</em>
        </h1>
        <p>
          Check your artwork, confirm delivery, then review your private proof.
        </p>
      </div>
      <ol className="checkout-journey" aria-label="Order journey">
        <li aria-current="step">
          <span>01</span>
          <strong>Delivery details</strong>
        </li>
        <li>
          <span>02</span>
          <strong>
            {config?.paymentReady ? "Test payment" : "Save unpaid order"}
          </strong>
        </li>
        <li>
          <span>03</span>
          <strong>Approve your proof</strong>
        </li>
      </ol>
      <div className="checkout-test-note">
        <Icon name="shield" size={18} />
        <p>
          <strong>Preview store · Test mode</strong> No live payment is
          collected. Your proof must be approved before production.
        </p>
      </div>
      {remaining === 0 && (
        <div className="error-message" role="alert">
          This quote has expired.{" "}
          <Link href={editHref}>Return to the studio for a fresh quote.</Link>
        </div>
      )}
      <div className="checkout-layout">
        <form ref={formRef} onSubmit={submit} className="checkout-form">
          <div className="form-heading">
            <span className="number-circle">1</span>
            <div>
              <h2>Delivery details</h2>
              <p>
                Pakistan · Islamabad, Rawalpindi, Lahore & Karachi. All fields
                are required.
              </p>
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
                  aria-describedby={
                    fields["address." + f.key] ? "error-" + f.key : undefined
                  }
                />
                {fields["address." + f.key] && (
                  <small className="field-error" id={"error-" + f.key}>
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
              aria-invalid={!!fields["address.line"]}
              aria-describedby={
                fields["address.line"] ? "error-line" : undefined
              }
            />
            {fields["address.line"] && (
              <small className="field-error" id="error-line">
                {fields["address.line"]}
              </small>
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
              <h2>
                {config?.paymentReady
                  ? "Continue securely"
                  : "Review before production"}
              </h2>
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
                : "Payment setup is pending. Save an unpaid order to review your private proof; this does not confirm payment or dispatch."}
            </p>
          </div>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <div className="checkout-submit">
            <div className="checkout-action-total">
              <span>Test order total</span>
              <strong>{money(q.price.total)}</strong>
            </div>
            <button
              className="button wide"
              disabled={busy || !remaining || !config}
            >
              {busy
                ? "Saving your order…"
                : config?.paymentReady
                  ? "Continue to test payment"
                  : "Save unpaid order & view proof"}
              <Icon name="arrow" />
            </button>
            <span className="checkout-action-hint">
              {config?.paymentReady
                ? "Next: Safepay hosted test checkout"
                : "No payment is collected at this step."}
            </span>
          </div>
          <p className="fine-print">
            By continuing you accept the <Link href="/terms">pilot terms</Link>.
            Approval of your proof is a separate step.
          </p>
        </form>
        <aside className="checkout-summary" aria-label="Your order summary">
          <p className="eyebrow">Made personal by you</p>
          <h3>Your personal keepsake</h3>
          <div className="summary-product">
            <div className="summary-artwork">
              <Artwork design={q.design} />
            </div>
            <div className="summary-product-copy">
              <strong>{q.design.title}</strong>
              <span>
                {q.design.size} ·{" "}
                {q.design.finish === "oak" ? "Oak effect" : "Matte black"}
              </span>
              <span>
                {catalog.find((p) => p.id === q.design.template)?.category} ·
                Physical print
              </span>
              <Link href={editHref}>Edit design</Link>
            </div>
          </div>
          <div className="checkout-summary-total">
            <span>Test order total</span>
            <strong>{money(q.price.total)}</strong>
          </div>
          <details
            className="checkout-summary-details"
            open={summaryOpen}
            onToggle={(e) => setSummaryOpen(e.currentTarget.open)}
          >
            <summary>
              Personalization & price breakdown <Icon name="down" size={16} />
            </summary>
            <dl className="checkout-personalization">
              {[
                ["Names", q.design.memory?.names],
                ["Message", q.design.subtitle],
                ["Date", q.design.date],
                ["Location", q.design.memory?.place],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
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
            <details className="quote-expiry-details">
              <summary>Quote validity</summary>
              <p className="quote-expiry">
                <Icon name="clock" size={15} />
                {remaining
                  ? `Quote valid for ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
                  : remaining === null
                    ? "Checking quote…"
                    : "Quote expired"}
              </p>
            </details>
            <div className="summary-note">
              <Icon name="frame" size={18} />
              <p>
                Next, review your private proof. One wording revision is
                included. Production requires payment confirmation and your
                approval.
              </p>
            </div>
            <p className="fine-print">
              Prices are provisional. Tax and supplier specifications must be
              confirmed before live ordering.
            </p>
          </details>
        </aside>
      </div>
    </section>
  );
}
