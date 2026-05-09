import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  console.log("Dropping all tables...");
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
  
  for (const row of tables.rows) {
    const tableName = row.name as string;
    if (tableName !== "sqlite_sequence") {
      console.log(`Dropping ${tableName}`);
      await client.execute(`DROP TABLE IF EXISTS ${tableName}`);
    }
  }
  console.log("Done.");
}

main().catch(console.error);
