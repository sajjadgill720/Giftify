-- Assets stay owned by the purchaser session. Verified account session grouping
-- already grants cross-device access; referencing order_assets here would make
-- the order attachment INSERT policy recurse through the asset SELECT policy.
DROP POLICY own_assets ON art.assets;
CREATE POLICY own_assets ON art.assets FOR SELECT TO art_app USING(owner_id IN (SELECT id FROM art.sessions));
DROP POLICY lock_own_assets ON art.assets;
CREATE POLICY lock_own_assets ON art.assets FOR UPDATE TO art_app USING(owner_id IN (SELECT id FROM art.sessions)) WITH CHECK(owner_id IN (SELECT id FROM art.sessions));
