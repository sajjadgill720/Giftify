import sharp from "sharp";
import { randomUUID, createHash } from "node:crypto";
import { DB, scoped } from "./db";
import { Design, designSchema } from "./index";
import { cropGeometry, Photo } from "./memory";
import { memoryPictures } from "../../rendering/src/memory-layout";
import {
  putAsset,
  getAsset,
  removeAssetFiles,
} from "../../integrations/src/asset-store";
const checksum = (b: Buffer) => createHash("sha256").update(b).digest("hex");
export const MAX_UPLOAD = 8 * 1024 * 1024;
let activeUploads = 0;
export function assetSummary(a: Record<string, any>) {
  return {
    id: a.id,
    width: a.width,
    height: a.height,
    kind: a.kind,
    created_at: a.created_at,
    attribution: a.source_metadata?.attribution,
  };
}
export async function uploadAsset(
  db: DB,
  owner: string,
  input: Buffer,
  kind: "photo" | "map" = "photo",
  metadata?: Record<string, unknown>,
) {
  if (activeUploads >= 2)
    throw new Error("Image processing is busy. Please try again shortly.");
  activeUploads++;
  try {
    const count = await scoped(
      db,
      owner,
      "guest",
      async (tx) =>
        (
          await tx.query(
            "SELECT count(*)::int AS count FROM art.assets WHERE archived=false",
          )
        ).rows[0].count,
    );
    if (count >= 50)
      throw new Error(
        "This private library has reached the pilot limit of 50 uploads. Contact support before adding more.",
      );
    if (!input.length || input.length > MAX_UPLOAD)
      throw new Error("Choose a JPEG or PNG up to 8 MB.");
    const jpeg = input[0] === 255 && input[1] === 216,
      png = input
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (!jpeg && !png)
      throw new Error("Only genuine JPEG and PNG images are supported.");
    const image = sharp(input, {
      limitInputPixels: 24_000_000,
      failOn: "error",
    });
    const meta = await image.metadata();
    if (
      !meta.width ||
      !meta.height ||
      (meta.pages || 1) !== 1 ||
      !["jpeg", "png"].includes(meta.format || "")
    )
      throw new Error("Choose a single JPEG or PNG image.");
    const normalized = await image
      .autoOrient()
      .flatten({ background: "#faf6ed" })
      .jpeg({ quality: 95 })
      .toBuffer();
    const oriented = await sharp(normalized).metadata();
    const derivative = await sharp(normalized)
      .resize({
        width: 640,
        height: 640,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 78 })
      .toBuffer();
    const id = randomUUID(),
      keys = [
        `assets/${id}/original.bin`,
        `assets/${id}/normalized.jpg`,
        `assets/${id}/preview.jpg`,
      ];
    const written: string[] = [];
    try {
      for (const [i, bytes] of [input, normalized, derivative].entries()) {
        await putAsset(
          keys[i],
          bytes,
          i ? "image/jpeg" : "application/octet-stream",
        );
        written.push(keys[i]);
      }
      const record = await scoped(
        db,
        owner,
        kind === "map" ? "ops" : "guest",
        async (tx) =>
          (
            await tx.query(
              "INSERT INTO art.assets(id,owner_id,kind,width,height,bytes,checksum,original_key,normalized_key,preview_key,source_metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *",
              [
                id,
                owner,
                kind,
                oriented.width,
                oriented.height,
                input.length,
                checksum(normalized),
                ...keys,
                {
                  ...metadata,
                  originalChecksum: checksum(input),
                  previewChecksum: checksum(derivative),
                },
              ],
            )
          ).rows[0],
      );
      return assetSummary(record);
    } catch (e) {
      await removeAssetFiles(written);
      throw e;
    }
  } finally {
    activeUploads--;
  }
}
export function designAssetIds(d: Design) {
  return [
    ...new Set([
      ...(d.memory?.photos.map((p) => p.assetId) || []),
      ...(d.memory?.map ? [d.memory.map.assetId] : []),
    ]),
  ];
}
export async function validateAssets(tx: DB, input: Design, complete = false) {
  const d = designSchema.parse(input);
  if (!d.memory) return [];
  const ids = designAssetIds(d),
    records: Record<string, any>[] = [];
  for (const id of ids) {
    const record = (
      await tx.query(
        "SELECT * FROM art.assets WHERE id=$1 AND archived=false FOR SHARE",
        [id],
      )
    ).rows[0];
    if (!record)
      throw new Error(
        "A private photograph or map is unavailable. Replace it before saving.",
      );
    const map = d.memory.map?.assetId === id;
    if (record.kind !== (map ? "map" : "photo"))
      throw new Error("Artwork asset type mismatch.");
    if (
      map &&
      JSON.stringify(record.source_metadata?.selection) !==
        JSON.stringify(d.memory.map)
    ) {
      // UUID is assigned after provider selection; compare fields individually.
      if (
        ["latitude", "longitude", "style", "zoom"].some(
          (k) =>
            record.source_metadata?.selection?.[k] !==
            (d.memory!.map as any)[k],
        )
      )
        throw new Error("Map selection differs from its saved source.");
    }
    records.push(record);
  }
  if (complete) {
    if (
      d.memory.mode === "place" &&
      d.memory.map &&
      process.env.MAP_PRINT_LICENSE_CONFIRMED !== "true"
    )
      throw new Error(
        "Ordering a licensed map requires current confirmed commercial print rights.",
      );
    if (d.memory.mode === "words" && d.memory.narrative.trim().length < 8)
      throw new Error("Tell your memory in at least eight characters.");
    if (d.memory.mode === "photo" && !d.memory.photos.length)
      throw new Error("Upload a photograph, or choose a memory in words.");
    if (d.memory.mode === "place" && !d.memory.map)
      throw new Error(
        "Select a licensed map before ordering a special-place design. You can also choose a photo or written memory.",
      );
    for (const pic of memoryPictures(d)) {
      const record = records.find((a) => a.id === pic.assetId);
      if (!record) continue;
      const crop = cropGeometry(
        record.width,
        record.height,
        pic.width / pic.height,
        pic.photo,
      );
      const dpi = Math.min(
        crop.width / (pic.width / 25.4),
        crop.height / (pic.height / 25.4),
      );
      if (dpi < 100)
        throw new Error(
          "This crop is below 100 DPI for the selected print. Choose a smaller size, zoom out, or upload a larger photo.",
        );
      if (dpi < 300 && !d.memory.qualityAcknowledged)
        throw new Error(
          "Review the image-quality warning and acknowledge it before ordering.",
        );
    }
  }
  return records;
}
export async function pictureBytes(
  record: Record<string, any>,
  photo: Photo,
  ratio: number,
  print = false,
) {
  const raw = await getAsset(
    print ? record.normalized_key : record.preview_key,
  );
  if (print && checksum(raw) !== record.checksum)
    throw new Error("Private image checksum mismatch; production is held.");
  if (!print && checksum(raw) !== record.source_metadata?.previewChecksum)
    throw new Error(
      "Private preview checksum mismatch. Please contact support.",
    );
  const meta = await sharp(raw).metadata();
  const crop = cropGeometry(meta.width!, meta.height!, ratio, photo);
  // Rotate and crop in one pipeline; avoid an intermediate lossy JPEG encode.
  let output = sharp(raw).rotate(photo.rotation).extract({
    left: crop.left,
    top: crop.top,
    width: crop.width,
    height: crop.height,
  });
  if (photo.filter === "bw") output = output.grayscale();
  if (photo.filter === "warm")
    output = output.modulate({ saturation: 0.8, brightness: 1.06 });
  return output
    .resize({
      width: print ? 4000 : 640,
      height: print ? 4000 : 640,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: print ? 95 : 78 })
    .toBuffer();
}
export async function artworkPictures(
  db: DB,
  owner: string,
  d: Design,
  role: "guest" | "ops",
  print = false,
) {
  const pics = memoryPictures(d);
  const records = await scoped(db, owner, role, (tx) =>
    validateAssets(tx, d, false),
  );
  if (print) {
    const result: (Buffer | undefined)[] = [];
    // Original files can be large. Decode one at a time to bound worker memory.
    for (const pic of pics) {
      const record = records.find((a) => a.id === pic.assetId);
      result.push(
        record
          ? await pictureBytes(record, pic.photo, pic.width / pic.height, true)
          : undefined,
      );
    }
    return result;
  }
  return Promise.all(
    pics.map(async (pic) => {
      const record = records.find((a) => a.id === pic.assetId);
      if (!record) return undefined;
      return pictureBytes(record, pic.photo, pic.width / pic.height, print);
    }),
  );
}
