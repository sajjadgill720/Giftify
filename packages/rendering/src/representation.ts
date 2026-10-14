import { Design, dimensions } from "../../domain/src/index";
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
export function layout(d: Design) {
  const [w, h] = dimensions[d.size];
  const colors = {
    chapter: "#234e45",
    laurel: "#586345",
    horizon: "#405873",
    arch: "#865346",
    orbit: "#51476a",
    bloom: "#915569",
  };
  return {
    w,
    h,
    color: colors[d.template],
    lines: [
      { text: d.title, y: h * 0.46, size: 8 },
      { text: d.subtitle, y: h * 0.56, size: 4.5 },
      { text: d.date, y: h * 0.67, size: 4 },
    ],
  };
}
export function svg(d: Design) {
  const l = layout(d);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${l.w}mm" height="${l.h}mm" viewBox="0 0 ${l.w} ${l.h}"><rect width="100%" height="100%" fill="#faf6ed"/><rect x="12" y="12" width="${l.w - 24}" height="${l.h - 24}" fill="none" stroke="${l.color}" stroke-width=".5"/><circle cx="${l.w / 2}" cy="${l.h * 0.28}" r="15" fill="none" stroke="${l.color}"/><path d="M ${l.w / 2 - 8} ${l.h * 0.28} l 8 -8 l 8 8 l -8 8 Z" fill="${l.color}"/>${l.lines.map((t) => `<text x="${l.w / 2}" y="${t.y}" text-anchor="middle" direction="auto" font-family="Helvetica,Arial,sans-serif" font-size="${t.size}" fill="${l.color}">${escape(t.text)}</text>`).join("")}</svg>`;
}
