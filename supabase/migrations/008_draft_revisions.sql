ALTER TABLE art.drafts ADD COLUMN revision int NOT NULL DEFAULT 0 CHECK(revision >= 0);
