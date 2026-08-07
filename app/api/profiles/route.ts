import { createClient } from "@/app/lib/supabase/server";
import { jsonError, jsonOk, isUniqueViolation } from "@/app/lib/http";
import { createProfileSchema } from "@/app/lib/validation/schemas";

/** EP-16 — POST /api/profiles */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError(401, "unauthorized");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation_error", "body no es JSON válido");
  }

  const parsed = createProfileSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation_error", parsed.error.issues[0]?.message);
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: user.id, role: parsed.data.role, full_name: parsed.data.full_name ?? null })
    .select()
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, "already_has_profile");
    }
    return jsonError(400, "validation_error", error.message);
  }

  return jsonOk(data, { status: 201 });
}
