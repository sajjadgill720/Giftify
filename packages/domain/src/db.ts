import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import { readFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
export const root = path.resolve(
  process.env.PROJECT_ROOT ||
    (process.cwd().endsWith(path.join("apps", "web"))
      ? path.join(process.cwd(), "../..")
      : process.cwd()),
);
try {
  process.loadEnvFile(path.join(root, ".env"));
} catch {}
export interface DB {
  customerId?: string;
  query<T = Record<string, any>>(
    sql: string,
    args?: any[],
  ): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<any>;
  transaction<T>(fn: (db: DB) => Promise<T>): Promise<T>;
  close(): Promise<any>;
}
const state = globalThis as typeof globalThis & {
  keepsakeDatabase?: Promise<DB>;
};
export async function database(): Promise<DB> {
  return (state.keepsakeDatabase ??= connect());
}
async function connect(): Promise<DB> {
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const wrap = (c: any): DB => ({
      query: (s, a) => c.query(s, a),
      exec: (s) => c.query(s),
      close: () => pool.end(),
      transaction: async (fn) => {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const v = await fn(wrap(client));
          await client.query("COMMIT");
          return v;
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
      },
    });
    return wrap(pool);
  }
  await mkdir(path.join(root, ".local"), { recursive: true });
  return new PGlite(path.join(root, ".local/database")) as unknown as DB;
}
export async function migrate(db: DB) {
  await db.exec(
    "CREATE TABLE IF NOT EXISTS public.art_migrations(version text PRIMARY KEY)",
  );
  const directory = path.join(root, "supabase/migrations");
  for (const file of (await readdir(directory))
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    const version = file.split("_")[0];
    const done = await db.query(
      "SELECT version FROM public.art_migrations WHERE version=$1",
      [version],
    );
    if (!done.rows.length)
      await db.transaction(async (tx) => {
        await tx.exec(await readFile(path.join(directory, file), "utf8"));
        await tx.query("INSERT INTO public.art_migrations VALUES($1)", [
          version,
        ]);
      });
  }
}
export async function scoped<T>(
  db: DB,
  owner: string,
  role: "guest" | "ops",
  fn: (tx: DB) => Promise<T>,
) {
  return db.transaction(async (tx) => {
    await tx.exec("SET LOCAL ROLE art_app");
    await tx.query(
      "SELECT set_config('art.owner',$1,true),set_config('art.role',$2,true),set_config('art.customer',$3,true)",
      [owner, role, db.customerId || ""],
    );
    return fn(tx);
  });
}
export function withCustomer(db: DB, customerId: string): DB {
  return {
    customerId,
    query: (sql, args) => db.query(sql, args),
    exec: (sql) => db.exec(sql),
    transaction: (fn) => db.transaction(fn),
    close: () => db.close(),
  };
}
