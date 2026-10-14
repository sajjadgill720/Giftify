import { database, migrate } from "../packages/domain/src/db";
if (process.env.MIGRATION_DATABASE_URL)
  process.env.DATABASE_URL = process.env.MIGRATION_DATABASE_URL;
const db = await database();
await migrate(db);
console.log(
  "Consumer migration applied. Six original templates are versioned in the shared catalog.",
);
await db.close();
