import { readFileSync } from "node:fs";
import { Client } from "pg";
if (!process.env.DATABASE_URL)
  throw new Error(
    "Set DATABASE_URL to a direct or session-pooler Postgres connection. This test creates temporary fixtures inside a transaction and rolls them back.",
  );
const db = new Client({ connectionString: process.env.DATABASE_URL });
try {
  await db.connect();
  await db.query(
    readFileSync(new URL("../tests/database.sql", import.meta.url), "utf8"),
  );
  await db.query(readFileSync(new URL("../tests/project-database.sql", import.meta.url), "utf8"));
  console.log(
    "Database isolation, concurrency, reviews, and deletion tests passed; fixtures rolled back.",
  );
} finally {
  await db.query("rollback").catch(() => {});
  await db.end();
}
