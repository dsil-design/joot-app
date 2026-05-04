import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FOCAL_GROUP_ID = "906609e7-5b56-4869-96e7-a11cad9341a3";
const SECONDARY_GROUP_ID = "64409bda-ef14-4b6b-866d-abe22827f165";

async function main() {
  console.log("=== email_groups ===");
  const { data: groups } = await supabase
    .from("email_groups")
    .select("*")
    .in("id", [FOCAL_GROUP_ID, SECONDARY_GROUP_ID]);
  console.log(JSON.stringify(groups, null, 2));

  console.log("\n=== members of group 906609e7 (the one whose primary=false email is) ===");
  const { data: g1Members } = await supabase
    .from("email_transactions")
    .select("id, subject, amount, currency, order_id, is_group_primary, email_date, status")
    .eq("email_group_id", FOCAL_GROUP_ID);
  console.log(JSON.stringify(g1Members, null, 2));

  console.log("\n=== members of group 64409bda (primary=true email is in) ===");
  const { data: g2Members } = await supabase
    .from("email_transactions")
    .select("id, subject, amount, currency, order_id, is_group_primary, email_date, status")
    .eq("email_group_id", SECONDARY_GROUP_ID);
  console.log(JSON.stringify(g2Members, null, 2));
}

main().catch(console.error);
