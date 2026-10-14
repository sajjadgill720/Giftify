# Memory platform audit

Audit date: 2026-10-14. Baseline: the existing Keepsake repository and all 1,349 lines of the supplied master specification. The two screenshots are visual references, not licensed product assets. This is an extension of the existing application, not a replacement project.

## Baseline evidence and gaps

| Specification area | Before this milestone | Evidence / remaining work |
| --- | --- | --- |
| Architecture and routing | Implemented | Next.js App Router, React, strict TypeScript; shared domain, rendering, integration packages and worker. |
| Editorial storefront and responsive design | Implemented for milestone art | Cream/sage/wood styling, product pages, collection search and occasions, keyboard controls, reduced motion. Real customer reviews and licensed lifestyle photography are absent. |
| Categories and catalog management | Missing | Six source-defined milestone templates. No admin category/product/template publishing or inventory UI. |
| Location maps | Missing | No provider, geocoding, map interactions, licensed print data, or production map renderer. Provider export rights must be validated before sale. |
| Historical star maps | Missing | Orbit is abstract artwork, not an astronomical map. No star catalogue, time-zone resolution, historical calculations or validation fixtures. |
| Photo frames and collages | Missing | No secure customer-upload endpoints, decoded-image validation, private asset lifecycle, crop/layout editor, resolution validation or image rendering. |
| Coordinates and typography | Missing | Added as the first new end-to-end category in this milestone; see completion record below. |
| Personalization | Partial | Three-step text/size/frame editor, local restoration, explicit private draft save. Missing undo/redo, server autosave conflict protection, image/map controls and three-panel/bottom-sheet layout. |
| Versioned rendering | Implemented for existing products | Validated immutable design snapshots; v1/v2 shared vector layout; A4/A3 physical PDF dimensions; bounded durable render leases. No CMYK, bleed, embedded bilingual fonts or printer acceptance. |
| No customer downloads | **Failed** | Owned customer `/proof` returned the production PDF including a download option. Corrected in this milestone. Previously exposed files cannot be recalled. |
| Admin exports | Partial | Authenticated proof access and operations workbench existed; export-specific immutable metadata and paid/approved gating added here. |
| Physical variants | Partial | A4/A3, black/oak-effect frames and provisional server prices. No explicit SKU/inventory/weight/cost/paper/mat model, other frame finishes or supplier-validated combinations. |
| Frame preview | Partial | Original reusable CSS frames/room scene preserve artwork proportions. No licensed bedroom/desk/living-room photo mockups. |
| Cart | Missing | One immutable quoted design per checkout; not a multi-item cart. |
| Payments | Integration implemented, unverified externally | Safepay sandbox adapter, signed webhook inbox, provider reconciliation, replay-safe postings and cumulative refunds. Credentials absent; no live or sandbox success fabricated. |
| Order workflow | Implemented for pilot | Private order history, exact revision/hash approval, one wording revision, release guards, evidence-based production stages and manual carrier updates. No courier purchase API. |
| Customer identity | Integration implemented, unverified externally | Supabase confirmed email/password, guest ownership, account linking, refreshed secure cookies and object-level RLS. Missing password recovery and saved-address management. |
| Customer draft lifecycle | Partial | Save/resume existed. Archive/delete and duplicate/reorder draft actions added here; upload deletion remains unimplemented. |
| Operator identity | Integration implemented, unverified externally | Verified Supabase app-metadata role and AAL2/TOTP. Local hashed-cookie access is development-only. Production MFA enrollment requires trusted setup. |
| Storage | Partial | Optional private Supabase proof mirror, checksum keys and server-only credentials; DB proof bytes remain primary. No original photo/derivative storage yet. |
| Security | Partial | Origin checks, strict inputs, private responses, ownership RLS, immutable financial/design data, no exposed provider secrets. In-memory rate limits need a shared limiter for multiple replicas. |
| International commerce | Missing | PKR and four Pakistan pilot cities only, provisional tax and shipping. No international rates, tax engine or transactional order email integration. |
| Privacy and retention | Partial | Privacy page and private access; no automated retention, full account deletion or consent-backed customer gallery. |
| Performance/operations | Partial | Local editing, async external DB worker, bounded leases/retries. No production metrics, distributed cache invalidation or complete deployment/restore/retention validation. |
| Tests | Existing 24 baseline tests | In-memory Postgres-compatible integration tests cover ownership, rendering, money, revisions and fulfillment; HTTP smoke scripts exercise the local app. New tests added for this milestone. |

## Reused architecture

Keep `apps/web`, `apps/worker`, `packages/domain`, `packages/rendering`, `packages/integrations`, Safepay, Supabase, the guest/account ownership model and existing order routes. Persistent local PGlite is single-process development storage. Production uses external Postgres with explicit migrations and a separate worker. Do not run the worker against the active local PGlite directory.

## Implementation sequence

1. Close customer production-file exposure; provide bounded watermarked JPEG proofs and audited admin-only exports.
2. Add a versioned coordinates design using the existing quote, draft, render, approval and fulfillment path. Preserve historical templates.
3. Add undo/redo, conflict-safe debounced autosave, draft archive and copy-from-order actions.
4. Add admin-managed categories, published template versions and explicit physical variants before broadening inventory.
5. Build private image upload/derivative storage and crop/quality validation, then photo purchase flow.
6. Integrate licensed geocoding/map printing; add calculated sky maps with independent astronomical fixtures.
7. Add multi-item cart, shipping zones, customer emails and operational hardening. Keep subscriptions and advanced corporate features deferred.

## External setup and launch gates

- Safepay sandbox public/secret/webhook keys; test signed events and provider checkout recovery. Live mode remains prohibited by the current adapter.
- Supabase URL/anon/server storage keys, private bucket, external Postgres runtime/migration roles, confirmed email and named operator MFA setup.
- A map provider/data licence explicitly covering commercial print exports, attribution and cache retention; no generic tile licence assumed.
- Printer-accepted substrate, frame materials, dimensions, bleed, color and fonts; provisional pilot prices are not validated live commercial pricing.
- Private photo storage configuration, resource-limited image decoding and cleanup before enabling uploads.
- Real supplier/courier accounts, shipping evidence, tax configuration, email provider and production backup/restore validation.

## Completion record

Updated after implementation and verification in this milestone. This document is the requirement matrix; `memory-platform-milestone.md` records the delivered APIs, migration, tests and exact limitations. The full master specification is **not** implemented and the platform is **not** production-ready.

## Later photo extension

The baseline matrix above describes the earlier audit. The subsequent [photo and memory extension](photo-memory-extension.md) implements private uploads, normalized previews/print images, crop/zoom/rotation/filters, seven additional orderable memory/photo categories and a credential-gated special-place category. It reuses the existing quote/payment/approval path and adds immutable asset references and audited admin originals. Map search/static export has an adapter and UI but still requires genuine provider and licence acceptance. Catalog inventory management, multi-item cart, stars, full retention/erasure and launch validation remain open.
