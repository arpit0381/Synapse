import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  console.log("⚙️  Adding notification_settings column to profiles...");

  const sql = `
    ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
      "sounds": true,
      "quiet_hours": "Never",
      "categories": {
        "mentions": { "push": true, "email": true, "in_app": true },
        "dms": { "push": true, "email": false, "in_app": true },
        "tasks": { "push": true, "email": true, "in_app": true },
        "channels": { "push": false, "email": false, "in_app": true },
        "email_digest": { "push": false, "email": true, "in_app": false }
      }
    }'::jsonb;
  `;

  const { error } = await supabase.rpc("exec_sql", { sql_query: sql });

  if (error) {
    console.error("❌ Error applying SQL:", error.message);
    process.exit(1);
  }

  console.log("✅ Column added successfully!");
}

main();
