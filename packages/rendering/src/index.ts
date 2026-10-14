import { createHash } from "node:crypto";
import PDFDocument from "pdfkit";
import { Design, designSchema, dimensions } from "../../domain/src/index";
export const hash = (s: string | Buffer) =>
  createHash("sha256").update(s).digest("hex");
export function canonical(d: Design) {
  const v = designSchema.parse(d);
  return JSON.stringify({ version: 1, ...v });
}
import { layout } from "./representation";
export { svg } from "./representation";
export async function pdf(d: Design): Promise<Buffer> {
  if (Object.values(d).some((v) => /[^\x20-\x7e]/.test(v)))
    throw new Error(
      "Bilingual print export awaits licensed embedded fonts and shaping validation. Preview only.",
    );
  const l = layout(d),
    scale = 72 / 25.4;
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
  doc.rect(0, 0, l.w * scale, l.h * scale).fill("#faf6ed");
  doc
    .rect(12 * scale, 12 * scale, (l.w - 24) * scale, (l.h - 24) * scale)
    .lineWidth(0.5 * scale)
    .stroke(l.color);
  doc.circle((l.w / 2) * scale, l.h * 0.28 * scale, 15 * scale).stroke(l.color);
  doc
    .moveTo((l.w / 2 - 8) * scale, l.h * 0.28 * scale)
    .lineTo((l.w / 2) * scale, (l.h * 0.28 - 8) * scale)
    .lineTo((l.w / 2 + 8) * scale, l.h * 0.28 * scale)
    .lineTo((l.w / 2) * scale, (l.h * 0.28 + 8) * scale)
    .closePath()
    .fill(l.color);
  for (const t of l.lines) {
    doc.font("Helvetica").fontSize(t.size * scale);
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
