# Photo and memory experience

This extends the existing Next.js application, shared design renderer, guest/account ownership, private drafts, Safepay test checkout, proof approval and operations workbench. Earlier milestones remain historical records; this document describes the current photo extension.

## Customer experience

The homepage introduces the four-step journey and eight memory categories: photo, couples, family, birthdays, pets, travel, written memories and special places. A working homepage demo accepts a private photo or a written story and saves it into the existing studio.

The studio keeps uploaded content when changing categories or switching photo/place/words modes. Photographs can be cropped using accessible horizontal/vertical controls, zoomed, rotated in quarter turns, replaced, removed from the current design, and given original, black-and-white or warm filters. The family design supports up to four photos; pet portraits use a circular crop; couples have a romantic accent; birthdays include name/age; travel includes destination; a written-memory layout needs no image. Names, message, date and location remain editable. Two physical frame finishes and A4/A3 remain the validated pilot configuration; no new supplier inventory is invented.

Advanced crop/filter and layout/font/palette controls are expandable. Four background palettes, two managed font treatments, and front/wall/shelf settings provide immediate local previews. Wall and shelf scenes are reusable CSS compositions, not licensed room photography. Mobile controls retain labels, keyboard alternatives, reduced motion and sticky purchase actions.

Autosave, undo/redo, private draft restoration, copy/reorder, revision checks and the existing server pricing remain in use. A template switch preserves photos and other content; only the chosen layout elements are printed. Hidden photos retained in the design stay private and attached to its immutable order snapshot.

## Storage and security

Migration 009 adds `art.assets` and immutable order/asset references. Migrations 010/011 enforce asset immutability, row locking, snapshot membership and non-recursive purchaser ownership policies. Existing verified-account session grouping provides cross-device access. Apply migrations **001–011** for deployment; existing data is preserved.

Uploads accept genuine JPEG/PNG only, up to 8 MB and 24 million decoded pixels, one image per file. Signature and image decoding are checked independently of MIME or filenames. At most two uploads decode concurrently per process, with a per-purchaser rate limit and a 50-item pilot library limit. Multi-replica deployments still require shared abuse limits and an operational storage quota.

Each image stores an original, an oriented normalized JPEG and a separate preview capped at 640 pixels. Originals can retain sensitive EXIF information and are available only through audited operator order downloads. Metadata is stripped from normalized print images and previews. Storage keys and normalized/original bytes are never returned in customer asset APIs. File keys are generated UUID paths, not customer filenames or arbitrary URLs.

Local development uses `.local/private-assets`, outside public web folders. Production uploads require `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_STORAGE_BUCKET`; bucket privacy is checked server-side. There is no production fallback to local public storage. `ASSET_STORAGE_ROOT` is a development/test override, not a production bypass. The `art` schema must remain excluded from public Supabase APIs.

The renderer checks the normalized source checksum, uses a shared physical layout and crop model, and decodes originals sequentially to bound memory. Rotation and extraction share one image pipeline without an intermediate lossy JPEG. Final files retain native image resolution, capped for resource safety; they are not silently enlarged. Crops below 100 DPI cannot be ordered; below the 300 DPI target require acknowledgement, including after a size change. Pixel dimensions cannot establish whether a photograph was already upscaled before upload.

Customers see bounded JPEG proofs and low-resolution photo derivatives. They have no final PDF/original endpoint or download control. Admin print exports continue to require captured payment, current hash/revision approval and no unresolved hold/revision/refund; every export is audited. New payment sessions wait for a render-ready proof. Existing provider trackers retain their reconciliation path. Names, captions, age and written-memory wording can use the included operator revision; assets, crop, colors, layout, format and geography require a new quote. Original purchases and previous proof revisions stay immutable.

Browser-visible previews can still be captured. Original uploads are not publicly shared, added to galleries or sent to AI services. Draft removal does not erase order assets. Complete retention/erasure, orphan recovery after process crashes, storage lifecycle policy and production restore drills remain launch work.

## Endpoints

| Endpoint | Access and behavior |
| --- | --- |
| `POST /api/assets` | Authenticated purchaser session, origin checked; bounded binary JPEG/PNG upload. |
| `GET /api/assets` / `GET /api/assets/:id` | Owner/account-group metadata only. |
| `GET /api/assets/:id/preview?rotation=90` | Private low-resolution derivative; rotations restricted to quarter turns. |
| `GET /api/ops/orders/:order/assets/:id` | Verified operator, asset must belong to this order. |
| `GET /api/ops/orders/:order/assets/:id/preview` | Operator review derivative. |
| `GET /api/ops/orders/:order/assets/:id/original` | Operator-only attachment; access audited. |
| `POST /api/places/search` | Purchaser-only, configured provider and licence gate, bounded query and results. |
| `POST /api/places/map` | Frozen private map snapshot from validated coordinates/style/zoom; no arbitrary host or image URL. |

## Maps: configuration still required

Set `MAPTILER_API_KEY` and `MAP_PRINT_LICENSE_CONFIRMED=true` only after the business has confirmed commercial print/resale, attribution and stored-export rights for the intended provider/styles. Restart the application after configuration. A paid API plan does not by itself establish all the rights required by this product. The adapter follows MapTiler’s [geocoding](https://docs.maptiler.com/cloud/api/geocoding/) and [static image](https://docs.maptiler.com/cloud/api/static-maps/) APIs. It uses fixed provider hosts, timeouts, bounded responses and private snapshots. Style IDs must be enabled and verified in the configured account.

Search is explicit rather than a request on every keystroke. Selected coordinates can be fine-tuned, neighborhood zoom and style adjusted, and a saved map applied to the artwork. Heart/pin/none markers use shared vector geometry. An optional photo can overlay the map; attribution remains in the print layout. No random map-like drawing is passed off as a real place. Photos/messages are not sent to MapTiler; search terms and map coordinates are sent when the customer requests those actions. Privacy copy states this.

Without configuration, map requests return 503 and the editor clearly offers photo or written memories. No credentialed MapTiler output was obtained or verified in this workspace. Free-form uploaded custom markers, gesture-based map panning and arbitrary color styling of provider layers are not implemented.

## Verification and review

`npm test` includes the original 31 tests plus photo tests for decoded uploads/EXIF, private access, schema and crop bounds, resolution acknowledgement, distinct category rendering, photo-to-order/PDF integration, original-download auditing, immutable assets and name corrections, payment waiting for rendering, missing map setup and corrupt-source holds. Actual provider calls are mocked only in isolated tests; no payment or shipment success is inserted into the app.

`npm run smoke:photos` generates a clearly labelled illustration, performs a real local private upload, saves a draft, creates a quote and unpaid order, verifies its JPEG proof, tests other-customer denial and admin originals, and denies unpaid PDF export. It refuses non-local targets or configured payment credentials. `npm run smoke:product` preserves the earlier coordinates, revision and fulfillment checks.

Browser review uses the generated illustration, not a customer photograph: upload, category switching without photo loss, wall setting, filter and rotation, private autosave, review and desktop/mobile layout. The generated fixture remains ignored under `.local/ui-fixtures` and is never a testimonial or public customer gallery entry.

Deployment retains the existing external Postgres/worker instructions. Apply migrations with the privileged migration connection, build the web app, provision private Supabase storage and named operator MFA, and run the worker separately. Keep Safepay in sandbox and validate genuine provider events before launch. Print color/font/bleed, physical frame materials, tax and fulfillment validation remain open. This is still a test store, not a production launch certification.

Final verification for this extension: 39 automated tests passed; TypeScript and the production build passed. The local photo and earlier product HTTP smoke checks passed. Browser checks confirmed a real private upload, preserved content across category changes, filter/rotation controls, a loaded 640-pixel-or-smaller derivative, and no horizontal overflow at a 390-pixel mobile viewport. Live map/provider transactions and cloud storage acceptance remain unverified without credentials.
