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
  version: 1,
}));
export function price(d: Design) {
  const product = d.size === "A3" ? settings.a3 : settings.a4;
  const frame = d.finish === "black" ? 0 : settings.oakUpgrade;
  const shipping = settings.domesticShipping;
  return {
    product,
    frame,
    shipping,
    tax: settings.tax.amount,
    total: product + frame + shipping,
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
    o.production === "blocked"
  );
}
