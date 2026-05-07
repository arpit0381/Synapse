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
  console.log("⚙️  Adding appearance_settings column to profiles...");

  const sql = `
    ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS appearance_settings JSONB DEFAULT '{
      "font_size": "Default",
      "density": "Comfortable"
    }'::jsonb;
  `;

  // Try using RPC if it exists, otherwise tell user
  const { error } = await supabase.rpc("exec_sql", { sql_query: sql });

  if (error) {
    console.log("⚠️  RPC exec_sql failed. Please run this SQL in your Supabase dashboard:");
    console.log(sql);
  } else {
    console.log("✅ Column added successfully!");
  }
}

main();
