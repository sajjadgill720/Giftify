# 001 — Consumer foundation, 6 October 2026

The workspace was empty. User authorization extends to technical prerequisites and first consumer commerce slice; the supplied document's Phase 0 sequencing does not override that request. Business subscriptions, CSV recipients, calendars, maps, upload/media and supplier integrations remain deferred.

Use Next.js/React and shared TypeScript domain/rendering/integration code, PostgreSQL and a separate Node worker as specified. Local embedded PostgreSQL is a development convenience because Docker/PostgreSQL were not installed; external PostgreSQL uses the same migration and SQL. This is not a production database substitution. Rendering in the local web process is limited to this small fixture-only pilot; the external deployment uses the durable worker.

Start with six original milestone palette templates and two size/finish variants. Do not represent decorative lines as real cartography. English vector PDF export is implemented; bilingual export is blocked until font shaping and print fidelity are verified. Approval binds stored PDF bytes and SHA-256. Designs are immutable once quoted; a new customization requires a new quote, rather than overwriting an approved order.

Guest purchase ownership uses hashed 256-bit, seven-day credentials in an HttpOnly SameSite cookie. Server-authorized PostgreSQL transactions switch to the non-owner art_app role. Private schema grants and RLS provide defense in depth. Account claiming and corporate tenancy are deferred; there is no shared consumer tenant.

Use Safepay's sandbox Express Checkout contract. Source: https://safepay-docs.netlify.app/build-your-integration/express-checkout/ and HMAC/webhook docs. Reconcile the saved tracker against the authenticated provider response before funding; never trust a redirect. No fake payment buttons are shipped. Tests inject verified-event fixtures at the domain boundary only. Production payment mode is disabled.

Current limitations are explicit: guest-only identity, temporary named-ops replacement credential, no addresses/shipments, private PDF bytes in database instead of object storage, no completed refunds, no launch-grade backup/monitoring, and provisional tax/materials. A manual production queue is not supplier acknowledgement, shipment, or completed fulfillment.
