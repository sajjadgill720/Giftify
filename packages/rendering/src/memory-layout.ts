import type { Design } from "../../domain/src/index";
import { dimensions } from "../../domain/src/index";
import type { ArtworkLayout, Picture, Shape } from "./artwork";
import type { Photo } from "../../domain/src/memory";
export function memoryPictures(d: Design): Picture[] {
  const m = d.memory;
  if (!m || m.mode === "words") return [];
  if (m.mode === "place" && !m.map) return [];
  const [w, h] = dimensions[d.size],
    margin = w * 0.09;
  const top = h * 0.065,
    width = w - margin * 2,
    height = h * 0.57;
  const photos =
    m.layout !== "fullbleed" &&
    (d.template === "family" || m.layout === "collage")
      ? m.photos.slice(0, 4)
      : m.photos.slice(0, 1);
  const result: Picture[] = [];
  if (m.layout === "fullbleed" && m.mode === "photo") {
    return photos[0]
      ? [
          {
            assetId: photos[0].assetId,
            x: 0,
            y: 0,
            width: w,
            height: h,
            photo: photos[0],
          },
        ]
      : [];
  }
  if (m.mode === "place" && m.map) {
    const map = m.map;
    result.push({
      assetId: map.assetId,
      x: margin,
      y: top,
      width,
      height,
      photo: {
        assetId: map.assetId,
        x: 0.5,
        y: 0.5,
        zoom: 1,
        rotation: 0,
        filter: "original",
      },
    });
    if (photos[0])
      result.push({
        assetId: photos[0].assetId,
        x: w * 0.64,
        y: h * 0.45,
        width: w * 0.23,
        height: w * 0.23,
        photo: photos[0],
      });
    return result;
  }
  for (const [i, photo] of photos.entries()) {
    if (photos.length > 1) {
      const gap = w * 0.015,
        columns = 2,
        rows = Math.ceil(photos.length / 2);
      const pw = (width - gap) / columns,
        ph = (height - (rows - 1) * gap) / rows;
      result.push({
        assetId: photo.assetId,
        x: margin + (i % 2) * (pw + gap),
        y: top + Math.floor(i / 2) * (ph + gap),
        width: photos.length === 3 && i === 2 ? width : pw,
        height: ph,
        photo,
      });
    } else if (d.template === "pet")
      result.push({
        assetId: photo.assetId,
        x: margin,
        y: top,
        width,
        height: width,
        circle: true,
        photo,
      });
    else
      result.push({
        assetId: photo.assetId,
        x: margin,
        y: m.layout === "gallery" ? top + h * 0.065 : top,
        width,
        height:
          m.layout === "gallery"
            ? height - h * 0.1
            : h * (m.photoHeight ?? 0.57),
        photo,
      });
  }
  return result;
}
export function memoryMarker(d: Design): Shape[] {
  if (d.memory?.mode !== "place" || !d.memory.map || d.memory.marker === "none")
    return [];
  const [w, h] = dimensions[d.size],
    x = w / 2,
    y = h * 0.35,
    s = w * 0.018;
  if (d.memory.marker === "heart")
    return [
      {
        path: `M ${x} ${y} C ${x - s * 2} ${y - s * 2} ${x - s * 2} ${y + s} ${x} ${y + s * 2} C ${x + s * 2} ${y + s} ${x + s * 2} ${y - s * 2} ${x} ${y} Z`,
        fill: "#ba655a",
        stroke: "#fff",
        width: 0.5,
      },
    ];
  return [
    {
      path: `M ${x} ${y + s * 2} C ${x - s * 3} ${y - s} ${x - s * 2} ${y - s * 3} ${x} ${y - s * 3} C ${x + s * 2} ${y - s * 3} ${x + s * 3} ${y - s} ${x} ${y + s * 2} Z`,
      fill: "#ba655a",
      stroke: "#fff",
      width: 0.5,
    },
    { circle: [x, y - s * 1.2, s * 0.6], fill: "#fff" },
  ];
}
function wrap(text: string, max = 38) {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const parts = word.match(new RegExp(`.{1,${max}}`, "g")) || [];
    for (const part of parts) {
      if (current && current.length + part.length + 1 > max) {
        lines.push(current);
        current = "";
      }
      current += (current ? " " : "") + part;
    }
  }
  if (current) lines.push(current);
  return lines;
}
export function memoryLayout(d: Design): ArtworkLayout {
  const m = d.memory!,
    [w, h] = dimensions[d.size],
    pictures = memoryPictures(d);
  const background = {
    ivory: "#faf6ed",
    rose: "#f4e7e2",
    sage: "#e8eee5",
    midnight: "#243648",
    sand: "#eadbc4",
    sky: "#e3edf2",
    lavender: "#eae4f1",
    charcoal: "#30332f",
  }[m.background];
  const paper = m.backgroundColor || background;
  const color =
    m.textColor ||
    (["midnight", "charcoal"].includes(m.background) ? "#faf6ed" : "#353932");
  const font =
      m.font === "classic" ? "serif" : m.font === "modern" ? "sans" : m.font,
    shapes: Shape[] = [];
  const rect = (
    x: number,
    y: number,
    width: number,
    height: number,
    fill: string,
    stroke?: string,
  ) =>
    shapes.push({
      path: `M ${x} ${y} h ${width} v ${height} h ${-width} Z`,
      fill,
      stroke,
      width: 0.3,
    });
  if (m.layout === "gallery")
    rect(
      w * 0.055,
      h * 0.035,
      w * 0.89,
      h * 0.91,
      paper,
      m.background === "midnight" ? "#8b9caa" : "#ccc2b4",
    );
  if (m.mode !== "words") {
    if (!pictures.length) {
      if (d.template === "pet")
        shapes.push({
          circle: [w / 2, h * 0.065 + w * 0.41, w * 0.41],
          fill: "#d1dccc",
        });
      else if (d.template === "family" || m.layout === "collage") {
        for (let i = 0; i < 4; i++)
          rect(
            w * 0.09 + (i % 2) * w * 0.42,
            h * 0.065 + Math.floor(i / 2) * h * 0.29,
            w * 0.4,
            h * 0.275,
            ["#d9d7c9", "#b6c4b0", "#c4d0ca", "#e3cdb8"][i],
          );
      } else
        rect(
          w * 0.09,
          h * 0.065,
          w * 0.82,
          h * 0.57,
          m.background === "midnight" ? "#3c5060" : "#dfd9ce",
        );
      shapes.push({ circle: [w / 2, h * 0.3, w * 0.04], fill: "#b5ab99" });
    } else
      for (const p of pictures) {
        if (p.circle)
          shapes.push({
            circle: [p.x + p.width / 2, p.y + p.height / 2, p.width / 2],
            fill: "#dfd9ce",
          });
        else rect(p.x, p.y, p.width, p.height, "#dfd9ce");
      }
  }
  const lines: ArtworkLayout["lines"] = [];
  if (m.mode === "photo" && m.layout === "fullbleed")
    return {
      w,
      h,
      color,
      background: paper,
      shapes: [],
      lines: [],
      pictures,
      border: false,
    };
  if (m.mode === "words") {
    lines.push({
      text: d.title,
      y: h * 0.19,
      size: w * 0.04,
      font,
      editKey: "title",
    });
    const story = wrap(
      m.narrative ||
        (d.template === "quran" || d.template === "hadith"
          ? "Your chosen passage belongs here."
          : "Your story belongs here."),
    );
    story.forEach((text, i) =>
      lines.push({ text, y: h * 0.32 + i * h * 0.04, size: w * 0.021, font }),
    );
  } else {
    lines.push({
      text: d.title,
      y: h * 0.715,
      size: w * 0.036,
      font,
      editKey: "title",
    });
    if (!pictures.length)
      lines.push({
        text:
          m.mode === "place"
            ? "Choose your meaningful place"
            : "Your photograph goes here",
        y: h * 0.48,
        size: w * 0.02,
        font: "sans",
      });
  }
  const names =
    m.names ||
    (d.template === "birthday" && m.age !== undefined
      ? `Celebrating ${m.age} beautiful years`
      : "");
  if (names)
    lines.push({
      text: names,
      y: h * 0.78,
      size: w * 0.025,
      font,
      editKey: "names",
    });
  lines.push({
    text: d.subtitle,
    editKey: "message",
    y: h * (names ? 0.83 : 0.795),
    size: w * 0.018,
    font: "sans",
  });
  if (m.place)
    lines.push({
      text: m.place,
      y: h * 0.87,
      size: w * 0.014,
      font: "sans",
      editKey: "place",
    });
  lines.push({
    text: d.date,
    y: h * 0.92,
    size: w * 0.014,
    font: "sans",
    editKey: "date",
  });
  if (d.template === "couple" && m.mode !== "words")
    shapes.push({
      path: `M ${w / 2} ${h * 0.67} c ${-w * 0.035} ${-h * 0.025} ${-w * 0.055} ${h * 0.015} 0 ${h * 0.025} c ${w * 0.055} ${-h * 0.01} ${w * 0.035} ${-h * 0.05} 0 ${-h * 0.025} Z`,
      fill: "#b77e77",
    });
  if (d.template === "birthday" && m.age !== undefined)
    lines.push({ text: String(m.age), y: h * 0.685, size: w * 0.04, font });
  const attribution =
    m.map && m.mode === "place"
      ? "© MapTiler © OpenStreetMap contributors"
      : "";
  if (attribution)
    lines.push({
      text: attribution,
      y: h * 0.96,
      size: w * 0.009,
      font: "sans",
    });
  for (const line of lines) {
    if (line.text === attribution && attribution) continue;
    line.size *=
      line.text === d.title ? (m.titleScale ?? 1) : (m.textScale ?? 1);
    line.font = font;
    if (
      m.mode === "photo" &&
      m.layout === "portrait" &&
      m.photoHeight &&
      d.template !== "pet" &&
      line.y >= h * 0.715
    ) {
      const start = Math.max(0.715, m.photoHeight + 0.14);
      line.y =
        h * (start + ((line.y / h - 0.715) * (0.94 - start)) / (0.92 - 0.715));
    }
  }
  const anchor = lines.find((line) => line.editKey === "title")?.y ?? h * 0.715;
  const minimumTextY = pictures.length
    ? Math.max(...pictures.map((p) => (p.y + p.height) / h)) + 0.025
    : 0.08;
  for (const line of lines) {
    if (!line.editKey) continue;
    const custom = m.textPositions?.[line.editKey];
    line.y =
      custom !== undefined
        ? Math.max(minimumTextY, Math.min(0.94, custom)) * h
        : Math.max(
            h * 0.08,
            Math.min(
              h * 0.94,
              anchor + (line.y - anchor) * (m.textSpacing ?? 1),
            ),
          );
  }
  return {
    w,
    h,
    color,
    background: paper,
    shapes,
    lines,
    pictures,
    border: false,
  };
}
