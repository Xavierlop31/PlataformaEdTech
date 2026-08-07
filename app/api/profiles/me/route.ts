import { createClient } from "@/app/lib/supabase/server";
import { jsonError, jsonOk } from "@/app/lib/http";
import { updateProfileSchema } from "@/app/lib/validation/schemas";

/** EP-17 — GET /api/profiles/me */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError(401, "unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return jsonError(404, "not_found");

  return jsonOk(profile);
}

/** EP-18 — PATCH /api/profiles/me (role nunca es un campo aceptado — inmutable en v1) */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError(401, "unauthorized");

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation_error", "body no es JSON válido");
  }

  if ("role" in body) {
    return jsonError(400, "validation_error", "role es inmutable en v1");
  }

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation_error", parsed.error.issues[0]?.message);
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id)
    .select()
    .single();

  if (error) return jsonError(400, "validation_error", error.message);

  return jsonOk(data);
}
