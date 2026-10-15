"use client";
import { useRef } from "react";
import type { Design } from "../../../packages/domain/src/index";
import { memoryLayout } from "../../../packages/rendering/src/memory-layout";

export type TextKey = "title" | "names" | "message" | "place" | "date";
export function MemoryText({
  design,
  onPreview,
  onCommit,
}: {
  design: Design;
  onPreview: (key: TextKey, y: number | null) => void;
  onCommit: (key: TextKey, y: number) => void;
}) {
  const drag = useRef<{
    key: TextKey;
    pointer: number;
    start: number;
    y: number;
    next: number;
    height: number;
  } | null>(null);
  const layout = memoryLayout(design);
  const minimum = layout.pictures?.length
    ? Math.max(...layout.pictures.map((p) => (p.y + p.height) / layout.h)) +
      0.025
    : 0.08;
  const bounded = (y: number) => Math.max(minimum, Math.min(0.94, y));
  return (
    <div className="memory-text-layer" aria-label="Position your text">
      {layout.lines
        .filter((line) => line.editKey && line.text.trim())
        .map((line) => {
          const key = line.editKey!;
          return (
            <button
              type="button"
              key={key}
              className="memory-text-handle"
              aria-label={`Move ${key} text. Drag up or down, or use arrow keys.`}
              title={`Drag ${key} up or down · Arrow keys for precise movement`}
              style={{
                top: `${((line.y - line.size) / layout.h) * 100}%`,
                height: `${Math.max(((line.size * 1.6) / layout.h) * 100, 4)}%`,
              }}
              onPointerDown={(e) => {
                if (e.pointerType === "mouse" && e.button !== 0) return;
                const height =
                  e.currentTarget.parentElement!.getBoundingClientRect().height;
                drag.current = {
                  key,
                  pointer: e.pointerId,
                  start: e.clientY,
                  y: line.y / layout.h,
                  next: line.y / layout.h,
                  height,
                };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                const current = drag.current;
                if (!current || current.key !== key) return;
                current.next = bounded(
                  current.y + (e.clientY - current.start) / current.height,
                );
                onPreview(key, current.next);
              }}
              onPointerUp={(e) => {
                const current = drag.current;
                if (!current || current.key !== key) return;
                onCommit(key, current.next);
                onPreview(key, null);
                drag.current = null;
                e.currentTarget.releasePointerCapture(e.pointerId);
              }}
              onPointerCancel={() => {
                drag.current = null;
                onPreview(key, null);
              }}
              onKeyDown={(e) => {
                if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
                e.preventDefault();
                onCommit(
                  key,
                  bounded(
                    line.y / layout.h +
                      (e.key === "ArrowUp" ? -1 : 1) *
                        (e.shiftKey ? 0.02 : 0.005),
                  ),
                );
              }}
            >
              <span className="text-drag-label">Move {key}</span>
            </button>
          );
        })}
    </div>
  );
}
