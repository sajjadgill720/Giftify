Area	What’s missing before launch
Live payments	The payment adapter hardcodes Safepay’s sandbox and rejects live mode. It needs implementation changes, merchant setup, and verified payment/refund tests.
Deployment instructions	A complete production runbook: hosting, domain/HTTPS, environment variables, web start command, separate worker, automatic restarts, and rollback procedure.
Database and storage	Verified production PostgreSQL, migrations 001–011, least-privilege credentials, private photo storage, and a tested backup/restore process.
Accounts and admin	Tested Supabase sign-in, confirmation emails, redirect URLs, and named admin accounts with MFA.
Pricing and fulfillment	Final supplier-approved prices, tax/shipping rules, frame specifications, physical print samples, and a documented manual fulfillment process.
Print readiness	Confirmed bleed, color handling, and font rendering. The README currently documents Helvetica-only PDFs and blocked non-ASCII printing.
Operational protection	Shared rate limiting, monitoring, error alerts, worker health checks, upload retention/deletion, and storage cleanup.
Customer communication	Documented and tested order confirmation, proof approval, production, shipping, and support notifications.
Maps	Provider credentials, verified outputs, and confirmed commercial print rights—or keep maps unavailable at launch.
Launch acceptance	A staging checklist covering a complete purchase, webhook retries, refunds, private uploads, proof approval, admin export, and recovery.


There is also a README contradiction: the “Memory platform audit” section says photo/collage uploads remain open, while the next section correctly describes them as implemented. Older milestone counts and statuses also need reconciliation.
The most urgent work is live payments, production infrastructure, print/supplier validation, and a verified end-to-end order. The visual design can be deployed for preview now; accepting paid customer orders needs those gates completed.