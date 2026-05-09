import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("🔗 Connecting to Supabase...");
  try {
    const schemaPath = path.join(__dirname, "../supabase/apps_schema.sql");
    const sql = readFileSync(schemaPath, "utf8");

    console.log("⚙️  Applying apps_schema to database...");

    const statements = sql
      .split(';')
      .filter(s => s.trim() && !s.trim().startsWith('--'));

    let success = true;
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (stmt.length === 0) continue;

      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: stmt });
        if (error) {
           console.log(`   Statement ${i + 1}/${statements.length}: Skipped/Failed - ${error.message}`);
           success = false;
        } else {
           console.log(`   Statement ${i + 1}/${statements.length}: OK`);
        }
      } catch (e: any) {
        console.log(`   Statement ${i + 1}/${statements.length}: Failed - ${e.message}`);
        success = false;
      }
    }

    if (!success) {
      console.log("\n⚠️  Some statements failed. If your database does not support the 'exec_sql' RPC function, please manually copy backend/supabase/apps_schema.sql and run it in the Supabase SQL editor.");
    } else {
      console.log("✅ Schema applied successfully!\n");
    }

  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

main();
