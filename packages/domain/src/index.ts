import { z } from "zod";
import { pilotPricing as settings } from "./pilot-config";
import {
  memoryTemplates,
  memorySchema,
  memoryProfiles,
  defaultMemory,
  isSacredTemplate,
} from "./memory";
export const designSchema = z
  .object({
    template: z.enum([
      "chapter",
      "laurel",
      "horizon",
      "arch",
      "orbit",
      "bloom",
      "coordinates",
      ...memoryTemplates,
    ]),
    title: z.string().trim().min(1).max(32),
    subtitle: z.string().trim().max(48),
    date: z.string().trim().max(24),
    size: z.enum(["A4", "A3"]),
    finish: z.enum(["oak", "black"]),
    version: z
      .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
      .optional(),
    memory: memorySchema.optional(),
    location: z
      .object({
        latitude: z.number().finite().min(-90).max(90),
        longitude: z.number().finite().min(-180).max(180),
      })
      .strict()
      .optional(),
    coordinateFormat: z.enum(["decimal", "dms"]).optional(),
    theme: z.enum(["ivory", "midnight", "rose"]).optional(),
    typography: z.enum(["classic", "modern"]).optional(),
  })
  .strict()
  .superRefine((d, ctx) => {
    if ((memoryTemplates as readonly string[]).includes(d.template)) {
      if (isSacredTemplate(d.template) && d.memory?.mode !== "words")
        ctx.addIssue({
          code: "custom",
          message: "Quran and hadith designs use text-only layouts.",
        });
      if (
        d.version !== 4 ||
        !d.memory ||
        d.location ||
        d.coordinateFormat ||
        d.theme ||
        d.typography
      )
        ctx.addIssue({
          code: "custom",
          message: "Memory designs require version 4 memory settings.",
        });
      return;
    }
    if (d.memory || d.version === 4)
      ctx.addIssue({
        code: "custom",
        message: "Memory settings require a memory template.",
      });
    if (d.template === "coordinates") {
      if (
        d.version !== 3 ||
        !d.location ||
        !d.coordinateFormat ||
        !d.theme ||
        !d.typography
      )
        ctx.addIssue({
          code: "custom",
          path: ["location"],
          message:
            "Coordinates artwork needs a version 3 location, format, theme and typography.",
        });
    } else if (
      d.version === 3 ||
      d.location ||
      d.coordinateFormat ||
      d.theme ||
      d.typography
    ) {
      ctx.addIssue({
        code: "custom",
        message: "These options belong to coordinates artwork only.",
      });
    }
  });
export type Design = z.infer<typeof designSchema>;
export const templates = [
  "chapter",
  "laurel",
  "horizon",
  "arch",
  "orbit",
  "bloom",
  "coordinates",
] as const;
export const dimensions = { A4: [210, 297], A3: [297, 420] } as const;
const originalCatalog = templates.map((id, i) => ({
  id,
  name: [
    "A new chapter",
    "With distinction",
    "Beyond the horizon",
    "Our beginning",
    "Around you",
    "In full bloom",
    "A place to remember",
  ][i],
  category: id === "coordinates" ? "Coordinates & Stories" : "Milestone Art",
  version: id === "coordinates" ? 3 : 2,
  occasion: [
    "Architecture & places",
    "Nature studies",
    "Landscapes & light",
    "Architecture & places",
    "Still life & objects",
    "Nature studies",
    "Architecture & places",
  ][i],
  description: [
    "Architectural lines and considered proportions. An original sun-and-arch composition for a distinctive corner of your home.",
    "A study in natural form. Refined botanical geometry with the words and palette you choose.",
    "Carry a little possibility with you. Layered landscapes for new adventures and meaningful milestones.",
    "Two architectural arches, composed with balance and restraint. A quiet statement for a considered interior.",
    "An orbital study in balance and proportion. Distinctive geometry, composed around your chosen words.",
    "Bring the rhythm of botanical form indoors. An original composition with a naturally gentle presence.",
    "Some places become part of you. Preserve their exact coordinates alongside your names, a meaningful date, and a few words of your own.",
  ][i],
  accent: [
    "#53644d",
    "#6b6d46",
    "#697c8b",
    "#ac785f",
    "#757286",
    "#927b74",
    "#514638",
  ][i],
}));
export const catalog = [
  ...originalCatalog,
  ...memoryTemplates.map((id) => ({ id, ...memoryProfiles[id], version: 4 })),
];
export function sampleDesign(template: Design["template"] = "chapter"): Design {
  if ((memoryTemplates as readonly string[]).includes(template)) {
    const id = template as (typeof memoryTemplates)[number];
    return {
      template: id,
      version: 4,
      title: memoryProfiles[id].title,
      subtitle: isSacredTemplate(id) ? "" : "A moment worth keeping",
      date: isSacredTemplate(id) ? "" : "14.02.2026",
      size: "A3",
      finish: "oak",
      memory: defaultMemory(id),
    };
  }
  const product = catalog.find((p) => p.id === template)!;
  return {
    template,
    title: product.name,
    subtitle:
      template === "arch"
        ? "Ayesha & Hamza"
        : template === "laurel"
          ? "Every little effort led you here"
          : "A moment worth keeping",
    date: template === "arch" ? "12.09.2026" : "A MOMENT WORTH KEEPING",
    size: "A3",
    finish: "oak",
    version: template === "coordinates" ? 3 : 2,
    ...(template === "coordinates"
      ? {
          title: "Where our story began",
          subtitle: "Ayesha & Hamza",
          date: "12.09.2026",
          location: { latitude: 33.6844, longitude: 73.0479 },
          coordinateFormat: "decimal" as const,
          theme: "ivory" as const,
          typography: "classic" as const,
        }
      : {}),
  };
}
export const requestSchema = z
  .object({
    category: z.enum(["revision", "delivery", "refund", "other"]),
    message: z.string().trim().min(8).max(1000),
  })
  .strict();
export function price(d: Design) {
  const product = d.size === "A3" ? settings.a3 : settings.a4;
  const frame = d.finish === "black" ? 0 : settings.oakUpgrade;
  const shipping = settings.domesticShipping;
  return {
    product,
    frame,
    shipping,
    tax: settings.tax.amount,
    total: product + frame + shipping + settings.tax.amount,
    currency: settings.currency,
    priceVersion: settings.version,
    taxVersion: settings.tax.version,
    taxBasis: settings.tax.basis,
    specification: settings.materials,
  };
}
export const addressSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    phone: z
      .string()
      .trim()
      .regex(/^\+?92\d{10}$|^03\d{9}$/, "Use a Pakistan phone number."),
    line: z.string().trim().min(8).max(160),
    city: z.enum(["Islamabad", "Rawalpindi", "Lahore", "Karachi"]),
    country: z.literal("PK"),
    confirmed: z.literal(true),
  })
  .strict();
export function eligible(o: Record<string, unknown>) {
  return (
    o.payment === "captured" &&
    !!o.proof_hash &&
    o.approved_hash === o.proof_hash &&
    o.approved_revision === o.proof_revision &&
    o.production === "blocked"
  );
}
