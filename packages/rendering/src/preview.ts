import sharp from "sharp";
import { Design, designSchema, dimensions } from "../../domain/src/index";
import { svg } from "./representation";

// Only trusted, validated structured artwork enters this renderer. Never accept
// arbitrary SVG, external URLs or customer XML through this path.
export async function preview(
  input: Design,
  images: (Buffer | undefined)[] = [],
): Promise<Buffer> {
  const d = designSchema.parse(input);
  const [w, h] = dimensions[d.size];
  const watermark = `<g opacity=".45"><rect x="${w * 0.22}" y="${h * 0.88}" width="${w * 0.56}" height="${h * 0.06}" fill="#fff"/><text x="${w / 2}" y="${h * 0.92}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${w * 0.025}" fill="#333">PREVIEW · NOT FOR PRINT</text></g>`;
  const source = svg(
    d,
    images.map((bytes) =>
      bytes ? "data:image/jpeg;base64," + bytes.toString("base64") : undefined,
    ),
  ).replace("</svg>", watermark + "</svg>");
  return sharp(Buffer.from(source), {
    density: 72,
    limitInputPixels: 4_000_000,
  })
    .resize({
      width: 640,
      height: 640,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 78 })
    .toBuffer();
}
