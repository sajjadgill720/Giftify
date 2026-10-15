export const ARTWORK_POLICY_VERSION = "places-and-things-v1";
export const ARTWORK_POLICY_COPY =
  "Nature, landscapes, buildings, and objects only. Images of people, portraits, weddings, pets, or other animals are not accepted.";

/** Customer declaration only; this is not automated image recognition. */
export function requireArtworkDeclaration(value: string | null) {
  if (value !== ARTWORK_POLICY_VERSION)
    throw new Error(
      "Confirm that your image contains only nature, places, architecture, or objects, with no people or animals.",
    );
  return {
    version: ARTWORK_POLICY_VERSION,
    declaredAt: new Date().toISOString(),
  };
}
