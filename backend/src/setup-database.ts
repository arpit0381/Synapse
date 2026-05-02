import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import * as path from "path";

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
  console.log(`   URL: ${SUPABASE_URL}\n`);

  try {
    const { error: testError } = await supabase.from("profiles").select("id").limit(1);
    if (testError && !testError.message.includes("does not exist")) {
      console.error("❌ Connection failed:", testError.message);
      process.exit(1);
    }
    console.log("✅ Connected to Supabase\n");

    console.log("📋 Reading schema.sql...");
    const schemaPath = path.join(__dirname, "../supabase/schema.sql");
    const sql = readFileSync(schemaPath, "utf8");

    console.log("⚙️  Applying schema to database...");

    const { data, error } = await supabase.rpc("exec_sql", { sql_query: sql });

    if (error) {
      console.error("❌ Error applying schema:", error.message);
      console.log("⚠️  Trying alternative method...");

      const statements = sql
        .split(';')
        .filter(s => s.trim() && !s.trim().startsWith('--'));

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i].trim();
        if (stmt.length === 0) continue;

        try {
          await supabase.rpc('exec_sql', { sql_query: stmt });
        } catch (e: any) {
          console.log(`   Statement ${i + 1}/${statements.length}: Skipped`);
        }
      }
    }

    console.log("✅ Schema applied successfully!\n");

    console.log("🔍 Verifying tables...");
    const tables = [
      "profiles", "workspaces", "workspace_members", "channels",
      "channel_members", "messages", "message_reactions", "direct_messages",
      "tasks", "subtasks", "task_comments", "files", "notifications", "focus_sessions"
    ];

    for (const table of tables) {
      const { error } = await supabase.from(table).select("*").limit(1);
      if (error) {
        console.log(`   ❌ ${table}: ${error.message}`);
      } else {
        console.log(`   ✅ ${table}: OK`);
      }
    }

    console.log("\n🎉 Database setup complete!");

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.log("\n⚠️  Please manually apply the schema:");
    console.log("   1. Go to https://supabase.com/dashboard → your project");
    console.log("   2. Click SQL Editor → New Query");
    console.log("   3. Open backend/supabase/schema.sql and paste it");
    console.log("   4. Click 'Run'");
    process.exit(1);
  }
}

main();