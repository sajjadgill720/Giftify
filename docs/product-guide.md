# Consumer product guide

## Local review

Run `npm run setup:dev` and `npm run dev`. The development launcher reads APP_URL from root `.env` and chooses that port. This workspace uses http://localhost:3011 because another project occupied port 3000. The generated local operations credential is in the ignored `.env`; it is never printed by setup or the configuration doctor.

Explore `/shop`, choose a product, and open its studio. Personalize and save a draft, select size/finish, review details, and request a quote. Checkout validates recipient details and consent. Without Safepay credentials, the explicit **Save order & review proof** path creates an unpaid order, prepares its private PDF, and takes the buyer to the order page. Payment remains pending. Review the exact PDF and approve it, request a wording revision, or contact support.

`/orders` lists the current purchaser's orders/drafts. `/account` supports real configured Supabase authentication and guest linking; its sign-in is visibly unavailable without configuration. Guest access is seven days. A claimed session requires the corresponding verified customer identity, and an authenticated customer can access previously linked records from another owned device.

## Operations

Open `/ops/orders` and sign in using the development credential. Queue filters and counts derive from the latest loaded records. Select an order to inspect its proof, address, support requests, workflow and audit trail. Reply to requests or prepare the included wording revision. The original purchase remains immutable, and old/new PDFs are retained privately.

Release requires captured provider-verified test funds, exact proof approval, confirmed address, and no open revision/refund request. A queue release does not send a supplier order. Later stages require actual evidence. Courier updates require a stable carrier/reference and permitted transitions; a delivered state cannot be created directly from an unbooked order.

In production, development credentials are rejected. Configure Supabase users with verified TOTP factors and app metadata `{ "role": "ops" }` or `{ "role": "admin" }` using a trusted administrative process. Never use editable user metadata for authorization. Consumer registration requires reviewed email-confirmation and SMTP settings; none have been exercised without credentials.

## Integration setup

- Safepay: SAFEPAY_SECRET_KEY, SAFEPAY_PUBLIC_KEY, SAFEPAY_WEBHOOK_SECRET, PAYMENT_MODE=sandbox, public HTTPS APP_URL and subscribed version 2.0.0 payment events. Live endpoints remain disabled. Webhooks persist to a durable inbox; the external worker performs reconciliation. Local order reads process that order's inbox in embedded development mode.
- Supabase Auth: SUPABASE_URL and SUPABASE_ANON_KEY, reviewed redirect URLs, email confirmation/SMTP and named operations MFA/roles. No credentialed authentication has been claimed as verified.
- Private proof mirror: SUPABASE_SERVICE_ROLE_KEY and SUPABASE_STORAGE_BUCKET; bucket must be private. The key is server-only and uploads use checksum-derived keys without accepting arbitrary URLs.
- PostgreSQL: separate runtime DATABASE_URL and privileged MIGRATION_DATABASE_URL. Apply migrations 001–006 with `npm run db:migrate`, then run web and `npm run worker` separately. Development may use one persistent PGlite process; do not run another process on the same directory concurrently.

`npm run doctor` reports environment-variable presence only, without secrets. It does not certify provider acceptance or launch readiness.

## Validation

`npm test` checks isolated in-memory PostgreSQL with the non-owner runtime role. Fixtures cover account/guest isolation and claims, draft ownership, money tampering/expiry, replay, exact PDF approval/revision, production and courier transitions, refunds and leases. No successful payment/shipment fixture is inserted into the running product.

`npm run smoke` verifies the local base purchase boundary. `npm run smoke:product` exercises routes, draft ownership, confirmed checkout details, unpaid proof, operator sign-in, support revision and approval invalidation, blocked production/shipment, and logout. These scripts create clearly labelled unpaid fixture records in local development. Do not run them against a live environment.

## Still required before live launch

Credentialed integration acceptance; reviewed tax/final-price policy; qualified supplier and courier contracts; physical dimension/color/bleed and Urdu print checks; independent backup/restore drill; retention/deletion jobs and reviewed policies; deployment secrets, durable rate limiting/monitoring; provider fees/settlement reconciliation and operational staffing. Corporate recurrence still requires paid pilots and renewal evidence.
