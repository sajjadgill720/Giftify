"use client";
import { useEffect, useRef, useState } from "react";
import { Design } from "../../../packages/domain/src/index";
import {
  memoryTemplates,
  memoryProfiles,
  defaultMemory,
  cropGeometry,
  Photo,
  selectMemoryMode,
} from "../../../packages/domain/src/memory";
import {
  memoryLayout,
  memoryPictures,
} from "../../../packages/rendering/src/memory-layout";
import { api, ApiError } from "../lib/client";
import { Icon } from "./icons";
import { PrintQualityExplainer } from "./print-quality-explainer";
type Asset = { id: string; width: number; height: number };
export function MemoryControls({
  design,
  change,
  onBusy,
}: {
  design: Design;
  change: (next: Design) => void;
  onBusy: (busy: boolean) => void;
}) {
  const m = design.memory!,
    latest = useRef(design),
    [selected, setSelected] = useState(0),
    [assets, setAssets] = useState<Asset[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [replace, setReplace] = useState(false),
    [adding, setAdding] = useState(false),
    [query, setQuery] = useState(""),
    [imageQuery, setImageQuery] = useState(""),
    [results, setResults] = useState<any[]>([]),
    [mapsReady, setMapsReady] = useState(false),
    [point, setPoint] = useState<
      { latitude: number; longitude: number } | undefined
    >(m.map),
    [style, setStyle] = useState(m.map?.style || "streets-v4"),
    [zoom, setZoom] = useState(m.map?.zoom || 12);
  useEffect(() => {
    latest.current = design;
  }, [design]);
  useEffect(() => {
    setReplace(false);
    setAdding(false);
    setSelected(0);
    setError("");
  }, [m.mode]);
  useEffect(() => {
    api("assets")
      .then(setAssets)
      .catch(() => {});
    api("config")
      .then((c) => setMapsReady(c.mapsReady))
      .catch(() => {});
  }, []);
  function update(values: Partial<typeof m>) {
    const d = latest.current;
    change({ ...d, memory: { ...d.memory!, ...values } });
  }
  function pending(value: boolean) {
    setBusy(value);
    onBusy(value);
  }
  async function upload(files: FileList | File[] | null) {
    if (!files?.length) return;
    if (busy) return;
    setError("");
    pending(true);
    try {
      const available = replace ? 1 : 4 - latest.current.memory!.photos.length;
      if (files.length > available)
        throw new Error(
          "You can keep up to four photographs in a design. Remove one first, or replace the selected photo.",
        );
      for (const file of Array.from(files).slice(0, available)) {
        if (!["image/jpeg", "image/png"].includes(file.type))
          throw new Error("Choose a JPEG or PNG photograph.");
        if (file.size > 8 * 1024 * 1024)
          throw new Error("Choose a photograph smaller than 8 MB.");
        const response = await fetch("/api/assets", {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: file,
        });
        const a = await response.json();
        if (!response.ok) throw new ApiError(a, response.status);
        setAssets((items) => [...items, a]);
        const photo: Photo = {
          assetId: a.id,
          x: 0.5,
          y: 0.5,
          zoom: 1,
          rotation: 0,
          filter: "original",
        };
        const current = latest.current,
          photos = [...current.memory!.photos];
        if (replace && photos[selected]) photos[selected] = photo;
        else photos.push(photo);
        const next = {
          ...current,
          memory: { ...current.memory!, photos, qualityAcknowledged: false },
        };
        latest.current = next;
        change(next);
        setSelected(replace ? selected : photos.length - 1);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending(false);
      setReplace(false);
      setAdding(false);
    }
  }
  function photoEdit(values: Partial<Photo>) {
    update({
      photos: m.photos.map((p, i) =>
        i === selected ? { ...p, ...values } : p,
      ),
      qualityAcknowledged: false,
    });
  }
  async function search() {
    setError("");
    pending(true);
    try {
      setResults(await api("places/search", { query }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending(false);
    }
  }
  async function makeMap(location = point) {
    if (!location) return;
    setError("");
    pending(true);
    try {
      const asset = await api("places/map", {
        latitude: location.latitude,
        longitude: location.longitude,
        style,
        zoom,
      });
      setAssets((items) => [...items, asset]);
      update({
        map: { assetId: asset.id, ...asset.selection },
        qualityAcknowledged: false,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending(false);
    }
  }
  const active = m.photos[selected];
  const warnings = memoryPictures(design).flatMap((pic) => {
    const a = assets.find((a) => a.id === pic.assetId);
    if (!a) return [];
    const crop = cropGeometry(
      a.width,
      a.height,
      pic.width / pic.height,
      pic.photo,
    );
    const dpi = Math.floor(
      Math.min(
        crop.width / (pic.width / 25.4),
        crop.height / (pic.height / 25.4),
      ),
    );
    return dpi < 300 ? [{ id: pic.assetId, dpi }] : [];
  });
  return (
    <div className="memory-controls">
      <fieldset className="memory-source-choices">
        <legend>Start with your memory</legend>
        <div className="memory-source-grid" aria-label="Memory source">
          {(
            [
              ["photo", "Favorite photo", "Add your photograph", "frame"],
              [
                "place",
                "Special place",
                "Find a meaningful location",
                "search",
              ],
              ["words", "In your words", "Tell your story", "edit"],
            ] as const
          ).map(([mode, label, hint, icon]) => (
            <button
              type="button"
              key={mode}
              className={m.mode === mode ? "selected" : ""}
              aria-label={label}
              aria-pressed={m.mode === mode}
              disabled={busy}
              onClick={() => update(selectMemoryMode(m, mode))}
            >
              <Icon name={icon} size={20} />
              <strong>{label}</strong>
              <span>{hint}</span>
              <Icon name={m.mode === mode ? "check" : "arrow"} size={15} />
            </button>
          ))}
        </div>
      </fieldset>
      <label className="field">
        Choose your kind of memory
        <select
          value={design.template}
          disabled={busy}
          onChange={(e) => {
            const template = e.target.value as (typeof memoryTemplates)[number],
              previous =
                memoryProfiles[
                  design.template as (typeof memoryTemplates)[number]
                ],
              next = defaultMemory(template);
            change({
              ...design,
              template,
              title:
                design.title === previous?.title
                  ? memoryProfiles[template].title
                  : design.title,
              memory: {
                ...m,
                layout: next.layout,
                background: next.background,
                mode:
                  template === "words"
                    ? "words"
                    : template === "place"
                      ? "place"
                      : m.mode === "words"
                        ? "words"
                        : "photo",
              },
            });
          }}
        >
          {memoryTemplates.map((t) => (
            <option key={t} value={t}>
              {memoryProfiles[t].category}
            </option>
          ))}
        </select>
      </label>
      <p className="field-hint">
        Switch designs freely. Your photos and personal details stay with you.
      </p>
      {m.mode === "words" ? (
        <label className="field">
          Describe your memory
          <textarea
            value={m.narrative}
            maxLength={220}
            minLength={8}
            rows={5}
            onChange={(e) => update({ narrative: e.target.value })}
            placeholder="Tell the story of a moment you’ll always remember…"
          />
          <span className="field-hint">
            {m.narrative.length}/220 · No photograph needed.
          </span>
        </label>
      ) : (
        <>
          {m.mode === "place" && (
            <div className="place-controls">
              <label className="field">
                Search your special place
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="City, hometown or a meaningful address"
                  maxLength={120}
                />
              </label>
              <button
                className="button secondary wide"
                disabled={busy || !mapsReady || query.trim().length < 2}
                onClick={search}
              >
                <Icon name="search" size={16} />
                {busy ? "Finding your place…" : "Search places"}
              </button>
              {!mapsReady && (
                <p className="soft-note">
                  Map search is awaiting provider setup and print licensing. You
                  can create a photo or written memory today.
                </p>
              )}
              {results.length > 0 && (
                <div className="place-results">
                  {results.map((r, i) => (
                    <button
                      key={i}
                      className={
                        point?.latitude === r.latitude &&
                        point?.longitude === r.longitude
                          ? "selected"
                          : ""
                      }
                      onClick={() => {
                        setPoint(r);
                        update({ place: r.name.slice(0, 64) });
                      }}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              )}
              <label className="field">
                Map style
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value as typeof style)}
                >
                  <option value="streets-v4">Classic streets</option>
                  <option value="basic-v2">Quiet minimal</option>
                  <option value="dataviz-light">Light architectural</option>
                  <option value="dataviz-dark">Midnight</option>
                </select>
              </label>
              <label className="field">
                Neighborhood detail
                <input
                  type="range"
                  min={8}
                  max={16}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                />
              </label>
              <button
                className="button secondary wide"
                disabled={busy || !mapsReady || !point}
                onClick={() => makeMap()}
              >
                Use this map in my artwork
              </button>
              <p className="field-hint">
                The preview uses your saved map. Apply again after changing the
                location, style or detail level.
              </p>
              <label className="field">
                Highlight this place
                <select
                  value={m.marker}
                  onChange={(e) =>
                    update({ marker: e.target.value as typeof m.marker })
                  }
                >
                  <option value="heart">Heart</option>
                  <option value="pin">Location pin</option>
                  <option value="none">No marker</option>
                </select>
              </label>
            </div>
          )}
          {m.mode === "photo" && (
            <div key="photo-controls" className="photo-source-controls">
              {(!m.photos.length || replace || adding) && (
                <label
                  className="photo-upload"
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!busy) e.currentTarget.classList.add("drag-active");
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node))
                      e.currentTarget.classList.remove("drag-active");
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("drag-active");
                    void upload(e.dataTransfer.files);
                  }}
                >
                  <Icon name="frame" size={25} />
                  <strong>
                    {busy
                      ? "Keeping your photo safe…"
                      : replace
                        ? "Replace selected photograph"
                        : "Add your favorite photographs"}
                  </strong>
                  <span>
                    Drop photos here or choose files · JPEG or PNG · Up to 8 MB
                    each
                  </span>
                  <input
                    aria-label="Upload photographs"
                    type="file"
                    accept="image/jpeg,image/png"
                    multiple={!replace}
                    disabled={busy}
                    onChange={(e) => {
                      void upload(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
              {(replace || adding) && m.photos.length > 0 && (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => {
                    setReplace(false);
                    setAdding(false);
                  }}
                >
                  Cancel photo change
                </button>
              )}
              {!m.photos.length && (
                <details className="image-inspiration">
                  <summary>Find photo inspiration on Google</summary>
                  <label className="field">
                    What would you like to find?
                    <input
                      value={imageQuery}
                      maxLength={100}
                      onChange={(e) => setImageQuery(e.target.value)}
                      placeholder="e.g. a peaceful mountain landscape"
                    />
                  </label>
                  {imageQuery.trim() && (
                    <a
                      className="text-link"
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`https://www.google.com/search?udm=2&q=${encodeURIComponent(imageQuery.trim())}`}
                    >
                      Search Google Images ↗
                    </a>
                  )}
                  <p className="field-hint">
                    Opens Google in a new tab. Upload a photo you own or have
                    permission to print.
                  </p>
                </details>
              )}
              {m.photos.length > 0 && (
                <>
                  <div className="photo-manager-heading">
                    <div>
                      <strong>Your photographs</strong>
                      <span>{m.photos.length} added · Kept privately</span>
                    </div>
                    <div className="photo-manager-actions">
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => {
                          setAdding(false);
                          setReplace(true);
                        }}
                      >
                        Change photo
                      </button>
                      {m.photos.length < 4 && (
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() => {
                            setReplace(false);
                            setAdding(true);
                          }}
                        >
                          + Add another
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="photo-picker">
                    {m.photos.map((p, i) => (
                      <button
                        key={p.assetId + ":" + i}
                        aria-label={`Edit photograph ${i + 1}`}
                        aria-pressed={i === selected}
                        onClick={() => setSelected(i)}
                        className={i === selected ? "selected" : ""}
                      >
                        <img
                          src={`/api/assets/${p.assetId}/preview`}
                          alt={`Uploaded photograph ${i + 1}`}
                        />
                      </button>
                    ))}
                  </div>
                  {active && (
                    <details className="photo-edit-panel">
                      <summary>
                        <Icon name="edit" size={20} />
                        <span className="editor-disclosure-copy">
                          <strong>Edit your photo</strong>
                          <small>Crop, rotate & filter your photo</small>
                        </span>
                        <Icon
                          name="down"
                          size={18}
                          className="editor-disclosure-chevron"
                        />
                      </summary>
                      <p className="eyebrow">
                        PHOTOGRAPH {selected + 1} · YOUR PERFECT CROP
                      </p>
                      <label className="field">
                        Zoom
                        <input
                          type="range"
                          min={1}
                          max={3}
                          step={0.01}
                          value={active.zoom}
                          onChange={(e) =>
                            photoEdit({ zoom: Number(e.target.value) })
                          }
                        />
                      </label>
                      <label className="field">
                        Move left or right
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={active.x}
                          onChange={(e) =>
                            photoEdit({ x: Number(e.target.value) })
                          }
                        />
                      </label>
                      <label className="field">
                        Move up or down
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={active.y}
                          onChange={(e) =>
                            photoEdit({ y: Number(e.target.value) })
                          }
                        />
                      </label>
                      <div className="photo-edit-actions">
                        <button
                          className="text-button"
                          onClick={() =>
                            photoEdit({
                              rotation: ((active.rotation + 90) %
                                360) as Photo["rotation"],
                            })
                          }
                        >
                          ↻ Rotate photo
                        </button>
                        <button
                          className="text-button"
                          onClick={() => {
                            setAdding(false);
                            setReplace(true);
                          }}
                        >
                          Replace photo
                        </button>
                        <button
                          className="text-button"
                          onClick={() => {
                            update({
                              photos: m.photos.filter((_, i) => i !== selected),
                              qualityAcknowledged: false,
                            });
                            setSelected(0);
                          }}
                        >
                          Remove from design
                        </button>
                      </div>
                      <label className="field">
                        Photo filter
                        <select
                          value={active.filter}
                          onChange={(e) =>
                            photoEdit({
                              filter: e.target.value as Photo["filter"],
                            })
                          }
                        >
                          <option value="original">Original colours</option>
                          <option value="bw">Timeless black & white</option>
                          <option value="warm">Soft warmth</option>
                        </select>
                      </label>
                    </details>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
      <label className="field">
        {design.template === "pet"
          ? "Your pet’s name"
          : design.template === "family"
            ? "Family name"
            : design.template === "birthday"
              ? "Birthday person’s name"
              : "Names"}{" "}
        <span className="optional-label">(optional)</span>
        <input
          value={m.names}
          maxLength={48}
          placeholder={
            design.template === "pet"
              ? "Optional · e.g. Cleo"
              : design.template === "family"
                ? "Optional · e.g. The Khan family"
                : "Optional · e.g. Ayesha & Hamza"
          }
          onChange={(e) => update({ names: e.target.value })}
        />
      </label>
      {m.mode === "photo" && design.template === "birthday" && (
        <label className="field">
          Age you’re celebrating (optional)
          <input
            type="number"
            placeholder="Optional · e.g. 30"
            min={0}
            max={120}
            value={m.age ?? ""}
            onChange={(e) =>
              update({
                age:
                  e.target.value === ""
                    ? undefined
                    : Math.round(
                        Math.min(120, Math.max(0, Number(e.target.value))),
                      ),
              })
            }
          />
        </label>
      )}
      <label className="field">
        {design.template === "travel"
          ? "Destination"
          : "Location or a meaningful place"}{" "}
        <span className="optional-label">(optional)</span>
        <input
          value={m.place}
          maxLength={64}
          placeholder="Optional · e.g. Paris, France"
          onChange={(e) => update({ place: e.target.value })}
        />
      </label>
      <details className="memory-appearance" open>
        <summary>
          <Icon name="frame" size={20} />
          <span className="editor-disclosure-copy">
            <strong>Personalize your design</strong>
            <small>Layout, fonts & colours</small>
          </span>
          <Icon name="down" size={18} className="editor-disclosure-chevron" />
        </summary>
        <div className="memory-design-options">
          <label className="field">
            Artwork layout
            <select
              value={m.layout}
              onChange={(e) =>
                update({
                  layout: e.target.value as typeof m.layout,
                  qualityAcknowledged: false,
                })
              }
            >
              <option value="portrait">Classic portrait</option>
              <option value="gallery">Gallery border</option>
              {m.mode === "photo" && (
                <option value="collage">Photo collage</option>
              )}
              {m.layout === "fullbleed" && (
                <option value="fullbleed" hidden>
                  Previously saved layout
                </option>
              )}
            </select>
          </label>
          {m.mode === "place" && (
            <details className="memory-appearance">
              <summary>Fine-tune the exact location</summary>
              <div className="coordinate-pair">
                <label className="field">
                  Map latitude
                  <input
                    type="number"
                    min={-85}
                    max={85}
                    step="any"
                    value={point?.latitude ?? ""}
                    onChange={(e) =>
                      setPoint((current) => ({
                        latitude: Number(e.target.value),
                        longitude: current?.longitude ?? 0,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  Map longitude
                  <input
                    type="number"
                    min={-180}
                    max={180}
                    step="any"
                    value={point?.longitude ?? ""}
                    onChange={(e) =>
                      setPoint((current) => ({
                        latitude: current?.latitude ?? 0,
                        longitude: Number(e.target.value),
                      }))
                    }
                  />
                </label>
              </div>
              <p className="field-hint">
                North/east are positive; south/west negative. Check your point,
                then apply the map.
              </p>
            </details>
          )}
          <label className="field">
            Typography
            <select
              value={m.font}
              onChange={(e) =>
                update({ font: e.target.value as typeof m.font })
              }
            >
              <option value="classic">Elegant serif</option>
              <option value="modern">Modern sans</option>
              <option value="editorial">Editorial italic</option>
              <option value="bold">Confident bold</option>
              <option value="mono">Typewriter</option>
            </select>
          </label>
        </div>
        <fieldset>
          <legend>Paper &amp; color</legend>
          <p className="field-hint">
            Choose a palette or fine-tune the same paper color below.
          </p>
          <div className="memory-palette">
            {(
              [
                "ivory",
                "rose",
                "sage",
                "midnight",
                "sand",
                "sky",
                "lavender",
                "charcoal",
              ] as const
            ).map((bg) => (
              <button
                key={bg}
                className={
                  !m.backgroundColor && m.background === bg ? "selected" : ""
                }
                aria-pressed={!m.backgroundColor && m.background === bg}
                onClick={() =>
                  update({ background: bg, backgroundColor: undefined })
                }
              >
                <span className={bg} />
                {bg[0].toUpperCase() + bg.slice(1)}
              </button>
            ))}
          </div>
          <div className="art-color-controls">
            <label className="field">
              Custom paper color
              <input
                type="color"
                value={
                  m.backgroundColor ||
                  {
                    ivory: "#faf6ed",
                    rose: "#f4e7e2",
                    sage: "#e8eee5",
                    midnight: "#243648",
                    sand: "#eadbc4",
                    sky: "#e3edf2",
                    lavender: "#eae4f1",
                    charcoal: "#30332f",
                  }[m.background]
                }
                onChange={(e) => update({ backgroundColor: e.target.value })}
                onInput={(e) =>
                  update({ backgroundColor: e.currentTarget.value })
                }
              />
            </label>
            <label className="field">
              Text color
              <input
                type="color"
                value={
                  m.textColor ||
                  (["midnight", "charcoal"].includes(m.background)
                    ? "#faf6ed"
                    : "#353932")
                }
                onChange={(e) => update({ textColor: e.target.value })}
                onInput={(e) => update({ textColor: e.currentTarget.value })}
              />
            </label>
          </div>
        </fieldset>
        {m.mode === "photo" &&
          m.layout === "portrait" &&
          !["family", "pet"].includes(design.template) && (
            <label className="field">
              Photo area · {Math.round((m.photoHeight ?? 0.57) * 100)}%
              <input
                type="range"
                min={0.4}
                max={0.65}
                step={0.01}
                value={m.photoHeight ?? 0.57}
                onChange={(e) =>
                  update({
                    photoHeight: Number(e.target.value),
                    qualityAcknowledged: false,
                  })
                }
              />
            </label>
          )}
        {m.layout === "fullbleed" && m.mode === "photo" ? (
          <p className="soft-note">
            Your first photo fills the artwork. Wording stays saved for when you
            switch back. Drag the photo in the preview to position it, or use
            the crop sliders.
          </p>
        ) : (
          <>
            <label className="field">
              Headline size · {Math.round((m.titleScale ?? 1) * 100)}%
              <input
                type="range"
                min={0.75}
                max={2.4}
                step={0.05}
                value={m.titleScale ?? 1}
                onChange={(e) => update({ titleScale: Number(e.target.value) })}
              />
            </label>
            <label className="field">
              Supporting text size · {Math.round((m.textScale ?? 1) * 100)}%
              <input
                type="range"
                min={0.75}
                max={1.8}
                step={0.05}
                value={m.textScale ?? 1}
                onChange={(e) => update({ textScale: Number(e.target.value) })}
              />
            </label>
            <label className="field">
              Text spacing · {Math.round((m.textSpacing ?? 1) * 100)}%
              <input
                type="range"
                min={0.5}
                max={1.2}
                step={0.05}
                value={m.textSpacing ?? 1}
                onChange={(e) =>
                  update({
                    textSpacing: Number(e.target.value),
                    textPositions: undefined,
                  })
                }
              />
              <span className="field-hint">
                Bring the wording closer together, or drag each text block up
                and down in your preview.
              </span>
            </label>
            <button
              type="button"
              className="text-button"
              onClick={() =>
                update({ textSpacing: 1, textPositions: undefined })
              }
            >
              Reset text positions & spacing
            </button>
            <details className="text-position-controls">
              <summary>Fine-tune individual text positions</summary>
              {memoryLayout(design)
                .lines.filter((line) => line.editKey && line.text.trim())
                .map((line) => (
                  <label className="field" key={line.editKey}>
                    {
                      {
                        title: "Headline",
                        names: "Names",
                        message: "Message",
                        place: "Location",
                        date: "Date",
                      }[line.editKey!]
                    }{" "}
                    vertical position
                    <input
                      type="range"
                      min={8}
                      max={94}
                      step={0.5}
                      value={(line.y / memoryLayout(design).h) * 100}
                      onChange={(e) =>
                        update({
                          textPositions: {
                            ...m.textPositions,
                            [line.editKey!]: Number(e.target.value) / 100,
                          },
                        })
                      }
                    />
                  </label>
                ))}
            </details>
          </>
        )}
        <button
          className="text-button"
          onClick={() =>
            update({
              textColor: undefined,
              backgroundColor: undefined,
              titleScale: 1,
              textScale: 1,
              textSpacing: 1,
              textPositions: undefined,
              font: "classic",
            })
          }
        >
          Reset typography & colors
        </button>
      </details>
      {warnings.length > 0 && (
        <div className="image-quality-note">
          <strong>Let’s make sure your print looks its best.</strong>
          <p>
            Selected crops: {warnings.map((w) => w.dpi + " DPI").join(", ")}.
            Our target is 300 DPI. Below 100 DPI cannot be ordered. Try a
            smaller print or zoom out.
          </p>
          <PrintQualityExplainer />
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={m.qualityAcknowledged}
              onChange={(e) =>
                update({ qualityAcknowledged: e.target.checked })
              }
            />
            <span>I understand the image-quality limitation of this crop.</span>
          </label>
        </div>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
