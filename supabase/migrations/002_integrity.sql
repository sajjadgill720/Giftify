ALTER TABLE art.orders ADD COLUMN address jsonb;
ALTER TABLE art.orders ADD COLUMN refunded_amount bigint NOT NULL DEFAULT 0 CHECK(refunded_amount>=0);
ALTER TABLE art.journal ADD COLUMN debit_account text NOT NULL DEFAULT 'provider_clearing';
ALTER TABLE art.journal ADD COLUMN credit_account text NOT NULL DEFAULT 'customer_advances';
ALTER TABLE art.journal ADD CONSTRAINT separate_accounts CHECK(debit_account<>credit_account);
CREATE FUNCTION art.lock_purchase() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN
 IF NEW.owner_id<>OLD.owner_id OR NEW.quote_id<>OLD.quote_id OR NEW.design<>OLD.design OR NEW.design_hash<>OLD.design_hash OR NEW.price<>OLD.price THEN
 RAISE EXCEPTION 'Purchased design, price and ownership are immutable';
 END IF;
 IF OLD.address IS NOT NULL AND NEW.address IS DISTINCT FROM OLD.address THEN RAISE EXCEPTION 'Purchased address is immutable; contact support'; END IF;
 IF current_setting('art.role',true)='guest' AND (NEW.payment<>OLD.payment OR NEW.production<>OLD.production OR NEW.fulfillment<>OLD.fulfillment OR NEW.proof_hash IS DISTINCT FROM OLD.proof_hash OR NEW.proof_pdf IS DISTINCT FROM OLD.proof_pdf OR NEW.refunded_amount<>OLD.refunded_amount) THEN RAISE EXCEPTION 'Operations authorization required'; END IF;
 IF NEW.approved_hash IS NOT NULL AND NEW.approved_hash IS DISTINCT FROM NEW.proof_hash THEN RAISE EXCEPTION 'Approval must match the exact proof'; END IF;
 RETURN NEW;
END$$;
CREATE TRIGGER lock_purchase BEFORE UPDATE ON art.orders FOR EACH ROW EXECUTE FUNCTION art.lock_purchase();
