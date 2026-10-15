"use client";
import { useEffect, useState } from "react";
import { Design } from "../../../packages/domain/src/index";
import { cropGeometry } from "../../../packages/domain/src/memory";
import { memoryPictures } from "../../../packages/rendering/src/memory-layout";
import { api } from "../lib/client";
import { PrintQualityExplainer } from "./print-quality-explainer";
export function PhotoQualityReview({
  design,
  change,
}: {
  design: Design;
  change: (d: Design) => void;
}) {
  const [assets, setAssets] = useState<any[]>([]),
    ids = memoryPictures(design)
      .map((p) => p.assetId)
      .join(",");
  useEffect(() => {
    let alive = true;
    Promise.all(
      ids
        .split(",")
        .filter(Boolean)
        .map((id) => api("assets/" + id).catch(() => undefined)),
    ).then((rows) => {
      if (alive) setAssets(rows.filter(Boolean));
    });
    return () => {
      alive = false;
    };
  }, [ids]);
  const warnings = memoryPictures(design).flatMap((p) => {
    const a = assets.find((a) => a.id === p.assetId);
    if (!a) return [];
    const crop = cropGeometry(a.width, a.height, p.width / p.height, p.photo);
    const dpi = Math.floor(
      Math.min(crop.width / (p.width / 25.4), crop.height / (p.height / 25.4)),
    );
    return dpi < 300 ? [dpi] : [];
  });
  if (!warnings.length) return null;
  return (
    <div className="image-quality-note">
      <strong>Photo quality · {Math.min(...warnings)} DPI</strong>
      <p>
        {warnings.some((dpi) => dpi < 100)
          ? "Too low to print. Choose a smaller size or zoom out."
          : "300 DPI recommended · 100 DPI minimum."}
      </p>
      <PrintQualityExplainer />
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={design.memory!.qualityAcknowledged}
          onChange={(e) =>
            change({
              ...design,
              memory: {
                ...design.memory!,
                qualityAcknowledged: e.target.checked,
              },
            })
          }
        />
        <span>I accept the reduced sharpness.</span>
      </label>
    </div>
  );
}
