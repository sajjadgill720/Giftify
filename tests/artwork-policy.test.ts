import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ARTWORK_POLICY_VERSION,
  requireArtworkDeclaration,
} from "../packages/domain/src/artwork-policy";

test("new uploads require the current places-and-things declaration", () => {
  for (const value of [null, "", "true", "places-and-things-v0"])
    assert.throws(
      () => requireArtworkDeclaration(value),
      /no people or animals/,
    );
  const declaration = requireArtworkDeclaration(ARTWORK_POLICY_VERSION);
  assert.equal(declaration.version, ARTWORK_POLICY_VERSION);
  assert.ok(Number.isFinite(Date.parse(declaration.declaredAt)));
});
