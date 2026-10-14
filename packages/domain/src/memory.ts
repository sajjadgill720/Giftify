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
] as const;
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
    background: z.enum(["ivory", "rose", "sage", "midnight"]),
    font: z.enum(["classic", "modern"]),
    layout: z.enum(["portrait", "gallery", "collage"]),
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
export const memoryProfiles = {
  photo: {
    name: "Your favorite moment",
    category: "Photo memories",
    occasion: "Everyday moments",
    description:
      "A photograph, a few personal words, and a beautiful place to keep them. Make an everyday memory feel extraordinary.",
    title: "Our favorite moment",
    hint: "A favorite photograph",
    accent: "#b38a65",
  },
  couple: {
    name: "From here, together",
    category: "Couples",
    occasion: "Love & anniversaries",
    description:
      "For your first hello, your wedding day, and every little moment together. A romantic photo keepsake with your names and anniversary.",
    title: "Our story, together",
    hint: "Your names & anniversary",
    accent: "#b77e77",
  },
  family: {
    name: "All our little moments",
    category: "Family collages",
    occasion: "Family & home",
    description:
      "Bring up to four photographs together in a thoughtful family collage. Different moments, one place to belong.",
    title: "Our favorite people",
    hint: "Up to four family photographs",
    accent: "#6b7c64",
  },
  birthday: {
    name: "Another beautiful year",
    category: "Birthdays",
    occasion: "Birthdays",
    description:
      "Celebrate their name, their age, and the people who make every year special. A personal birthday print to treasure.",
    title: "A year to remember",
    hint: "A name, age & birthday wish",
    accent: "#c49f63",
  },
  pet: {
    name: "Always in our hearts",
    category: "Pets",
    occasion: "Pets & companions",
    description:
      "A soft portrait of your favorite companion, with their name and a message only a pet person would understand.",
    title: "Our best friend",
    hint: "Your pet’s name & portrait",
    accent: "#718976",
  },
  travel: {
    name: "We were here",
    category: "Travel memories",
    occasion: "Travel & adventures",
    description:
      "Keep a favorite journey close. Combine your travel photograph with a place, a date, and the story you brought home.",
    title: "An adventure worth keeping",
    hint: "Your photograph & destination",
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
      template === "words" ? "words" : template === "place" ? "place" : "photo",
    photos: [],
    narrative: "",
    names: "",
    place: "",
    background:
      template === "couple" ? "rose" : template === "pet" ? "sage" : "ivory",
    font: "classic",
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
