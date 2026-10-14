"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Design, sampleDesign } from "../../../packages/domain/src/index";
import { Artwork } from "./artwork";
import { Icon } from "./icons";
import { api, ApiError } from "../lib/client";
export function MemoryDemo() {
  const router = useRouter(),
    [d, setD] = useState<Design>(() => ({
      ...sampleDesign("words"),
      memory: {
        ...sampleDesign("words").memory!,
        narrative:
          "The little moments. The long walks. The places that felt like home because we were there together.",
      },
    })),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function start() {
    setBusy(true);
    setError("");
    try {
      await api("session", {});
      const draft = await api("drafts", { design: d });
      router.push(`/design/${d.template}?draft=${draft.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      await api("session", {});
      const r = await fetch("/api/assets", {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: file,
        }),
        asset = await r.json();
      if (!r.ok) throw new ApiError(asset, r.status);
      setD((current) => ({
        ...current,
        memory: {
          ...current.memory!,
          photos: [
            {
              assetId: asset.id,
              x: 0.5,
              y: 0.5,
              zoom: 1,
              rotation: 0,
              filter: "original",
            },
          ],
          mode: "photo",
        },
        template: "photo",
      }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="section memory-demo" id="create-memory">
      <div className="center-heading">
        <p className="eyebrow">ORDINARY MOMENTS. EXTRAORDINARY MEANING.</p>
        <h2>
          It starts with <em>your memory.</em>
        </h2>
        <p>A photograph, a place, or a story only you can tell.</p>
      </div>
      <div className="memory-demo-layout">
        <div className="memory-demo-preview">
          <Artwork design={d} inspirationWhenEmpty />
          <span className="demo-caption">Your story, beautifully framed</span>
        </div>
        <div className="memory-demo-controls">
          <div className="memory-mode-tabs" aria-label="Try a memory type">
            {(
              [
                ["photo", "Favorite photo"],
                ["place", "Special place"],
                ["words", "In your words"],
              ] as const
            ).map(([mode, label]) => (
              <button
                disabled={busy}
                className={d.memory!.mode === mode ? "selected" : ""}
                aria-pressed={d.memory!.mode === mode}
                key={mode}
                onClick={() =>
                  setD({ ...d, template: mode, memory: { ...d.memory!, mode } })
                }
              >
                {label}
              </button>
            ))}
          </div>
          {d.memory!.mode === "photo" && (
            <label className="photo-upload">
              <Icon name="frame" size={24} />
              <strong>Add a favorite photograph</strong>
              <span>Your original stays private.</span>
              <input
                aria-label="Try uploading a photograph"
                type="file"
                accept="image/jpeg,image/png"
                disabled={busy}
                onChange={(e) => {
                  void upload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          )}
          {d.memory!.mode === "words" && (
            <label className="field">
              Tell your memory
              <textarea
                value={d.memory!.narrative}
                maxLength={220}
                rows={4}
                onChange={(e) =>
                  setD({
                    ...d,
                    memory: { ...d.memory!, narrative: e.target.value },
                  })
                }
              />
            </label>
          )}
          {d.memory!.mode === "place" && (
            <p className="soft-note">
              Choose a meaningful location in the studio. Real map search and
              printing require the configured, licensed map service.
            </p>
          )}
          <label className="field">
            Your headline
            <input
              value={d.title}
              maxLength={32}
              onChange={(e) => setD({ ...d, title: e.target.value })}
            />
          </label>
          <label className="field">
            A personal message
            <input
              value={d.subtitle}
              maxLength={48}
              onChange={(e) => setD({ ...d, subtitle: e.target.value })}
            />
          </label>
          <div className="finish-choices">
            {(["oak", "black"] as const).map((f) => (
              <button
                key={f}
                className={d.finish === f ? "selected" : ""}
                aria-pressed={d.finish === f}
                onClick={() => setD({ ...d, finish: f })}
              >
                <span className={"finish-swatch " + f} />
                {f === "oak" ? "Oak effect" : "Matte black"}
              </button>
            ))}
          </div>
          <button className="button wide" disabled={busy} onClick={start}>
            {busy ? "Keeping your memory safe…" : "Make this memory yours"}
            <Icon name="arrow" />
          </button>
          <p className="fine-print">
            Continue in your private studio. Physical framed prints · Test
            checkout only.
          </p>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
