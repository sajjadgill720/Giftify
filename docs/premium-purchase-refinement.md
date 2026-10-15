# Premium landing and purchase refinement

The existing storefront now has an illustrative interior behind its single hero artwork and a paired family/cat composition in the gifting section. These remain explicitly labeled examples. No product-material, service, review, or fulfillment claims were added.

Checkout keeps the existing quote, pricing, payment integration, private proof, and order creation flow. Improvements include a clear journey indicator; visible test-mode status; a personalized artwork summary; itemized server totals; a total beside the final action; explicit unpaid-order language when Safepay is unavailable; accessible field errors; and a return link to the originating saved draft. An uninitialized timer no longer briefly displays an expired quote. Submission waits for configuration and a valid quote.

The mobile order summary starts compact, with artwork and total visible and details available through a native disclosure. Desktop expands these details and allows the long summary to scroll. Payment and shipping are never simulated. Live payment setup, tax configuration, and supplier validation remain outstanding.

## Interior asset

Generated with the built-in imagegen tool and copied into the project at `apps/web/public/images/examples/atelier-interior.png`. Loaded through the existing Next.js Image system with responsive sizing and decorative alt text. Customer artwork and upload storage are unchanged.

Final prompt: “Use case: product-mockup. Asset type: portrait background for Keepsake premium personalized frame storefront hero. A refined understated luxury interior vignette, warm ivory limewashed wall, sunlight entering from the upper left with soft architectural shadows, low dark walnut console along bottom 12% of composition, small sculptural matte ceramic vase with one delicate dried branch at far bottom left, folded natural linen at bottom right. Leave the middle 75% of the wall EMPTY and evenly lit for a framed artwork to be overlaid in code. Straight-on camera, realistic scale, editorial interiors photography aesthetic, quiet restrained warm brown and parchment palette, tactile subtle natural surfaces, polished and serene. Portrait 2:3 composition. No framed art, no pictures, no wall decorations, no text, no lettering, no logo, no watermark. Illustrative generated interior, no claims of real product photography.”

## Checks

The 49 existing tests pass, covering pricing, quotes, private assets, rendering, approval, payment evidence, and access control. TypeScript and production build are checked. Browser verification uses an agent-created draft and a real server-generated test quote; no order is submitted and no payment is made. Desktop and mobile checks cover the landing artwork, checkout summary, pricing disclosure, required fields, total, and draft return link. Screenshots are saved under `docs/previews/premium-*`.
