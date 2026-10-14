import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { sampleDesign, designSchema } from "../packages/domain/src/index";
import {
  memoryLayout,
  memoryPictures,
} from "../packages/rendering/src/memory-layout";
import {
  pdf,
  canonical,
  validatePrintText,
} from "../packages/rendering/src/index";
import { svg } from "../packages/rendering/src/artwork";

function photoDesign() {
  const d = sampleDesign("photo");
  d.memory!.photos = [
    {
      assetId: randomUUID(),
      x: 0.5,
      y: 0.5,
      zoom: 1,
      rotation: 0,
      filter: "original",
    },
  ];
  return d;
}
test("full-frame photo uses the complete paper, retains wording and changes print identity", async () => {
  const d = photoDesign(),
    before = canonical(d);
  d.memory!.layout = "fullbleed";
  const p = memoryPictures(d)[0];
  assert.deepEqual([p.x, p.y, p.width, p.height], [0, 0, 297, 420]);
  assert.equal(memoryLayout(d).lines.length, 0);
  assert.ok(d.title.length > 0);
  assert.notEqual(before, canonical(d));
  const bytes = await sharp({
    create: { width: 1600, height: 2000, channels: 3, background: "#527d6d" },
  })
    .jpeg()
    .toBuffer();
  assert.ok(
    (await pdf(d, [bytes])).toString("latin1").includes("/Subtype /Image"),
  );
  d.memory!.layout = "portrait";
  assert.ok(memoryLayout(d).lines.some((l) => l.text === d.title));
});
test("all typography options appear in SVG and produce a real print PDF", async () => {
  for (const font of [
    "classic",
    "modern",
    "editorial",
    "bold",
    "mono",
  ] as const) {
    const d = sampleDesign("words");
    d.title = "Our story";
    d.memory!.narrative = "Together, always.";
    d.memory!.font = font;
    d.memory!.titleScale = 1.4;
    d.memory!.textScale = 1.2;
    d.memory!.textColor = "#663344";
    d.memory!.backgroundColor = "#eeeedd";
    assert.equal(designSchema.safeParse(d).success, true);
    const l = memoryLayout(d);
    assert.equal(l.color, "#663344");
    assert.equal(l.background, "#eeeedd");
    assert.equal(l.lines[0].size, 297 * 0.04 * 1.4);
    validatePrintText(d);
    const markup = svg(d);
    assert.ok(markup.includes('fill="#663344"'));
    if (font === "editorial") assert.ok(markup.includes('font-style="italic"'));
    if (font === "bold") assert.ok(markup.includes('font-weight="700"'));
    if (font === "mono") assert.ok(markup.includes("Courier New"));
    assert.equal((await pdf(d)).subarray(0, 4).toString(), "%PDF");
  }
});
test("custom styling is bounded and cannot inject arbitrary SVG or CSS", () => {
  const d = photoDesign();
  assert.equal(
    designSchema.safeParse({
      ...d,
      memory: { ...d.memory, textColor: 'red" onload="alert(1)' },
    }).success,
    false,
  );
  assert.equal(
    designSchema.safeParse({ ...d, memory: { ...d.memory, titleScale: 99 } })
      .success,
    false,
  );
  assert.equal(
    designSchema.safeParse({ ...d, memory: { ...d.memory, photoHeight: 1 } })
      .success,
    false,
  );
});
test("a map keeps its wording and attribution even if a retained photo-only layout is selected", () => {
  const d = sampleDesign("place");
  d.memory!.layout = "fullbleed";
  d.memory!.map = {
    assetId: randomUUID(),
    latitude: 48.8,
    longitude: 2.3,
    zoom: 12,
    style: "streets-v4",
  };
  assert.ok(
    memoryLayout(d).lines.some((l) => l.text.includes("OpenStreetMap")),
  );
  assert.ok(memoryPictures(d)[0].x > 0);
});
