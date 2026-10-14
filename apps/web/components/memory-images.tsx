"use client";
import { useEffect, useState } from "react";
import { Design } from "../../../packages/domain/src/index";
import { cropGeometry } from "../../../packages/domain/src/memory";
import {
  memoryPictures,
  memoryMarker,
} from "../../../packages/rendering/src/memory-layout";
import { api } from "../lib/client";
export function MemoryImages({
  design,
  endpoint = "assets",
}: {
  design: Design;
  endpoint?: string;
}) {
  const [assets, setAssets] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const pics = memoryPictures(design),
    ids = pics.map((p) => p.assetId).join(",");
  useEffect(() => {
    let alive = true;
    Promise.all(
      ids
        .split(",")
        .filter(Boolean)
        .map(async (id) => {
          try {
            return [id, await api(endpoint + "/" + id)] as const;
          } catch {
            return [id, undefined] as const;
          }
        }),
    ).then((rows) => {
      if (alive)
        setAssets((current) => ({
          ...current,
          ...Object.fromEntries(
            rows.filter((r): r is readonly [string, any] => !!r[1]),
          ),
        }));
    });
    return () => {
      alive = false;
    };
  }, [ids, endpoint]);
  const [w, h] = design.size === "A4" ? [210, 297] : [297, 420];
  return (
    <>
      <div className="memory-photo-layer" aria-hidden="true">
        {pics.map((pic, i) => {
          const a = assets[pic.assetId];
          if (!a) return null;
          const crop = cropGeometry(
            a.width,
            a.height,
            pic.width / pic.height,
            pic.photo,
          );
          return (
            <div
              key={pic.assetId + ":" + i}
              className="memory-photo-window"
              style={{
                left: (pic.x / w) * 100 + "%",
                top: (pic.y / h) * 100 + "%",
                width: (pic.width / w) * 100 + "%",
                height: (pic.height / h) * 100 + "%",
                borderRadius: pic.circle ? "50%" : 0,
              }}
            >
              <img
                src={`/api/${endpoint}/${pic.assetId}/preview?rotation=${pic.photo.rotation}`}
                alt=""
                draggable={false}
                style={{
                  position: "absolute",
                  maxWidth: "none",
                  width: (crop.sourceWidth / crop.width) * 100 + "%",
                  height: (crop.sourceHeight / crop.height) * 100 + "%",
                  left: (-crop.left / crop.width) * 100 + "%",
                  top: (-crop.top / crop.height) * 100 + "%",
                  filter:
                    pic.photo.filter === "bw"
                      ? "grayscale(1)"
                      : pic.photo.filter === "warm"
                        ? "saturate(.8) brightness(1.06)"
                        : "none",
                }}
              />
            </div>
          );
        })}
      </div>
      <svg
        className="memory-marker-layer"
        viewBox={`0 0 ${w} ${h}`}
        aria-hidden="true"
      >
        {memoryMarker(design).map((s, i) =>
          "path" in s ? (
            <path
              key={i}
              d={s.path}
              fill={s.fill}
              stroke={s.stroke}
              strokeWidth={s.width}
            />
          ) : (
            <circle
              key={i}
              cx={s.circle[0]}
              cy={s.circle[1]}
              r={s.circle[2]}
              fill={s.fill}
              stroke={s.stroke}
              strokeWidth={s.width}
            />
          ),
        )}
      </svg>
    </>
  );
}
