CREATE ROLE art_app NOLOGIN;
CREATE SCHEMA art;
REVOKE ALL ON SCHEMA art FROM PUBLIC;
GRANT USAGE ON SCHEMA art TO art_app;
CREATE TABLE art.sessions(id uuid PRIMARY KEY,token_hash text UNIQUE NOT NULL,expires_at timestamptz NOT NULL);
CREATE TABLE art.quotes(id uuid PRIMARY KEY,owner_id uuid NOT NULL REFERENCES art.sessions,design jsonb NOT NULL,design_hash text NOT NULL,price jsonb NOT NULL,expires_at timestamptz NOT NULL,UNIQUE(id,owner_id));
CREATE TABLE art.orders(id uuid PRIMARY KEY,owner_id uuid NOT NULL REFERENCES art.sessions,quote_id uuid UNIQUE NOT NULL,design jsonb NOT NULL,design_hash text NOT NULL,price jsonb NOT NULL,payment text NOT NULL DEFAULT 'pending' CHECK(payment IN ('pending','captured','partially_refunded','refunded')),production text NOT NULL DEFAULT 'blocked' CHECK(production IN ('blocked','queued','hold')),fulfillment text NOT NULL DEFAULT 'unbooked',tracker text UNIQUE,checkout_url text,checkout_state text NOT NULL DEFAULT 'new',proof_hash text,proof_pdf bytea,approved_hash text,render_error text,created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(quote_id,owner_id) REFERENCES art.quotes(id,owner_id),UNIQUE(id,owner_id));
CREATE TABLE art.events(id text PRIMARY KEY,order_id uuid NOT NULL REFERENCES art.orders,type text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE art.journal(id text PRIMARY KEY,order_id uuid NOT NULL REFERENCES art.orders,debit bigint NOT NULL CHECK(debit>0),credit bigint NOT NULL,CHECK(debit=credit),kind text NOT NULL);
CREATE TABLE art.jobs(id uuid PRIMARY KEY,order_id uuid NOT NULL REFERENCES art.orders,kind text NOT NULL,status text NOT NULL DEFAULT 'pending',attempts int NOT NULL DEFAULT 0,lease_until timestamptz,lease_token uuid,error text,UNIQUE(order_id,kind));
CREATE TABLE art.production_jobs(order_id uuid PRIMARY KEY REFERENCES art.orders,print_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE art.audit(id uuid PRIMARY KEY,order_id uuid REFERENCES art.orders,actor text NOT NULL,action text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA art TO art_app;
REVOKE UPDATE ON art.quotes,art.journal,art.events,art.production_jobs,art.audit FROM art_app;
DO $$DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['sessions','quotes','orders','events','journal','jobs','production_jobs','audit'] LOOP
 EXECUTE format('ALTER TABLE art.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY ops ON art.%I TO art_app USING (current_setting(''art.role'',true)=''ops'') WITH CHECK (current_setting(''art.role'',true)=''ops'')',t);
 END LOOP;
END$$;
CREATE POLICY guest_session ON art.sessions TO art_app USING(id::text=current_setting('art.owner',true));
CREATE POLICY guest_quotes ON art.quotes TO art_app USING(owner_id::text=current_setting('art.owner',true)) WITH CHECK(owner_id::text=current_setting('art.owner',true));
CREATE POLICY guest_orders ON art.orders TO art_app USING(owner_id::text=current_setting('art.owner',true)) WITH CHECK(owner_id::text=current_setting('art.owner',true));
CREATE POLICY guest_render ON art.jobs FOR INSERT TO art_app WITH CHECK(kind='render' AND EXISTS(SELECT 1 FROM art.orders o WHERE o.id=order_id AND o.owner_id::text=current_setting('art.owner',true)));
CREATE POLICY guest_audit ON art.audit FOR INSERT TO art_app WITH CHECK(actor=current_setting('art.owner',true) AND EXISTS(SELECT 1 FROM art.orders o WHERE o.id=order_id AND o.owner_id::text=current_setting('art.owner',true)));
