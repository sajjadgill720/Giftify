ALTER TABLE art.orders ADD COLUMN approved_revision int;
UPDATE art.orders SET approved_revision=proof_revision WHERE approved_hash IS NOT NULL;
CREATE FUNCTION art.bind_approval_revision() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN
 IF NEW.proof_revision<>OLD.proof_revision AND NEW.approved_hash IS NOT NULL THEN RAISE EXCEPTION 'A revised proof requires new approval';END IF;
 IF NEW.approved_hash IS NULL THEN NEW.approved_revision=NULL;
 ELSIF NEW.approved_revision IS DISTINCT FROM NEW.proof_revision THEN RAISE EXCEPTION 'Approval must match the exact proof revision';END IF;
 RETURN NEW;
END$$;
CREATE TRIGGER bind_approval_revision BEFORE UPDATE ON art.orders FOR EACH ROW EXECUTE FUNCTION art.bind_approval_revision();
