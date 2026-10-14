import { z } from "zod";
export const mapSelectionSchema = z
  .object({
    latitude: z.number().finite().min(-85).max(85),
    longitude: z.number().finite().min(-180).max(180),
    zoom: z.number().int().min(8).max(16),
    style: z.enum(["streets-v4", "basic-v2", "dataviz-light", "dataviz-dark"]),
  })
  .strict();
function key() {
  if (
    !process.env.MAPTILER_API_KEY ||
    process.env.MAP_PRINT_LICENSE_CONFIRMED !== "true"
  )
    throw new Error(
      "Place search and print maps require a configured MapTiler key and confirmed commercial print rights.",
    );
  return process.env.MAPTILER_API_KEY;
}
export async function searchPlaces(query: string) {
  const q = z.string().trim().min(2).max(120).parse(query);
  const url = new URL(
    `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json`,
  );
  url.searchParams.set("key", key());
  url.searchParams.set("limit", "5");
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    redirect: "error",
  });
  if (!response.ok)
    throw new Error(
      "Place search is unavailable. Check provider configuration or try again later.",
    );
  const data = await response.json();
  return (data.features || []).slice(0, 5).flatMap((f: any) => {
    const point = z
      .tuple([z.number().min(-180).max(180), z.number().min(-85).max(85)])
      .safeParse(f.center || f.geometry?.coordinates);
    return point.success
      ? [
          {
            name: String(f.place_name || f.text || "Selected place").slice(
              0,
              200,
            ),
            longitude: point.data[0],
            latitude: point.data[1],
          },
        ]
      : [];
  });
}
export async function fetchMap(input: unknown) {
  const selection = mapSelectionSchema.parse(input);
  const { style, longitude, latitude, zoom } = selection;
  const url = new URL(
    `https://api.maptiler.com/maps/${style}/static/${longitude},${latitude},${zoom}/1024x1024@2x.png`,
  );
  url.searchParams.set("key", key());
  url.searchParams.set("attribution", "bottomleft");
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    redirect: "error",
  });
  if (!response.ok)
    throw new Error(
      "Map image is unavailable. Check the selected style and provider setup.",
    );
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Map image is empty.");
  const chunks: Uint8Array[] = [];
  let count = 0;
  while (true) {
    const r = await reader.read();
    if (r.done) break;
    count += r.value.length;
    if (count > 8 * 1024 * 1024) {
      await reader.cancel();
      throw new Error("Map image exceeded the safe size limit.");
    }
    chunks.push(r.value);
  }
  return {
    bytes: Buffer.concat(chunks),
    selection,
    attribution: "© MapTiler © OpenStreetMap contributors",
  };
}
