// Experiments from plan.md; these are not supplier quotes or final tax advice.
export const pilotPricing = {
  version: "pilot-1",
  currency: "PKR",
  a4: 299000,
  a3: 399000,
  oakUpgrade: 20000,
  domesticShipping: 45000,
  tax: {
    version: "sandbox-unconfirmed",
    amount: 0,
    basis: "Not configured; sandbox only",
  },
  materials:
    "Proposed MDF frame, acrylic front, 250 gsm matte paper; supplier verification pending",
} as const;
