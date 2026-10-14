"use client";
import { useEffect, useState, useRef } from "react";
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
  onPhotoPosition,
}: {
  design: Design;
  endpoint?: string;
  onPhotoPosition?: (index: number, position: { x: number; y: number }) => void;
}) {
  const [position, setPosition] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);
  const drag = useRef<{
    index: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
    travelX: number;
    travelY: number;
  } | null>(null);
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
      <div
        className={`memory-photo-layer ${onPhotoPosition ? "editable-photo-layer" : ""}`}
        aria-hidden={onPhotoPosition ? undefined : true}
      >
        {pics.map((pic, i) => {
          const a = assets[pic.assetId];
          if (!a) return null;
          const crop = cropGeometry(
            a.width,
            a.height,
            pic.width / pic.height,
            position?.index === i
              ? { ...pic.photo, x: position.x, y: position.y }
              : pic.photo,
          );
          return (
            <div
              key={pic.assetId + ":" + i}
              className="memory-photo-window"
              tabIndex={
                onPhotoPosition && pic.assetId !== design.memory?.map?.assetId
                  ? 0
                  : undefined
              }
              role={onPhotoPosition ? "group" : undefined}
              aria-label={
                onPhotoPosition
                  ? `Position photograph ${i + 1}. Drag to move or use arrow keys.`
                  : undefined
              }
              onPointerDown={(e) => {
                if (
                  !onPhotoPosition ||
                  pic.assetId === design.memory?.map?.assetId ||
                  (e.pointerType === "mouse" && e.button !== 0)
                )
                  return;
                const rect = e.currentTarget.getBoundingClientRect();
                drag.current = {
                  index: i,
                  startX: e.clientX,
                  startY: e.clientY,
                  x: pic.photo.x,
                  y: pic.photo.y,
                  travelX: rect.width * (crop.sourceWidth / crop.width - 1),
                  travelY: rect.height * (crop.sourceHeight / crop.height - 1),
                };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                const p = drag.current;
                if (!p || p.index !== i) return;
                setPosition({
                  index: i,
                  x:
                    p.travelX > 0
                      ? Math.max(
                          0,
                          Math.min(1, p.x - (e.clientX - p.startX) / p.travelX),
                        )
                      : p.x,
                  y:
                    p.travelY > 0
                      ? Math.max(
                          0,
                          Math.min(1, p.y - (e.clientY - p.startY) / p.travelY),
                        )
                      : p.y,
                });
              }}
              onPointerUp={(e) => {
                if (!drag.current) return;
                if (position && onPhotoPosition)
                  onPhotoPosition(
                    design.memory!.photos.findIndex(
                      (p) => p.assetId === pic.assetId,
                    ),
                    { x: position.x, y: position.y },
                  );
                drag.current = null;
                setPosition(null);
                e.currentTarget.releasePointerCapture(e.pointerId);
              }}
              onPointerCancel={() => {
                drag.current = null;
                setPosition(null);
              }}
              onKeyDown={(e) => {
                if (
                  !onPhotoPosition ||
                  !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                    e.key,
                  ) ||
                  pic.assetId === design.memory?.map?.assetId
                )
                  return;
                e.preventDefault();
                onPhotoPosition(
                  design.memory!.photos.findIndex(
                    (p) => p.assetId === pic.assetId,
                  ),
                  {
                    x: Math.max(
                      0,
                      Math.min(
                        1,
                        pic.photo.x +
                          (e.key === "ArrowLeft"
                            ? -0.05
                            : e.key === "ArrowRight"
                              ? 0.05
                              : 0),
                      ),
                    ),
                    y: Math.max(
                      0,
                      Math.min(
                        1,
                        pic.photo.y +
                          (e.key === "ArrowUp"
                            ? -0.05
                            : e.key === "ArrowDown"
                              ? 0.05
                              : 0),
                      ),
                    ),
                  },
                );
              }}
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
