"use client";
import { useState, type CSSProperties } from "react";
import { MemoryText, type TextKey } from "./memory-text";
import { Design, sampleDesign } from "../../../packages/domain/src/index";
import { svg } from "../../../packages/rendering/src/representation";
import { MemoryImages } from "./memory-images";
import { ShowcaseFrame, showcaseFor } from "./showcase-frame";
export function Artwork({
  design,
  framed = true,
  className = "",
  scene = false,
  previewUrl,
  assetEndpoint,
  inspirationWhenEmpty = false,
  onPhotoPosition,
  onTextPosition,
}: {
  design?: Design;
  framed?: boolean;
  className?: string;
  scene?: boolean;
  previewUrl?: string;
  assetEndpoint?: string;
  inspirationWhenEmpty?: boolean;
  onPhotoPosition?: (index: number, position: { x: number; y: number }) => void;
  onTextPosition?: (key: TextKey, y: number) => void;
}) {
  const d = design || sampleDesign();
  const [textPreview, setTextPreview] = useState<{
    key: TextKey;
    y: number;
  } | null>(null);
  const preview =
    textPreview && d.memory
      ? {
          ...d,
          memory: {
            ...d.memory,
            textPositions: {
              ...d.memory.textPositions,
              [textPreview.key]: textPreview.y,
            },
          },
        }
      : d;
  const example =
    d.memory?.mode === "place"
      ? "place"
      : d.memory?.mode === "photo" && d.template === "place"
        ? "photo"
        : showcaseFor(d.template);
  const emptyPhoto =
    d.memory &&
    d.memory.mode !== "words" &&
    (d.memory.mode === "place" ? !d.memory.map : !d.memory.photos.length);
  if (
    example &&
    !previewUrl &&
    (!design || (inspirationWhenEmpty && emptyPhoto))
  ) {
    return (
      <div className={`artwork ${className}`}>
        <ShowcaseFrame kind={example} finish={d.finish} />
        {design && (
          <span className="inspiration-note">
            Example design · Add your own memory to begin
          </span>
        )}
      </div>
    );
  }
  return (
    <div className={`artwork ${scene ? "art-scene " : ""}${className}`}>
      <div className={`${framed ? "art-frame " + d.finish : "art-paper"}`}>
        {previewUrl ? (
          <img
            className="proof-image"
            src={previewUrl}
            alt="Watermarked preview of your personalized artwork"
          />
        ) : (
          <div className="art-svg">
            <div dangerouslySetInnerHTML={{ __html: svg(preview) }} />
            {d.memory && (
              <MemoryImages
                design={d}
                endpoint={assetEndpoint}
                onPhotoPosition={onPhotoPosition}
              />
            )}
            {d.memory && onTextPosition && (
              <MemoryText
                design={preview}
                onCommit={onTextPosition}
                onPreview={(key, y) =>
                  setTextPreview(y === null ? null : { key, y })
                }
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
