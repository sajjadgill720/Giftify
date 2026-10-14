import { Design, dimensions } from "../../domain/src/index";
import { formatCoordinate } from "../../domain/src/coordinates";
import { memoryLayout, memoryMarker } from "./memory-layout";
import type { Photo } from "../../domain/src/memory";
export type Shape =
  | { path: string; fill?: string; stroke?: string; width?: number }
  | {
      circle: [number, number, number];
      fill?: string;
      stroke?: string;
      width?: number;
    };
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export type Picture = {
  assetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  circle?: boolean;
  photo: Photo;
};
export type ArtworkLayout = {
  w: number;
  h: number;
  color: string;
  background: string;
  border: boolean;
  shapes: Shape[];
  lines: { text: string; y: number; size: number; font: string }[];
  pictures?: Picture[];
};
export function layout(d: Design): ArtworkLayout {
  if (d.memory) return memoryLayout(d);
  if (d.template === "coordinates") {
    const [w, h] = dimensions[d.size];
    const background = {
      ivory: "#faf6ed",
      midnight: "#202e3d",
      rose: "#f1e1dd",
    }[d.theme || "ivory"];
    const color = d.theme === "midnight" ? "#faf6ed" : "#39352f";
    return {
      w,
      h,
      background,
      color,
      border: false,
      shapes: [] as Shape[],
      lines: [
        { text: d.title, y: h * 0.21, size: w * 0.022, font: "sans" },
        {
          text: formatCoordinate(
            d.location!.latitude,
            "latitude",
            d.coordinateFormat,
          ),
          y: h * 0.43,
          size: w * 0.095,
          font: d.typography === "modern" ? "sans" : "serif",
        },
        {
          text: formatCoordinate(
            d.location!.longitude,
            "longitude",
            d.coordinateFormat,
          ),
          y: h * 0.52,
          size: w * 0.095,
          font: d.typography === "modern" ? "sans" : "serif",
        },
        { text: d.subtitle, y: h * 0.69, size: w * 0.032, font: "serif" },
        { text: d.date, y: h * 0.77, size: w * 0.017, font: "sans" },
      ],
    };
  }
  const [w, h] = dimensions[d.size],
    colors =
      (d.version || 1) === 1
        ? {
            chapter: "#234e45",
            laurel: "#586345",
            horizon: "#405873",
            arch: "#865346",
            orbit: "#51476a",
            bloom: "#915569",
          }
        : {
            chapter: "#53644d",
            laurel: "#6b6d46",
            horizon: "#697c8b",
            arch: "#ac785f",
            orbit: "#757286",
            bloom: "#927b74",
          },
    color = colors[d.template as keyof typeof colors] || "#53644d",
    x = w / 2,
    y = h * 0.3,
    s = w / 210;
  let shapes: Shape[] = [];
  if ((d.version || 1) === 1) {
    shapes = [
      { circle: [x, h * 0.28, 15], stroke: color, width: 0.35 },
      { path: `M ${x - 8} ${h * 0.28} l 8 -8 l 8 8 l -8 8 Z`, fill: color },
    ];
  } else {
    const p = (v: string, fill?: string, stroke?: string, width = 0.45) =>
      shapes.push({ path: v, fill, stroke, width });
    const c = (
      cx: number,
      cy: number,
      r: number,
      fill?: string,
      stroke?: string,
    ) => shapes.push({ circle: [cx, cy, r], fill, stroke, width: 0.45 });
    if (d.template === "chapter") {
      p(
        `M ${x - 36 * s} ${y + 31 * s} v ${-44 * s} a ${36 * s} ${36 * s} 0 0 1 ${72 * s} 0 v ${44 * s} Z`,
        "#e7dccc",
      );
      c(x, y - 21 * s, 18 * s, "#c29d73");
      p(
        `M ${x - 36 * s} ${y + 12 * s} Q ${x} ${y - 18 * s} ${x + 36 * s} ${y + 12 * s} V ${y + 31 * s} H ${x - 36 * s} Z`,
        color,
      );
      p(
        `M ${x - 30 * s} ${y + 18 * s} Q ${x} ${y - 6 * s} ${x + 30 * s} ${y + 18 * s}`,
        undefined,
        "#faf6ed",
      );
    }
    if (d.template === "horizon") {
      c(x + 18 * s, y - 17 * s, 17 * s, "#cfb591");
      p(
        `M ${x - 43 * s} ${y + 5 * s} Q ${x - 18 * s} ${y - 30 * s} ${x + 6 * s} ${y + 2 * s} T ${x + 43 * s} ${y + 5 * s} V ${y + 34 * s} H ${x - 43 * s} Z`,
        "#b2b8aa",
      );
      p(
        `M ${x - 43 * s} ${y + 20 * s} Q ${x - 10 * s} ${y - 12 * s} ${x + 22 * s} ${y + 20 * s} T ${x + 43 * s} ${y + 20 * s} V ${y + 34 * s} H ${x - 43 * s} Z`,
        color,
      );
      p(
        `M ${x - 40 * s} ${y + 26 * s} Q ${x - 4 * s} ${y + 8 * s} ${x + 40 * s} ${y + 26 * s}`,
        undefined,
        "#eee7da",
      );
    }
    if (d.template === "arch") {
      for (const side of [-1, 1]) {
        const cx = x + side * 16 * s;
        p(
          `M ${cx - 24 * s} ${y + 35 * s} V ${y - 10 * s} A ${24 * s} ${24 * s} 0 0 1 ${cx + 24 * s} ${y - 10 * s} V ${y + 35 * s}`,
          undefined,
          side === 1 ? color : "#d9bca8",
          2 * s,
        );
      }
      c(x, y - 22 * s, 4 * s, color);
    }
    if (d.template === "orbit") {
      for (const r of [18, 30, 42]) c(x, y, r * s, undefined, color);
      c(x, y, 7 * s, color);
      c(x + 30 * s, y, 5 * s, "#c5ab8b");
      c(x - 30 * s, y - 29.4 * s, 5 * s, "#b7bec2");
      p(`M ${x - 48 * s} ${y} H ${x + 48 * s}`, undefined, "#d9d4c9", 0.3);
    }
    if (d.template === "bloom" || d.template === "laurel") {
      p(
        `M ${x} ${y + 38 * s} Q ${x - 32 * s} ${y + 9 * s} ${x - 13 * s} ${y - 36 * s}`,
        undefined,
        color,
        0.8 * s,
      );
      p(
        `M ${x} ${y + 38 * s} Q ${x + 32 * s} ${y + 9 * s} ${x + 13 * s} ${y - 36 * s}`,
        undefined,
        color,
        0.8 * s,
      );
      for (const side of [-1, 1])
        for (let i = 0; i < 5; i++) {
          const lx = x + side * (14 + Math.sin(i) * 5) * s,
            ly = y + (22 - i * 11) * s;
          p(
            `M ${lx} ${ly} Q ${lx + side * 22 * s} ${ly - 12 * s} ${lx + side * 12 * s} ${ly - 23 * s} Q ${lx - side * 5 * s} ${ly - 12 * s} ${lx} ${ly} Z`,
            i % 2 ? color : "#bdc0a4",
          );
        }
      if (d.template === "bloom") {
        c(x, y - 24 * s, 6 * s, "#c5a28a");
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          c(
            x + Math.cos(a) * 11 * s,
            y - 24 * s + Math.sin(a) * 11 * s,
            6 * s,
            "#dcc4ae",
          );
        }
      } else {
        p(
          `M ${x} ${y - 15 * s} l ${4 * s} ${8 * s} l ${9 * s} ${1 * s} l ${-6 * s} ${6 * s} l ${1 * s} ${9 * s} l ${-8 * s} ${-4 * s} l ${-8 * s} ${4 * s} l ${1 * s} ${-9 * s} l ${-6 * s} ${-6 * s} l ${9 * s} ${-1 * s} Z`,
          color,
        );
      }
    }
  }
  return {
    w,
    h,
    color,
    background: "#faf6ed",
    shapes,
    border: (d.version || 1) === 1,
    lines: [
      {
        text: d.title,
        y: h * ((d.version || 1) === 1 ? 0.46 : 0.61),
        size: (d.version || 1) === 1 ? 8 : w * 0.035,
        font: "serif",
      },
      {
        text: d.subtitle,
        y: h * ((d.version || 1) === 1 ? 0.56 : 0.68),
        size: (d.version || 1) === 1 ? 4.5 : w * 0.017,
        font: "sans",
      },
      {
        text: d.date,
        y: h * ((d.version || 1) === 1 ? 0.67 : 0.83),
        size: (d.version || 1) === 1 ? 4 : w * 0.012,
        font: "sans",
      },
    ],
  };
}
export function svg(d: Design, images: (string | undefined)[] = []) {
  const l = layout(d);
  const pictures = (l.pictures || [])
    .map((pic, i) =>
      images[i]
        ? `<defs><clipPath id="photo-${i}">${pic.circle ? `<circle cx="${pic.x + pic.width / 2}" cy="${pic.y + pic.height / 2}" r="${pic.width / 2}"/>` : `<rect x="${pic.x}" y="${pic.y}" width="${pic.width}" height="${pic.height}"/>`}</clipPath></defs><image href="${escape(images[i]!)}" x="${pic.x}" y="${pic.y}" width="${pic.width}" height="${pic.height}" clip-path="url(#photo-${i})" preserveAspectRatio="none"/>`
        : "",
    )
    .join("");
  const marker = memoryMarker(d)
    .map(
      (s) =>
        `${"path" in s ? `<path d="${s.path}"` : `<circle cx="${s.circle[0]}" cy="${s.circle[1]}" r="${s.circle[2]}"`} fill="${s.fill}" stroke="${s.stroke || "none"}" stroke-width="${s.width || 0.5}"/>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${l.w}mm" height="${l.h}mm" viewBox="0 0 ${l.w} ${l.h}" role="img" aria-label="Personalized artwork"><rect width="100%" height="100%" fill="${l.background}"/>${l.border ? `<rect x="12" y="12" width="${l.w - 24}" height="${l.h - 24}" fill="none" stroke="${l.color}" stroke-width=".5"/>` : ""}${l.shapes.map((s) => `${"path" in s ? `<path d="${s.path}"` : `<circle cx="${s.circle[0]}" cy="${s.circle[1]}" r="${s.circle[2]}"`} fill="${s.fill || "none"}" stroke="${s.stroke || "none"}" stroke-width="${s.width || 0.45}"/>`).join("")}${pictures}${marker}${l.lines.map((t) => `<text x="${l.w / 2}" y="${t.y}" text-anchor="middle" direction="auto" font-family="${t.font === "serif" && !l.border ? "Times New Roman,serif" : "Helvetica,Arial,sans-serif"}" font-size="${t.size}" fill="${l.color}">${escape(t.text)}</text>`).join("")}</svg>`;
}
