import { createHash } from "node:crypto";
import PDFDocument from "pdfkit";
import { printFont } from "./fonts";
import { Design, designSchema, dimensions } from "../../domain/src/index";
export const hash = (s: string | Buffer) =>
  createHash("sha256").update(s).digest("hex");
export function canonical(d: Design) {
  const v = designSchema.parse(d);
  return JSON.stringify({ version: v.version || 1, ...v });
}
import { layout } from "./representation";
import { memoryMarker } from "./memory-layout";
export { svg } from "./representation";
export function validatePrintText(d: Design) {
  const values = [
    d.title,
    d.subtitle,
    d.date,
    ...(d.memory ? [d.memory.names, d.memory.narrative, d.memory.place] : []),
  ];
  if (values.some((v) => /[^\x20-\x7e]/.test(v)))
    throw new Error(
      "English print text is supported. Bilingual print fonts are still being validated; your draft can remain in preview.",
    );
  const l = layout(d),
    metric = new PDFDocument({ autoFirstPage: false });
  try {
    for (const line of l.lines) {
      metric.font(printFont(line.font, l.border)).fontSize(line.size);
      if (metric.widthOfString(line.text) > l.w - 36)
        throw new Error("Text overflows the print safe area; shorten it.");
    }
  } finally {
    metric.resume();
    metric.end();
  }
}
export async function pdf(
  d: Design,
  images: (Buffer | undefined)[] = [],
): Promise<Buffer> {
  d = designSchema.parse(d);
  if (
    [
      ...Object.values(d),
      ...(d.memory ? [d.memory.names, d.memory.narrative, d.memory.place] : []),
    ].some((v) => typeof v === "string" && /[^\x20-\x7e]/.test(v))
  )
    throw new Error(
      "Bilingual print export awaits licensed embedded fonts and shaping validation. Preview only.",
    );
  const l = layout(d),
    scale = 72 / 25.4;
  if (d.memory?.mode === "photo" && !d.memory.photos.length)
    throw new Error("Upload a photograph before generating a print.");
  if (d.memory?.mode === "words" && d.memory.narrative.length < 8)
    throw new Error("Describe your memory before generating a print.");
  if (d.memory?.mode === "place" && !d.memory.map)
    throw new Error("A licensed map is required for this print.");
  if (l.pictures?.some((_, i) => !images[i]))
    throw new Error("A private print image is missing.");
  const doc = new PDFDocument({
    size: [l.w * scale, l.h * scale],
    margin: 0,
    info: {
      Title: "Approved milestone proof",
      CreationDate: new Date(0),
      ModDate: new Date(0),
    },
  });
  const chunks: Buffer[] = [];
  const result = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  doc.rect(0, 0, l.w * scale, l.h * scale).fill(l.background);
  if (l.border)
    doc
      .rect(12 * scale, 12 * scale, (l.w - 24) * scale, (l.h - 24) * scale)
      .lineWidth(0.5 * scale)
      .stroke(l.color);
  doc.save().scale(scale);
  for (const shape of l.shapes) {
    doc.lineWidth(shape.width || 0.45);
    if ("path" in shape) doc.path(shape.path);
    else doc.circle(...shape.circle);
    if (shape.fill && shape.stroke) doc.fillAndStroke(shape.fill, shape.stroke);
    else if (shape.fill) doc.fill(shape.fill);
    else if (shape.stroke) doc.stroke(shape.stroke);
  }
  doc.restore();
  for (const [i, pic] of (l.pictures || []).entries()) {
    doc.save();
    if (pic.circle)
      doc
        .circle(
          (pic.x + pic.width / 2) * scale,
          (pic.y + pic.height / 2) * scale,
          (pic.width / 2) * scale,
        )
        .clip();
    doc.image(images[i]!, pic.x * scale, pic.y * scale, {
      width: pic.width * scale,
      height: pic.height * scale,
    });
    doc.restore();
  }
  const markers = memoryMarker(d);
  if (markers.length) {
    doc.save().scale(scale);
    for (const shape of markers) {
      doc.lineWidth(shape.width || 0.5);
      if ("path" in shape) doc.path(shape.path);
      else doc.circle(...shape.circle);
      if (shape.fill && shape.stroke)
        doc.fillAndStroke(shape.fill, shape.stroke);
      else if (shape.fill) doc.fill(shape.fill);
    }
    doc.restore();
  }
  for (const t of l.lines) {
    doc.font(printFont(t.font, l.border)).fontSize(t.size * scale);
    if (doc.widthOfString(t.text) > (l.w - 36) * scale)
      throw new Error("Text overflows the print safe area; shorten it.");
    doc
      .fillColor(l.color)
      .text(t.text, 18 * scale, (t.y - t.size * 0.75) * scale, {
        width: (l.w - 36) * scale,
        align: "center",
        lineBreak: false,
      });
  }
  doc.end();
  return result;
}
