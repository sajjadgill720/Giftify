DROP POLICY guest_session ON art.sessions;
CREATE POLICY guest_session ON art.sessions FOR SELECT TO art_app USING((id::text=current_setting('art.owner',true) AND customer_id IS NULL) OR customer_id::text=current_setting('art.customer',true));
DROP POLICY guest_quotes ON art.quotes;
CREATE POLICY guest_quotes ON art.quotes TO art_app USING(owner_id IN(SELECT id FROM art.sessions)) WITH CHECK(owner_id IN(SELECT id FROM art.sessions));
DROP POLICY guest_orders ON art.orders;
CREATE POLICY guest_orders ON art.orders TO art_app USING(owner_id IN(SELECT id FROM art.sessions)) WITH CHECK(owner_id IN(SELECT id FROM art.sessions));
DROP POLICY own_drafts ON art.drafts;
CREATE POLICY own_drafts ON art.drafts TO art_app USING(owner_id IN(SELECT id FROM art.sessions)) WITH CHECK(owner_id IN(SELECT id FROM art.sessions));
