# Complete homepage editorial treatment

The hero remains intact. The sections beneath it now share its warm interior art direction:

- An illustrated eight-category index with a separate editorial introduction, framed miniatures, short labels, and the existing brown shades and hover/focus behavior.
- Staggered collection scenes with architectural alcoves, larger artwork, visible product names and prices, and explicit illustrative labels.
- A room-style family/cat gifting composition using the existing interior asset.
- A dark espresso process section with a photograph-to-frame visual and the four existing purchase steps.
- A finish comparison set in an alcove, with simpler unboxed supporting information and A4/A3 guidance.
- Larger occasion typography and a framed written-memory closing composition.

All eight category URLs, shopping actions, product data, and personalization features remain intact. New CSS is scoped to `.atelier-home` in `apps/web/app/landing-editorial.css`; the optional scene image on ProductCard leaves ordinary shop cards unchanged. Next.js Image handles responsive asset delivery. No new runtime dependency or animation library was added.

## Generated asset

Built-in imagegen output saved to `apps/web/public/images/examples/gallery-alcove.png`.

Final prompt: “Use case: product-mockup. Asset type: premium personalized-art storefront editorial scene backdrop. Create an understated luxury interiors scene in portrait format, straight-on camera. A warm parchment plaster wall with a very subtle broad curved architectural alcove, soft late-afternoon sunlight from right, a pale travertine ledge across bottom 12 percent, small folded ivory linen on the far bottom left, a tiny dark walnut sculptural object at far bottom right. Keep the central 75 percent of the wall EMPTY to overlay a framed print in code. Restrained soft brown, ivory, limestone and warm taupe palette, realistic tactile surfaces, gentle shadows, calm gallery-like composition, sophisticated architectural editorial photography style. No frames, no art, no writing, no logo, no watermark, no people. This will be labeled an illustrative interior, not physical product photography.”

These are illustrative storefront scenes, not verified product photography. Existing material-validation notes and test-only checkout status remain visible. No customer photos, order rendering, or export permissions changed.

## Verification

TypeScript and the production build pass. Desktop browser inspection covers categories, collection scenes, process guide, finish comparison, and closing composition. Mobile inspection at 390 × 844 covers categories, collection imagery, process guide, and finish layout; document scroll width equals the 375-pixel content viewport with no horizontal overflow. All eight category routes remain present. Screenshots are saved as `docs/previews/editorial-*`.
