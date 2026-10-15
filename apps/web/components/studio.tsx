"use client";
import { useEffect, useState, useReducer, useRef } from "react";
import type { CSSProperties } from "react";
import { historyReducer } from "../../../packages/domain/src/editor-history";
import { CoordinateControls } from "./coordinate-controls";
import { MemoryControls } from "./memory-controls";
import { PhotoQualityReview } from "./photo-quality";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Design,
  catalog,
  designSchema,
  price,
} from "../../../packages/domain/src/index";
import { Artwork } from "./artwork";
import { ArtworkDialog } from "./artwork-dialog";
import { Icon } from "./icons";
import { api, money, ApiError } from "../lib/client";
export default function Studio({
  initial,
  draftId,
  explicitFormat = false,
}: {
  initial: Design;
  draftId?: string;
  explicitFormat?: boolean;
}) {
  const router = useRouter(),
    [history, dispatch] = useReducer(historyReducer<Design>, {
      past: [],
      present: initial,
      future: [],
    }),
    [step, setStep] = useState(0),
    [draft, setDraft] = useState<{ id: string; revision: number }>(),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false),
    [zoom, setZoom] = useState(false),
    [coordinatesValid, setCoordinatesValid] = useState(true),
    [conflict, setConflict] = useState(false),
    [saving, setSaving] = useState(false),
    [autosavePaused, setAutosavePaused] = useState(false),
    [mediaBusy, setMediaBusy] = useState(false),
    [scene, setScene] = useState("front");
  const design = history.present;
  const saved = useRef(JSON.stringify(initial)),
    currentDraftId = useRef<string | undefined>(undefined),
    inFlight = useRef(false),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const product = catalog.find((p) => p.id === design.template)!;
  useEffect(() => {
    if (draftId && currentDraftId.current === draftId) return;
    let alive = true;
    (async () => {
      try {
        await api("session", {});
        if (draftId) {
          const d = await api("drafts/" + draftId);
          if (alive) {
            const parsed = designSchema.parse(d.design);
            dispatch({ type: "reset", value: parsed });
            saved.current = JSON.stringify(parsed);
            currentDraftId.current = d.id;
            setDraft({ id: d.id, revision: d.revision });
          }
        } else {
          const saved = localStorage.getItem("keepsake-v2-" + initial.template);
          if (saved && alive) {
            const parsed = designSchema.parse(JSON.parse(saved));
            if (
              parsed.memory &&
              initial.memory &&
              parsed.template !== initial.template
            ) {
              parsed.template = initial.template;
              parsed.memory.layout = initial.memory.layout;
            }
            dispatch({
              type: "reset",
              value: explicitFormat
                ? { ...parsed, size: initial.size, finish: initial.finish }
                : parsed,
            });
          }
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
  }, [draftId, initial.template, explicitFormat, initial.size, initial.finish]);
  useEffect(() => {
    if (loaded)
      localStorage.setItem(
        "keepsake-v2-" + initial.template,
        JSON.stringify(design),
      );
  }, [design, loaded, initial.template]);
  function update(key: keyof Design, value: string) {
    edit({
      ...design,
      [key]: value,
      ...(key === "size" && design.memory
        ? { memory: { ...design.memory, qualityAcknowledged: false } }
        : {}),
    });
  }
  function edit(next: Design) {
    dispatch({ type: "edit", value: next });
    setNotice("");
    if (!conflict) setError("");
    setAutosavePaused(false);
  }
  async function save(automatic = false) {
    if (
      inFlight.current ||
      conflict ||
      !coordinatesValid ||
      !designSchema.safeParse(design).success
    )
      return;
    inFlight.current = true;
    setSaving(true);
    setError("");
    try {
      const d = await api("drafts", {
        design,
        id: draft?.id,
        revision: draft?.revision,
      });
      saved.current = JSON.stringify(design);
      if (mounted.current) {
        currentDraftId.current = d.id;
        setDraft({ id: d.id, revision: d.revision });
        if (!draftId)
          router.replace(`/design/${design.template}?draft=${d.id}`, {
            scroll: false,
          });
        setNotice(
          automatic
            ? "Changes saved privately."
            : "Saved to My keepsakes in this browser.",
        );
      }
    } catch (e) {
      if (mounted.current) {
        setAutosavePaused(true);
        setError((e as Error).message);
        if (e instanceof ApiError && e.data.code === "draft_conflict")
          setConflict(true);
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setSaving(false);
    }
  }
  useEffect(() => {
    if (
      !loaded ||
      conflict ||
      !coordinatesValid ||
      saving ||
      autosavePaused ||
      JSON.stringify(design) === saved.current
    )
      return;
    const timer = setTimeout(() => {
      void save(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, [
    design,
    loaded,
    draft,
    conflict,
    coordinatesValid,
    saving,
    autosavePaused,
  ]);
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
      router.push("/checkout/" + q.id + (draft ? "?draft=" + draft.id : ""));
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
          href={"/products/" + design.template}
          className="text-link back-link"
        >
          ← Back to design
        </Link>
        <span>
          <Icon name="shield" size={15} /> Your artwork stays private
        </span>
        <button
          className="text-button"
          onClick={() => save()}
          disabled={
            busy ||
            mediaBusy ||
            saving ||
            !loaded ||
            conflict ||
            !coordinatesValid
          }
        >
          <Icon name="download" size={15} />
          {saving ? "Saving…" : "Save draft"}
        </button>
      </div>
      <div className="studio-layout">
        <div
          className="studio-preview"
          role="region"
          aria-label="Artwork preview"
          tabIndex={0}
        >
          <span className="eyebrow">YOUR STORY, TAKING SHAPE</span>
          <div className="preview-frame-controls">
            <label>
              Frame size
              <select
                aria-label="Preview frame size"
                value={design.size}
                onChange={(e) =>
                  edit({ ...design, size: e.target.value as Design["size"] })
                }
              >
                <option value="A4">A4 · 21 × 29.7 cm</option>
                <option value="A3">A3 · 29.7 × 42 cm</option>
              </select>
            </label>
            <label>
              Frame finish
              <select
                aria-label="Preview frame finish"
                value={design.finish}
                onChange={(e) =>
                  edit({
                    ...design,
                    finish: e.target.value as Design["finish"],
                  })
                }
              >
                <option value="oak">Natural oak effect</option>
                <option value="black">Matte black</option>
              </select>
            </label>
          </div>
          <div className="preview-meta">
            {step === 0 && design.memory && (
              <p className="text-position-hint">
                Drag text up or down to adjust spacing. Use arrow keys for
                precise movement.
              </p>
            )}
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
              Preview of a physical print · Production files are reserved for
              the print team.
            </p>
          </div>
          <div
            className={"studio-art memory-scene-" + scene}
            style={
              {
                "--preview-frame-width":
                  design.size === "A4" ? "285px" : "360px",
              } as CSSProperties
            }
          >
            <Artwork
              design={design}
              inspirationWhenEmpty
              onTextPosition={
                step === 0 && design.memory
                  ? (key, y) =>
                      edit({
                        ...design,
                        memory: {
                          ...design.memory!,
                          textPositions: {
                            ...design.memory!.textPositions,
                            [key]: y,
                          },
                        },
                      })
                  : undefined
              }
              onPhotoPosition={
                step === 0 && design.memory
                  ? (index, position) => {
                      if (index < 0) return;
                      edit({
                        ...design,
                        memory: {
                          ...design.memory!,
                          qualityAcknowledged: false,
                          photos: design.memory!.photos.map((p, i) =>
                            i === index ? { ...p, ...position } : p,
                          ),
                        },
                      });
                    }
                  : undefined
              }
            />
          </div>
          <div className="scene-switch" aria-label="Preview setting">
            {[
              ["front", "Artwork"],
              ["wall", "On the wall"],
              ["shelf", "On a shelf"],
            ].map(([id, label]) => (
              <button
                key={id}
                className={scene === id ? "selected" : ""}
                aria-pressed={scene === id}
                onClick={() => setScene(id)}
              >
                {label}
              </button>
            ))}
          </div>
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
                "Compose something lasting.",
                "Give it a home.",
                "A little piece of you.",
              ][step]
            }
          </h1>
          <p className="control-intro">
            {
              [
                design.template === "quran" || design.template === "hadith"
                  ? "Your chosen passage, its source, and a composition made with care."
                  : "A landscape, a place, or an object of quiet beauty. Add the words that make it yours.",
                "Choose the scale and finish that feel right for your space.",
                "Check the details below. You’ll approve the exact print proof before production.",
              ][step]
            }
          </p>
          <div className="editor-history" aria-label="Editing history">
            <button
              className="text-button"
              disabled={!history.past.length}
              onClick={() => {
                dispatch({ type: "undo" });
                setNotice("");
                setAutosavePaused(false);
              }}
            >
              ↶ Undo
            </button>
            <button
              className="text-button"
              disabled={!history.future.length}
              onClick={() => {
                dispatch({ type: "redo" });
                setNotice("");
                setAutosavePaused(false);
              }}
            >
              ↷ Redo
            </button>
            <span className="field-hint">
              {saving ? "Saving changes…" : "Edits save after a short pause"}
            </span>
          </div>
          {step === 0 && (
            <div className="story-fields">
              {design.memory && (
                <MemoryControls
                  design={design}
                  change={edit}
                  onBusy={setMediaBusy}
                />
              )}
              {design.template === "coordinates" && (
                <CoordinateControls
                  design={design}
                  validity={setCoordinatesValid}
                  change={edit}
                />
              )}
              {[
                {
                  key: "title",
                  label: "Artwork title",
                  placeholder: "e.g. Light upon limestone",
                  max: 32,
                  hint: "The words at the heart of your artwork.",
                },
                {
                  key: "subtitle",
                  label: "Your personal message",
                  placeholder: "e.g. The Tuscany collection",
                  max: 48,
                  hint: "A collection, a dedication, or a detail worth remembering.",
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
                    <span>
                      {field.label}
                      {field.key !== "title" && (
                        <span className="optional-label"> (optional)</span>
                      )}
                    </span>
                    <small>
                      {design[field.key as "title"].length}/{field.max}
                    </small>
                  </span>
                  <input
                    value={design[field.key as "title"]}
                    onChange={(e) =>
                      update(field.key as keyof Design, e.target.value)
                    }
                    placeholder={
                      field.key === "title"
                        ? field.placeholder
                        : "Optional · " + field.placeholder
                    }
                    maxLength={field.max}
                  />
                  <span className="field-hint">{field.hint}</span>
                </label>
              ))}
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
              {design.memory && (
                <PhotoQualityReview design={design} change={edit} />
              )}
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
                {design.memory && (
                  <>
                    <div>
                      <dt>Memory</dt>
                      <dd>
                        {design.memory.mode === "words"
                          ? "Written story"
                          : design.memory.mode === "place"
                            ? "Special place & map"
                            : `${design.memory.photos.length} private photograph(s)`}
                      </dd>
                    </div>
                    <div>
                      <dt>Personal details</dt>
                      <dd>
                        {[design.memory.names, design.memory.place]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </dd>
                    </div>
                    {design.memory.mode === "words" && (
                      <div>
                        <dt>Your story</dt>
                        <dd>{design.memory.narrative}</dd>
                      </div>
                    )}
                  </>
                )}
              </dl>
              <div className="soft-note">
                <Icon name="shield" />
                <p>
                  One wording revision is included before production. Your final
                  preview requires your approval. You’re purchasing a physical
                  print.
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
          {conflict && (
            <Link
              className="text-link"
              href={"/design/" + initial.template + "?draft=" + draft?.id}
              onClick={() => window.location.reload()}
            >
              Reload the saved draft to resolve the conflict
            </Link>
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
              disabled={
                busy || mediaBusy || !loaded || !coordinatesValid || conflict
              }
            >
              {busy
                ? "Preparing…"
                : step === 2
                  ? "Review delivery & total"
                  : "Continue"}
              <Icon name="arrow" />
            </button>
          </div>
          <p className="fine-print">
            Test checkout only. You’re free to edit until you place your order.
          </p>
        </div>
      </div>
      {zoom && <ArtworkDialog design={design} onClose={() => setZoom(false)} />}
    </section>
  );
}
