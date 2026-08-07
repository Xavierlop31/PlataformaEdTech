import { createClient } from "@/app/lib/supabase/server";
import { jsonOk } from "@/app/lib/http";

/** EP-11 — GET /api/categories */
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").order("name");
  return jsonOk(data ?? []);
}
