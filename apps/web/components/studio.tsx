"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Design,
  catalog,
  designSchema,
  price,
} from "../../../packages/domain/src/index";
import { Artwork } from "./artwork";
import { Icon } from "./icons";
import { api, money, ApiError } from "../lib/client";
export default function Studio({
  initial,
  draftId,
}: {
  initial: Design;
  draftId?: string;
}) {
  const router = useRouter(),
    [design, setDesign] = useState(initial),
    [step, setStep] = useState(0),
    [draft, setDraft] = useState(draftId),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false),
    [zoom, setZoom] = useState(false);
  const product = catalog.find((p) => p.id === design.template)!;
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await api("session", {});
        if (draftId) {
          const d = await api("drafts/" + draftId);
          if (alive) setDesign(designSchema.parse(d.design));
        } else {
          const saved = localStorage.getItem("keepsake-v2-" + initial.template);
          if (saved && alive) setDesign(designSchema.parse(JSON.parse(saved)));
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [draftId, initial.template]);
  useEffect(() => {
    if (loaded)
      localStorage.setItem(
        "keepsake-v2-" + initial.template,
        JSON.stringify(design),
      );
  }, [design, loaded, initial.template]);
  function update(key: keyof Design, value: string) {
    setDesign((d) => ({ ...d, [key]: value }));
    setNotice("");
    setError("");
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      const d = await api("drafts", { design, id: draft });
      setDraft(d.id);
      setNotice("Saved to My keepsakes in this browser.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function next() {
    setError("");
    if (step < 2) {
      const parsed = designSchema.safeParse(design);
      if (!parsed.success) {
        setError(parsed.error.issues[0].message);
        return;
      }
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      const q = await api("quotes", design);
      router.push("/checkout/" + q.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="studio-page">
      <div className="studio-top">
        <Link
          href={"/products/" + initial.template}
          className="text-link back-link"
        >
          ← Back to design
        </Link>
        <span>
          <Icon name="shield" size={15} /> Your artwork stays private
        </span>
        <button
          className="text-button"
          onClick={save}
          disabled={busy || !loaded}
        >
          <Icon name="download" size={15} />
          Save draft
        </button>
      </div>
      <div className="studio-layout">
        <div className="studio-preview">
          <span className="eyebrow">YOUR STORY, TAKING SHAPE</span>
          <div className="studio-art">
            <Artwork design={design} />
          </div>
          <div className="preview-tools">
            <span>
              {design.size} ·{" "}
              {design.finish === "oak" ? "Oak effect" : "Matte black"} frame
            </span>
            <button
              className="icon-button"
              aria-label="View larger preview"
              onClick={() => setZoom(true)}
            >
              <Icon name="search" />
            </button>
          </div>
          <p className="fine-print">
            Artwork preview · Final print PDF is reviewed separately.
          </p>
        </div>
        <div className="studio-controls">
          <div className="step-tabs" aria-label="Design steps">
            {["Your story", "Size & finish", "Review"].map((s, i) => (
              <button
                className={step === i ? "active" : step > i ? "complete" : ""}
                onClick={() => setStep(i)}
                key={s}
                aria-current={step === i ? "step" : undefined}
              >
                <span>
                  {step > i ? <Icon name="check" size={12} /> : i + 1}
                </span>
                {s}
              </button>
            ))}
          </div>
          <p className="eyebrow">{product.name}</p>
          <h1>
            {
              [
                "Let’s tell your story.",
                "Give it a home.",
                "A little piece of you.",
              ][step]
            }
          </h1>
          <p className="control-intro">
            {
              [
                "A few thoughtful words can hold a whole memory. Make them yours.",
                "Choose the scale and finish that feel right for your space.",
                "Check the details below. You’ll approve the exact print proof before production.",
              ][step]
            }
          </p>
          {step === 0 && (
            <div className="story-fields">
              {[
                {
                  key: "title",
                  label: "Names or headline",
                  placeholder: "e.g. Our next chapter",
                  max: 32,
                  hint: "The words at the heart of your artwork.",
                },
                {
                  key: "subtitle",
                  label: "Your personal message",
                  placeholder: "e.g. Ayesha & Hamza",
                  max: 48,
                  hint: "A name, a dedication, or something only you two know.",
                },
                {
                  key: "date",
                  label: "Date or occasion",
                  placeholder: "e.g. 12.09.2026",
                  max: 24,
                  hint: "A date, a place, or a little reminder.",
                },
              ].map((field) => (
                <label key={field.key} className="field">
                  <span>
                    {field.label}
                    <small>
                      {design[field.key as "title"].length}/{field.max}
                    </small>
                  </span>
                  <input
                    value={design[field.key as "title"]}
                    onChange={(e) =>
                      update(field.key as keyof Design, e.target.value)
                    }
                    placeholder={field.placeholder}
                    maxLength={field.max}
                  />
                  <span className="field-hint">{field.hint}</span>
                </label>
              ))}
              <div className="soft-note">
                <Icon name="spark" size={18} />
                <p>
                  Simple words often say the most. English print proofs are
                  available; Urdu preview is supported while print validation is
                  underway.
                </p>
              </div>
            </div>
          )}
          {step === 1 && (
            <>
              <fieldset>
                <legend>Print size</legend>
                <div className="choice-row">
                  {(["A4", "A3"] as const).map((s) => (
                    <button
                      className={
                        "choice " + (design.size === s ? "selected" : "")
                      }
                      aria-pressed={design.size === s}
                      onClick={() => update("size", s)}
                      key={s}
                    >
                      <strong>{s}</strong>
                      <span>
                        {s === "A4" ? "21 × 29.7 cm" : "29.7 × 42 cm"}
                      </span>
                      <small>
                        {money(
                          price({ ...design, size: s, finish: "black" })
                            .product,
                        )}
                      </small>
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Frame finish</legend>
                <div className="finish-choices">
                  {(["oak", "black"] as const).map((f) => (
                    <button
                      className={design.finish === f ? "selected" : ""}
                      aria-pressed={design.finish === f}
                      onClick={() => update("finish", f)}
                      key={f}
                    >
                      <span className={"finish-swatch " + f} />
                      <span>{f === "oak" ? "Oak effect" : "Matte black"}</span>
                      {design.finish === f && <Icon name="check" size={14} />}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="soft-note">
                <Icon name="frame" />
                <p>
                  Print dimensions are exact. Frame materials, outer dimensions,
                  and supplier samples are still being verified.
                </p>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <dl className="review-list">
                <div>
                  <dt>Your headline</dt>
                  <dd>{design.title}</dd>
                </div>
                <div>
                  <dt>Your message</dt>
                  <dd>{design.subtitle || "—"}</dd>
                </div>
                <div>
                  <dt>Date or occasion</dt>
                  <dd>{design.date || "—"}</dd>
                </div>
                <div>
                  <dt>Your format</dt>
                  <dd>
                    {design.size} ·{" "}
                    {design.finish === "oak" ? "Oak effect" : "Matte black"}
                  </dd>
                </div>
              </dl>
              <div className="soft-note">
                <Icon name="shield" />
                <p>
                  One wording revision is included before production. Your final
                  PDF proof requires your approval.
                </p>
              </div>
            </>
          )}
          {notice && (
            <p className="success-message" role="status">
              <Icon name="check" size={17} />
              {notice}
            </p>
          )}
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <div className="studio-total">
            <span>
              Artwork & frame<small>Provisional price, before delivery</small>
            </span>
            <strong>
              {money(price(design).product + price(design).frame)}
            </strong>
          </div>
          <div className="studio-actions">
            {step > 0 && (
              <button
                className="button secondary"
                onClick={() => setStep(step - 1)}
              >
                Back
              </button>
            )}
            <button
              className="button"
              onClick={next}
              disabled={busy || !loaded}
            >
              {busy
                ? "Preparing…"
                : step === 2
                  ? "Get my price quote"
                  : "Continue"}
              <Icon name="arrow" />
            </button>
          </div>
          <p className="fine-print">
            Test checkout only. You’re free to edit until you place your order.
          </p>
        </div>
      </div>
      {zoom && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setZoom(false)}
        >
          <div
            className="preview-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Larger artwork preview"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              autoFocus
              className="icon-button"
              onClick={() => setZoom(false)}
              aria-label="Close preview"
            >
              <Icon name="close" />
            </button>
            <Artwork design={design} />
          </div>
        </div>
      )}
    </section>
  );
}
