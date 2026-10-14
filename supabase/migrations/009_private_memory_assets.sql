CREATE TABLE art.assets (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES art.sessions,
 kind text NOT NULL CHECK(kind IN ('photo','map')),
 width int NOT NULL CHECK(width>0), height int NOT NULL CHECK(height>0),
 bytes int NOT NULL CHECK(bytes>0), checksum text NOT NULL,
 original_key text NOT NULL, normalized_key text NOT NULL, preview_key text NOT NULL,
 source_metadata jsonb, created_at timestamptz NOT NULL DEFAULT now(), archived boolean NOT NULL DEFAULT false
);
CREATE TABLE art.order_assets(order_id uuid NOT NULL REFERENCES art.orders,asset_id uuid NOT NULL REFERENCES art.assets,PRIMARY KEY(order_id,asset_id));
CREATE INDEX assets_owner ON art.assets(owner_id,created_at);
GRANT SELECT,INSERT,UPDATE ON art.assets TO art_app;
GRANT SELECT,INSERT ON art.order_assets TO art_app;
ALTER TABLE art.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE art.order_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY ops ON art.assets TO art_app USING(current_setting('art.role',true)='ops') WITH CHECK(current_setting('art.role',true)='ops');
CREATE POLICY own_assets ON art.assets FOR SELECT TO art_app USING(owner_id IN (SELECT id FROM art.sessions) OR EXISTS(SELECT 1 FROM art.order_assets oa JOIN art.orders o ON o.id=oa.order_id WHERE oa.asset_id=assets.id));
CREATE POLICY create_asset ON art.assets FOR INSERT TO art_app WITH CHECK(owner_id::text=current_setting('art.owner',true) AND archived=false AND kind='photo');
CREATE POLICY ops ON art.order_assets TO art_app USING(current_setting('art.role',true)='ops') WITH CHECK(current_setting('art.role',true)='ops');
CREATE POLICY own_order_assets ON art.order_assets FOR SELECT TO art_app USING(EXISTS(SELECT 1 FROM art.orders o WHERE o.id=order_id));
CREATE POLICY attach_order_asset ON art.order_assets FOR INSERT TO art_app WITH CHECK(EXISTS(SELECT 1 FROM art.orders o WHERE o.id=order_id) AND EXISTS(SELECT 1 FROM art.assets a WHERE a.id=asset_id AND a.owner_id IN (SELECT id FROM art.sessions) AND NOT a.archived));
