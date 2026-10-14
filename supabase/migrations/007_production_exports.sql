CREATE TABLE art.production_exports (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES art.orders,
  revision int NOT NULL,
  template text NOT NULL,
  template_version int NOT NULL,
  format text NOT NULL CHECK(format='pdf'),
  checksum text NOT NULL,
  width_mm int NOT NULL,
  height_mm int NOT NULL,
  actor text NOT NULL,
  status text NOT NULL CHECK(status='ready'),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(order_id,revision) REFERENCES art.proof_history(order_id,revision)
);
CREATE INDEX production_exports_order ON art.production_exports(order_id,created_at);
ALTER TABLE art.production_exports ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT ON art.production_exports TO art_app;
CREATE POLICY ops ON art.production_exports TO art_app
 USING(current_setting('art.role',true)='ops')
 WITH CHECK(current_setting('art.role',true)='ops');
