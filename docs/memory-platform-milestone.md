# Memory platform: first audited extension

Read the [requirement audit](memory-platform-audit.md) for the complete status matrix. This milestone preserves the existing working consumer and operator flow and extends it; it does not deliver all 25 sections of the master specification.

## Delivered behavior

- Seven products across Milestone Art and Coordinates & Stories. The new coordinates product supports bounded latitude/longitude, decimal or degrees/minutes/seconds, three palettes, two typography treatments, names/message/date, A4/A3 and the existing frames.
- The shared validated v3 coordinates layout generates browser previews and deterministic physically sized PDFs. Existing v1/v2 products and purchased JSON snapshots are preserved. Coordinate changes require a new purchase; the included revision changes wording only.
- New storefront feature, category filtering and coordinate-specific editor controls. This is a physical framed-print product, not a digital-download listing.
- Bounded 50-step undo/redo and 1.2-second debounced private autosave. Slider/keystroke state stays local; draft updates require the last server revision. Conflicts return 409 and pause autosave rather than overwrite. Local edits remain available after a failed save. Server saves in one editor are serialized.
- Draft archive from My keepsakes, duplicate draft, and copy/reorder an owned order into a new editable draft. Archiving is soft deletion, not full privacy erasure. It cannot change an order snapshot.
- Customer proofs are watermarked, metadata-stripped JPEGs capped at 640 × 640. There is no customer PDF/download control. The old `?download` request is denied. Ordinary order JSON contains no production PDF, storage key, raw SVG or tracker.
- Authenticated operators can download the current production PDF only for a captured, approved order without a hold or unresolved revision/refund request. The stored bytes must match the approved checksum. Every export inserts immutable operator/revision/template/version/format/checksum/dimension/timestamp metadata and an audit entry. Operations shows export history after refreshing the order.

## API changes

| Route | Behavior |
| --- | --- |
| `GET /api/catalog` | Includes the v3 coordinates product. |
| `POST /api/quotes` | Validates the coordinates model; authoritative provisional price snapshot. |
| `POST /api/drafts` | On update, requires `id`, `revision`, `design`; returns the incremented revision. Stale/unavailable writes return 409. |
| `POST /api/drafts/:id/archive` | Requires current revision and owner authorization. |
| `POST /api/orders/:id/duplicate` | Copies an owned current artwork into a new draft, without changing the order or recording payment. |
| `GET /api/orders/:id/proof` | Private lower-resolution watermarked JPEG; download query denied. |
| `GET /api/ops/orders/:id/proof` | Authenticated review JPEG. |
| `GET /api/ops/orders/:id/export` | Authenticated, financially gated, checksum-checked production PDF attachment; export audited. |
| `GET /api/ops/orders/:id` | Includes export metadata for the workbench. |

Approval remains bound to the production checksum **and revision**, while the customer reviews a derivative from the same layout specification. The derivative is generated from the shared structured layout, not by rasterizing the stored PDF; fonts can differ slightly between SVG rasterization and PDF rendering. Printer acceptance and font consistency still require validation. Browser-visible previews can be captured. Previously downloaded PDFs cannot be revoked.

## Migrations and storage

Apply `007_production_exports.sql` and `008_draft_revisions.sql` after 001–006. Migration 007 adds the append-only ops-only RLS export ledger; 008 adds optimistic draft revisions. No existing rows are dropped or purchased designs rewritten.

Production bytes remain private in Postgres and may be mirrored to the configured private Supabase bucket. This milestone does not add original photo storage. Exports stream through the authenticated API rather than issuing a public or reusable storage URL. Short-lived Supabase export URLs are not implemented or needed for this authenticated streaming path.

## Main changed components

Domain: design schema/catalog, coordinate formatting, editor history, optimistic draft workflow and export authorization/ledger. Rendering: shared v3 coordinates layout, PDF background and bounded Sharp JPEG derivative. Web: API handler, studio/coordinate controls, collection, home, order proof view, My keepsakes and operations export controls. Database: migrations 007/008. Tests: memory-platform integration suite and extended HTTP smoke.

Sharp is an explicit pinned dependency, used only on the server for trusted internally generated SVG. Its official [resize](https://sharp.pixelplumbing.com/api-resize/) and [output](https://sharp.pixelplumbing.com/api-output/) documentation was consulted. Arbitrary uploaded SVG, external image URLs and customer images remain rejected/unimplemented.

## Configuration and deployment

No new credentials are required for coordinates or local proof derivatives. Continue using root `.env.example`: APP_URL, DATABASE_URL, MIGRATION_DATABASE_URL, Safepay sandbox keys, Supabase auth/storage settings, and development-only OPS_TOKEN. Secrets remain server-only.

Local: `npm ci`, `npm run setup:dev`, `npm run dev`; this workspace uses port 3011. Local migrations are automatic within the web process. Production: provision external Postgres, apply `npm run db:migrate` using the migration connection, build with `npm run build`, start `npm run start -w apps/web` with a matching HTTPS APP_URL, and run `npm run worker` separately. Configure verified Supabase accounts and named operator MFA before production access; local keys are disabled in production. Keep `art` excluded from public Supabase APIs. Do not start a second PGlite process against the active local database.

## Verification

- `npm run typecheck`: passed.
- `npm test`: 31 tests passed after security/draft changes. Subsequent visual-size refinement checked again before delivery.
- `npm run build`: passed, all existing routes compiled.
- `npm run smoke:product`: passed, including coordinates checkout, bounded JPEG, denied production downloads, admin unpaid-export denial, draft conflicts/archive/copy, private ownership and revision/fulfillment guards.
- Browser review: coordinates inputs, theme changes, undo/redo, private save and reload restoration; desktop and mobile layout checks recorded with the final preview.
- Provider success fixtures exist only in isolated in-memory tests. Local smoke orders remain unpaid. No live payment, refund execution or shipment was simulated.

## Remaining work

The map, photo/collage and historically calculated sky categories remain missing, not credentialed features waiting behind completed UIs. Admin-managed catalog/templates/inventory, explicit physical SKUs, multi-item cart, configurable paper/mats, international taxes/shipping, email confirmation of orders, complete retention/deletion and production observability also remain open. Map licensing, Safepay/Supabase acceptance, supplier samples, print/color/font/bleed validation and recovery drills remain launch gates. Corporate subscriptions stay deferred.
