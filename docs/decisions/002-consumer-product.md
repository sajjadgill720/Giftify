# 002 — Consumer product expansion, 14 October 2026

The user authorized moving beyond the foundation into a polished consumer product. Corporate subscriptions, HRIS, recipient campaigns, stored-value wallets, accurate map/sky art, unrestricted uploads, and AI generation remain deferred under the original scope and evidence gates.

## Product experience

Use an original cream/olive editorial design, geometric vector artwork, consistent typography, responsive layouts, native form controls, clear loading/errors, skip navigation, reduced-motion support, and an accessible native preview dialog. Browsing, product details, the three-step studio, checkout, saved keepsakes, account access, proof approval, and support each have their own routes. No stock testimonials, synthetic revenue, fake delivery confirmations, or proprietary competitor assets are used.

Artwork representation version 2 adds six distinct compositions while preserving version 1 rendering for historical purchases. Preview and PDF export consume the same geometry/text representation. English A4/A3 proofs are supported; bilingual print export remains gated on licensed shaping/fonts and physical samples.

## Workflow and ownership

Add private durable drafts, customer support/revision requests, immutable proof history, a single included wording revision, and audited manual production/courier stages. Wording revision preserves the purchased design/specification, clears the existing approval and PDF, and requires approval of the new checksum. Product changes require a new quote. Once production starts, proof changes are blocked.

Supabase consumer Auth supports verified-email sign-in and linking a live guest session. Linking changes an identity association on the purchaser session, never purchased order ownership. The non-owner database role can read the sessions belonging to the verified customer, preserving cross-device access without sharing consumer tenants. Claiming disables standalone guest-token access to the claimed session. Sign-out expires the browser's purchaser token. Provider credentials/email settings must be verified before the account integration is accepted.

Supabase operations Auth requires fresh provider user validation, administrator-controlled app metadata `role` of `ops` or `admin`, and an AAL2 authenticator session. A hashed, expiring local operator session is available only in development with no configured Supabase Auth; it is disabled in production. Operator actions carry their actor in the audit record.

## External side effects

Payment webhooks verify HMAC and merchant/reference/amount before writing a minimal durable inbox, then acknowledge immediately. A worker reconciles captures, applies monotonic cumulative refund snapshots into balanced postings, and retries with leases, fencing tokens, backoff and attempt caps. A refund event holds production immediately. Browser redirects do not post payments; a timed-out tracker creation remains ambiguous until the provider confirms the same order reference and amount.

Optional Supabase private storage mirrors immutable PDF checksums only after checking that the bucket is private. Database bytes remain the primary protected proof for this milestone. This is not a completed backup/restore strategy.

Supplier/courier updates are manual records with authenticated operator evidence and allowed state transitions; they do not call a supplier or carrier API. No success simulation controls are exposed in the product. Financial/shipment success fixtures exist only in isolated in-memory database tests.

## Acceptance boundaries

Local domain, RLS, workflow and HTTP tests verify implemented behavior. Supabase Auth/MFA/SMTP, storage, credentialed Safepay sandbox flows, physical printing/Urdu, tax treatment, supplier/courier terms, deployment, retention jobs and independent backup restore remain launch gates. The implementation must not be represented as a certified live-commerce launch merely because it builds.
