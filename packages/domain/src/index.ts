import { z } from "zod";
import { pilotPricing as settings } from "./pilot-config";
export const designSchema = z
  .object({
    template: z.enum([
      "chapter",
      "laurel",
      "horizon",
      "arch",
      "orbit",
      "bloom",
    ]),
    title: z.string().trim().min(1).max(32),
    subtitle: z.string().trim().max(48),
    date: z.string().trim().max(24),
    size: z.enum(["A4", "A3"]),
    finish: z.enum(["oak", "black"]),
    version: z.union([z.literal(1), z.literal(2)]).optional(),
  })
  .strict();
export type Design = z.infer<typeof designSchema>;
export const templates = [
  "chapter",
  "laurel",
  "horizon",
  "arch",
  "orbit",
  "bloom",
] as const;
export const dimensions = { A4: [210, 297], A3: [297, 420] } as const;
export const catalog = templates.map((id, i) => ({
  id,
  name: [
    "A new chapter",
    "With distinction",
    "Beyond the horizon",
    "Our beginning",
    "Around you",
    "In full bloom",
  ][i],
  category: "Milestone Art",
  version: 2,
  occasion: [
    "New beginnings",
    "Achievements",
    "New beginnings",
    "Love & anniversaries",
    "Love & anniversaries",
    "Family & home",
  ][i],
  description: [
    "A quiet celebration of everything ahead. An original sun-and-arch composition for your next chapter.",
    "For the hard work, the late nights, and the moment it all came together. A modern laurel of recognition.",
    "Carry a little possibility with you. Layered landscapes for new adventures and meaningful milestones.",
    "A place for the day your story began. Two architectural arches, one shared beginning.",
    "Some people are your entire universe. An orbital composition for the connection that keeps you grounded.",
    "For the people who help you grow. An original botanical composition to celebrate family and belonging.",
  ][i],
  accent: ["#53644d", "#6b6d46", "#697c8b", "#ac785f", "#757286", "#927b74"][i],
}));
export function sampleDesign(
  template: (typeof templates)[number] = "chapter",
): Design {
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
    version: 2,
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
