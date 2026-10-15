import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sampleDesign,
  designSchema,
  catalog,
} from "../packages/domain/src/index";
import { memoryPictures } from "../packages/rendering/src/memory-layout";
import { validatePrintText } from "../packages/rendering/src/index";

test("Quran and hadith collections are text-only and need a source before print checkout", () => {
  for (const id of ["quran", "hadith"] as const) {
    const design = sampleDesign(id);
    assert.ok(catalog.some((p) => p.id === id));
    assert.equal(design.memory?.mode, "words");
    assert.deepEqual(memoryPictures(design), []);
    assert.equal(
      designSchema.safeParse({
        ...design,
        memory: { ...design.memory, mode: "photo" },
      }).success,
      false,
    );
    assert.throws(() => validatePrintText(design), /reference/);
    const draft = {
      ...design,
      memory: {
        ...design.memory!,
        names: "Reference supplied by customer",
        narrative: "نص عربي",
      },
    };
    assert.equal(designSchema.safeParse(draft).success, true);
    assert.throws(() => validatePrintText(draft), /Bilingual print fonts/);
  }
});
