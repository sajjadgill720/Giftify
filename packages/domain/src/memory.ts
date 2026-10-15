import { z } from "zod";
export const memoryTemplates = [
  "photo",
  "couple",
  "family",
  "birthday",
  "pet",
  "travel",
  "words",
  "place",
  "quran",
  "hadith",
] as const;
export function isSacredTemplate(template: string) {
  return template === "quran" || template === "hadith";
}
export const photoSchema = z
  .object({
    assetId: z.uuid(),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    zoom: z.number().min(1).max(3),
    rotation: z.union([
      z.literal(0),
      z.literal(90),
      z.literal(180),
      z.literal(270),
    ]),
    filter: z.enum(["original", "bw", "warm"]),
  })
  .strict();
export const memorySchema = z
  .object({
    mode: z.enum(["photo", "words", "place"]),
    photos: z.array(photoSchema).max(4),
    narrative: z.string().trim().max(220),
    names: z.string().trim().max(48),
    place: z.string().trim().max(64),
    age: z.number().int().min(0).max(120).optional(),
    background: z.enum([
      "ivory",
      "rose",
      "sage",
      "midnight",
      "sand",
      "sky",
      "lavender",
      "charcoal",
    ]),
    backgroundColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    textColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    font: z.enum(["classic", "modern", "editorial", "bold", "mono"]),
    titleScale: z.number().min(0.75).max(2.4).optional(),
    textScale: z.number().min(0.75).max(1.8).optional(),
    textSpacing: z.number().min(0.5).max(1.2).optional(),
    textPositions: z
      .object({
        title: z.number().min(0.08).max(0.94).optional(),
        names: z.number().min(0.08).max(0.94).optional(),
        message: z.number().min(0.08).max(0.94).optional(),
        place: z.number().min(0.08).max(0.94).optional(),
        date: z.number().min(0.08).max(0.94).optional(),
      })
      .strict()
      .optional(),
    photoHeight: z.number().min(0.4).max(0.65).optional(),
    layout: z.enum(["portrait", "gallery", "collage", "fullbleed"]),
    marker: z.enum(["heart", "pin", "none"]),
    qualityAcknowledged: z.boolean(),
    map: z
      .object({
        assetId: z.uuid(),
        latitude: z.number().min(-85).max(85),
        longitude: z.number().min(-180).max(180),
        zoom: z.number().int().min(8).max(16),
        style: z.enum([
          "streets-v4",
          "basic-v2",
          "dataviz-light",
          "dataviz-dark",
        ]),
      })
      .strict()
      .optional(),
  })
  .strict();
export type Photo = z.infer<typeof photoSchema>;
export type Memory = z.infer<typeof memorySchema>;
export function selectMemoryMode(memory: Memory, mode: Memory["mode"]): Memory {
  return {
    ...memory,
    mode,
    layout:
      mode !== "photo" && ["collage", "fullbleed"].includes(memory.layout)
        ? "portrait"
        : memory.layout,
  };
}
export const memoryProfiles = {
  quran: {
    name: "Words for reflection",
    category: "Quranic ayat",
    occasion: "Quran & Hadith",
    description:
      "Give a cherished ayah a considered place in your home. A restrained text composition with your chosen passage and its surah and verse reference.",
    title: "Quranic reflection",
    hint: "Your chosen ayah & verse reference",
    accent: "#54705d",
  },
  hadith: {
    name: "A reminder to live by",
    category: "Ahadees",
    occasion: "Quran & Hadith",
    description:
      "A meaningful reminder, presented with care. Compose a hadith with its collection and reference in an elegant, text-only design.",
    title: "A daily reminder",
    hint: "Your chosen hadith & source",
    accent: "#9b7c4f",
  },
  photo: {
    name: "A view worth keeping",
    category: "Landscapes",
    occasion: "Landscapes & light",
    description:
      "Give a remarkable view a lasting place in your home. Your landscape photograph, considered typography, and a finish chosen for your space.",
    title: "A moment of stillness",
    hint: "Open horizons & quiet light",
    accent: "#b38a65",
  },
  couple: {
    name: "Rooted in stillness",
    category: "Trees & botanicals",
    occasion: "Nature studies",
    description:
      "Sculptural branches, enduring roots, and the poetry of natural form. Create a botanical study with a title and palette of your own.",
    title: "Rooted in stillness",
    hint: "Trees, foliage & natural form",
    accent: "#b77e77",
  },
  family: {
    name: "A collection of places",
    category: "Place collages",
    occasion: "Architecture & places",
    description:
      "Bring up to four views into one considered composition. Pair architectural details, landscapes, or treasured objects in a personal visual collection.",
    title: "A collection of places",
    hint: "Up to four places or details",
    accent: "#6b7c64",
  },
  birthday: {
    name: "Everyday sculpture",
    category: "Object studies",
    occasion: "Still life & objects",
    description:
      "Discover the presence in simple things. Turn a photograph of ceramics, collected objects, or a composed still life into a quietly distinctive piece.",
    title: "Everyday sculpture",
    hint: "Collected objects & thoughtful details",
    accent: "#c49f63",
  },
  pet: {
    name: "The art of simple things",
    category: "Still life",
    occasion: "Still life & objects",
    description:
      "Texture, proportion, and light, beautifully composed. Frame the everyday objects that bring character to a room.",
    title: "The art of simple things",
    hint: "Ceramics, textures & quiet compositions",
    accent: "#718976",
  },
  travel: {
    name: "Beyond the familiar",
    category: "Architecture",
    occasion: "Architecture & places",
    description:
      "Preserve the character of a building, a street, or a distant destination. Your photograph and chosen words, composed with restraint.",
    title: "Stories in stone",
    hint: "Buildings, streets & destinations",
    accent: "#758c99",
  },
  words: {
    name: "A memory in words",
    category: "Written memories",
    occasion: "Everyday moments",
    description:
      "No photograph needed. Tell the story of a moment that matters, and turn it into a quietly beautiful print.",
    title: "A moment worth keeping",
    hint: "Tell a memory in your own words",
    accent: "#9e806b",
  },
  place: {
    name: "Where it all began",
    category: "Special places",
    occasion: "Travel & adventures",
    description:
      "The place that became part of your story. A real map, a personal marker, and your words, with an optional photograph.",
    title: "Where it all began",
    hint: "Search a meaningful location",
    accent: "#8c9380",
  },
} as const;
export function defaultMemory(template: (typeof memoryTemplates)[number]) {
  return memorySchema.parse({
    mode:
      template === "words" || isSacredTemplate(template)
        ? "words"
        : template === "place"
          ? "place"
          : "photo",
    photos: [],
    narrative: "",
    names: "",
    place: "",
    background:
      template === "couple" ? "rose" : template === "pet" ? "sage" : "ivory",
    font: "classic",
    titleScale: 1.4,
    textScale: 1.25,
    layout: template === "family" ? "collage" : "portrait",
    marker: "heart",
    qualityAcknowledged: false,
  });
}
export function cropGeometry(
  width: number,
  height: number,
  ratio: number,
  photo: Pick<Photo, "x" | "y" | "zoom" | "rotation">,
) {
  if (photo.rotation % 180) [width, height] = [height, width];
  const cropWidth = Math.max(
    1,
    Math.floor(Math.min(width, height * ratio) / photo.zoom),
  );
  const cropHeight = Math.max(
    1,
    Math.min(height, Math.round(cropWidth / ratio)),
  );
  return {
    left: Math.round((width - cropWidth) * photo.x),
    top: Math.round((height - cropHeight) * photo.y),
    width: cropWidth,
    height: cropHeight,
    sourceWidth: width,
    sourceHeight: height,
  };
}
