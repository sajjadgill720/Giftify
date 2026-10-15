# Keepsake boutique refinement

The existing Next.js/React storefront and vanilla CSS component system are retained. `apps/web/app/boutique.css` applies the requested warm ivory, parchment, ink, taupe, espresso, and restrained brass identity after the existing theme. Georgia and Arial remain the editorial serif/readable sans pairing; no font service, animation library, or decorative dependency was added.

## Experience

- One framed, personalized example leads the homepage with a direct studio action.
- All categories remain reachable; three curated products introduce places, photographs, and family collages.
- The personalization process, gifting content, supported finish comparisons, A4/A3 print dimensions, and support/delivery/returns navigation remain explicit.
- The collection, product pages, and studio share the same calmer surfaces, controls, focus states, and responsive spacing.
- Mobile navigation, three editor steps, finish selection, and the existing bottom action area remain available.
- Reduced-motion preferences disable decorative transitions. Customer artwork colors and typography are independent of the storefront skin.
- Fixed a pre-existing collision between the outer photo showcase class and its inner photo window, which clipped the finished example. Also removed the old mobile rule that hid the third featured product and constrained studio grid children to prevent horizontal overflow.

## Preserved boundaries

Existing categories, saved edits, preview rendering, private uploads, server pricing, proof approval, order history, checkout integration, and authorized admin exports are preserved. The existing bag opens My keepsakes/order history; this change does not introduce a separate multi-item cart. Customers receive the existing preview flow, not production exports.

Public images and finish studies are illustrative and labeled accordingly. No real workshop, material macro photography, testimonials, concierge service, guarantees, packaging, or delivery promises were invented. Supplier materials and outside frame dimensions still require verification. A4/A3 dimensions describe the print area.

## Verification

- Existing automated suite: 47 tests passed, covering pricing, draft ownership, uploads, source-mode isolation, rendering, proof approval, payment evidence, and admin access.
- TypeScript check and production build passed; final visual corrections were checked again in the browser.
- Desktop (default 1280 viewport) homepage, collection, product detail, finish comparison, and studio inspected.
- Mobile 390 × 844 homepage, navigation, personalization entry, preview, and size/finish step inspected. Studio document scroll width equals its 375-pixel content viewport (the remaining width is the browser scrollbar), with no horizontal overflow.
- Mobile overrides reset after verification. Screenshots are under `docs/previews/luxury-*`.

Live checkout credentials, mapping credentials and print licensing, verified physical product specifications, and real product photography remain launch dependencies. Checkout remains explicitly test-only; no payment or shipment was simulated.
