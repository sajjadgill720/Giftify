"use client";
import { useEffect, useRef, useState } from "react";
import { Design } from "../../../packages/domain/src/index";
import {
  memoryTemplates,
  memoryProfiles,
  defaultMemory,
  cropGeometry,
  Photo,
} from "../../../packages/domain/src/memory";
import { memoryPictures } from "../../../packages/rendering/src/memory-layout";
import { api, ApiError } from "../lib/client";
import { Icon } from "./icons";
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
    [query, setQuery] = useState(""),
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
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    pending(true);
    try {
      const available = replace ? 1 : 4 - latest.current.memory!.photos.length;
      if (files.length > available)
        throw new Error(
          "You can keep up to four photographs in a design. Remove one first, or replace the selected photo.",
        );
      for (const file of Array.from(files).slice(0, available)) {
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
      <label className="field">
        Choose your kind of memory
        <select
          value={design.template}
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
      <div className="memory-mode-tabs" aria-label="Memory source">
        {(
          [
            ["photo", "Favorite photo"],
            ["place", "Special place"],
            ["words", "In your words"],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            className={m.mode === mode ? "selected" : ""}
            aria-pressed={m.mode === mode}
            onClick={() => update({ mode })}
          >
            {label}
          </button>
        ))}
      </div>
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
          <label className="photo-upload">
            <Icon name="frame" size={25} />
            <strong>
              {busy
                ? "Keeping your photo safe…"
                : replace
                  ? "Replace selected photograph"
                  : m.mode === "place"
                    ? "Add a photograph to your map"
                    : "Add your favorite photographs"}
            </strong>
            <span>JPEG or PNG · Up to 8 MB each · Private to you</span>
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
          {m.photos.length > 0 && (
            <>
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
                  <summary>Crop, rotate & filter your photo</summary>
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
                      onChange={(e) => photoEdit({ x: Number(e.target.value) })}
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
                      onChange={(e) => photoEdit({ y: Number(e.target.value) })}
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
                      onClick={() => setReplace(true)}
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
                        photoEdit({ filter: e.target.value as Photo["filter"] })
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
        </>
      )}
      <label className="field">
        {design.template === "pet"
          ? "Your pet’s name"
          : design.template === "family"
            ? "Family name"
            : design.template === "birthday"
              ? "Birthday person’s name"
              : "Names"}
        <input
          value={m.names}
          maxLength={48}
          placeholder={
            design.template === "pet" ? "e.g. Milo" : "e.g. Ayesha & Hamza"
          }
          onChange={(e) => update({ names: e.target.value })}
        />
      </label>
      {design.template === "birthday" && (
        <label className="field">
          Age you’re celebrating
          <input
            type="number"
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
          : "Location or a meaningful place"}
        <input
          value={m.place}
          maxLength={64}
          placeholder="e.g. Paris, France"
          onChange={(e) => update({ place: e.target.value })}
        />
      </label>
      <details className="memory-appearance">
        <summary>Layout, fonts & colours</summary>
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
              <option value="collage">Photo collage</option>
            </select>
          </label>
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
            </select>
          </label>
        </div>
        <fieldset>
          <legend>Background palette</legend>
          <div className="memory-palette">
            {(["ivory", "rose", "sage", "midnight"] as const).map((bg) => (
              <button
                key={bg}
                className={m.background === bg ? "selected" : ""}
                aria-pressed={m.background === bg}
                onClick={() => update({ background: bg })}
              >
                <span className={bg} />
                {bg[0].toUpperCase() + bg.slice(1)}
              </button>
            ))}
          </div>
        </fieldset>
      </details>
      {warnings.length > 0 && (
        <div className="image-quality-note">
          <strong>Let’s make sure your print looks its best.</strong>
          <p>
            Selected crops: {warnings.map((w) => w.dpi + " DPI").join(", ")}.
            Our target is 300 DPI. Below 100 DPI cannot be ordered. Try a
            smaller print or zoom out.
          </p>
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
