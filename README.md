# Keepsake consumer pilot

An original milestone-art storefront built from [the supplied specification](SPECIFICATION.md). The working slice is catalog → customization → server quote → Safepay sandbox checkout → verified payment → exact PDF approval → manual production queue. There are no live payment or shipment endpoints and no corporate subscriptions.

## Run locally

Node 22 or later is required.

```powershell
npm ci
Copy-Item .env.example .env
npm run db:migrate
npm run dev
```

Open http://localhost:3000. Without DATABASE_URL, the web process uses persistent embedded PostgreSQL (PGlite) in `.local/database` and performs its small test render inline. Do not start multiple embedded database processes simultaneously. Stop the web server before rerunning migrations. `npm test` uses independent in-memory PostgreSQL, not your orders.

```powershell
npm test
npm run typecheck
npm run build
```

## Safepay sandbox setup

Set SAFEPAY_SECRET_KEY, SAFEPAY_PUBLIC_KEY, SAFEPAY_WEBHOOK_SECRET, PAYMENT_MODE=sandbox, and APP_URL in root `.env`. Subscribe sandbox webhook `payment.succeeded` version 2.0.0 to an HTTPS URL ending `/api/webhooks/payments`; subscribe refunds for exception holding. Restart after configuration changes. Use the provider's test cards on its hosted checkout. The adapter hardcodes the sandbox API host and rejects live mode. Credentials missing: checkout creates an unpaid order and proof, returns a visible setup error, and never marks payment successful. Redirects never change payment state. The purchaser can request server-side reconciliation from their order page.

Checkout claims are persisted before external calls. A creation timeout is held as ambiguous and cannot blindly create another tracker. An operator must locate the tracker in Safepay by the order_id metadata, verify the identity and amount, attach it using an audited recovery procedure, and then reconcile. This recovery UI is a later milestone. A stored tracker can reuse checkout authentication without creating a second payment. Quote expiry gates new orders; existing checkout payment reconciliation remains allowed after quote expiry.

## Operations

Generate a random credential with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and set OPS_TOKEN. Visit `/ops/orders` and enter it. The credential is held in browser memory only. This is a local-pilot access adapter; production requires Supabase Auth, named operations roles and MFA. Release needs captured sandbox funds, approval of the exact stored PDF checksum, and render-ready bytes. It queues manual production only. No courier or supplier request occurs.

## PostgreSQL / Supabase foundation

Set DATABASE_URL to a PostgreSQL runtime connection and MIGRATION_DATABASE_URL to a separate privileged migration connection, apply `npm run db:migrate`, and run web and `npm run worker` separately. Use PROJECT_ROOT if the worker runs from a different folder. The `art` schema is private, excluded from exposed Supabase schemas, and has no PUBLIC grants. Every runtime transaction switches to `art_app` and sets server-authorized ownership context. RLS is tested under that non-owner role; composite ownership FKs reject cross-owner quote/order attachment. The migration connection must be allowed to SET ROLE art_app. Deploy a separate least-privilege login granted art_app, and use a privileged connection only for migration. Do not expose SQL connectivity or role-context settings to clients. Supabase Auth account claim, private object-storage migration and deployment hardening remain prerequisites; this guest slice has seven-day hashed cookie credentials.

The worker claims durable jobs with leases, attempt caps and a fencing token. Render bytes are stored privately in PostgreSQL for this small pilot, served only after ownership checks. Supabase private storage is the next asset milestone; arbitrary uploads, URLs, SVG and audio are not accepted. Current PDFs are vector A4/A3 using Helvetica, without printer bleed. Urdu previews are draft browser renderings only; non-ASCII print export is blocked pending licensed font embedding, shaping fixtures and real-print checks. Approval is of the final PDF, not the browser preview.

## External prerequisites and launch gates

- Safepay sandbox credentials, webhook configuration, real sandbox checkout/replay/failure/refund testing and merchant onboarding. No credentialed provider transaction has been verified in this workspace.
- Accountant-approved tax matrix and total-payable policy. Zero sandbox tax is explicitly unconfirmed, not a compliance claim.
- Two supplier contracts, exact frame/paper/outer dimensions, color profile/bleed and inspected samples; configured prices are experiments.
- Licensed map/static-print data before Story Map launch. No invented geography or public OSM tile scraping.
- Supabase project, named Auth roles/MFA, private storage, production rate limiting, backups/restore drill and monitoring before external deployment.
- Privacy/retention terms, refund reconciliation ledger and support workflow before real consumer purchases. Confirmed domestic address/contact snapshots are collected; refund webhooks hold production for operator reconciliation rather than pretending a completed refund.

See [milestones](docs/milestones.md) and [architecture decisions](docs/decisions/001-consumer-pilot.md). The full original plan is preserved in SPECIFICATION.md; only verified implementation work is checked off in the milestone file.

