-- PostgreSQL row locks also consult UPDATE policies. Permit an owner to lock
-- visible assets for snapshot creation; the trigger forbids guest mutations.
CREATE POLICY lock_own_assets ON art.assets FOR UPDATE TO art_app
 USING(owner_id IN (SELECT id FROM art.sessions) OR EXISTS(SELECT 1 FROM art.order_assets oa JOIN art.orders o ON o.id=oa.order_id WHERE oa.asset_id=assets.id))
 WITH CHECK(owner_id IN (SELECT id FROM art.sessions) OR EXISTS(SELECT 1 FROM art.order_assets oa JOIN art.orders o ON o.id=oa.order_id WHERE oa.asset_id=assets.id));
CREATE FUNCTION art.lock_asset() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN
 IF current_setting('art.role',true)='guest' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Customer upload records are immutable'; END IF;
 IF (to_jsonb(NEW)-'archived') IS DISTINCT FROM (to_jsonb(OLD)-'archived') THEN RAISE EXCEPTION 'Upload content and ownership are immutable'; END IF;
 IF NEW.archived AND NOT OLD.archived AND EXISTS(SELECT 1 FROM art.order_assets WHERE asset_id=OLD.id) THEN RAISE EXCEPTION 'Ordered uploads cannot be archived'; END IF;
 RETURN NEW;
END$$;
CREATE TRIGGER asset_snapshot_guard BEFORE UPDATE ON art.assets FOR EACH ROW EXECUTE FUNCTION art.lock_asset();
DROP POLICY attach_order_asset ON art.order_assets;
CREATE POLICY attach_order_asset ON art.order_assets FOR INSERT TO art_app WITH CHECK(
 EXISTS(SELECT 1 FROM art.orders o WHERE o.id=order_id AND
  ((o.design#>'{memory,photos}') @> jsonb_build_array(jsonb_build_object('assetId',asset_id::text)) OR o.design#>>'{memory,map,assetId}'=asset_id::text))
 AND EXISTS(SELECT 1 FROM art.assets a WHERE a.id=asset_id AND a.owner_id IN (SELECT id FROM art.sessions) AND NOT a.archived)
);
