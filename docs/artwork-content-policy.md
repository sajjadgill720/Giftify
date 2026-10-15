# Places and things policy

New customer photo uploads require explicit agreement to `places-and-things-v1` in the editor and the `x-artwork-policy` request header. The API rejects missing or outdated declarations before reading image bytes. The server records the declaration version and timestamp in private asset source metadata.

Allowed: trees, plants, landscapes, buildings, places, and inanimate objects. Not accepted: people, portraits, selfies, weddings, pets, or other animals.

This is a customer declaration, not automated visual classification. A false declaration can bypass the subject restriction. Image recognition is not configured and customer uploads are not sent to an external AI service. Existing uploads and saved orders are retained; they have not been retrospectively screened. Operators must check content before production. Automatic detection and a mandatory audited content-review release gate remain separate implementation work.

Existing template IDs and saved design formats are preserved. Display names and sales descriptions now describe nature, architecture, and still-life collections.
