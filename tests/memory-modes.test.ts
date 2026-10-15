import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryControls } from "../apps/web/components/memory-controls";
import { sampleDesign } from "../packages/domain/src/index";
import { selectMemoryMode } from "../packages/domain/src/memory";
import { memoryPictures } from "../packages/rendering/src/memory-layout";

test("repeated place/photo/words switches show only the active source's editing tools", () => {
  const d = sampleDesign("photo");
  d.memory!.photos = [
    {
      assetId: randomUUID(),
      x: 0.3,
      y: 0.7,
      zoom: 1.4,
      rotation: 90,
      filter: "warm",
    },
  ];
  d.memory!.map = {
    assetId: randomUUID(),
    latitude: 48.8,
    longitude: 2.3,
    zoom: 12,
    style: "streets-v4",
  };
  const original = structuredClone(d.memory!);
  for (const mode of [
    "place",
    "photo",
    "place",
    "words",
    "photo",
    "place",
  ] as const) {
    d.memory = selectMemoryMode(d.memory!, mode);
    const html = renderToStaticMarkup(
      createElement(MemoryControls, {
        design: d,
        change: () => {},
        onBusy: () => {},
      }),
    );
    assert.equal(html.includes("Search your special place"), mode === "place");
    assert.equal(html.includes("Neighborhood detail"), mode === "place");
    assert.equal(html.includes("Highlight this place"), mode === "place");
    assert.equal(html.includes("Your photographs"), mode === "photo");
    assert.equal(html.includes("photo-edit-panel"), mode === "photo");
    assert.equal(html.includes("Photo collage"), mode === "photo");
    assert.equal(html.includes("Describe your memory"), mode === "words");
    assert.deepEqual(d.memory.photos, original.photos);
    assert.deepEqual(d.memory.map, original.map);
  }
});
test("place preview does not fall back to retained photo content before a map is selected", () => {
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
  assert.equal(memoryPictures(d).length, 1);
  d.memory = selectMemoryMode(d.memory!, "place");
  assert.equal(memoryPictures(d).length, 0);
  d.memory = selectMemoryMode(d.memory!, "photo");
  assert.equal(memoryPictures(d).length, 1);
});
test("photo-only layout is normalized on source change without removing saved content", () => {
  const d = sampleDesign("family");
  d.memory!.layout = "collage";
  const m = selectMemoryMode(d.memory!, "place");
  assert.equal(m.layout, "portrait");
  assert.equal(d.memory!.layout, "collage");
});
