import { createClient } from "@/app/lib/supabase/server";
import { getSessionProfile } from "@/app/lib/profile";
import {
  jsonError,
  jsonOk,
  parsePagination,
  paginationHeaders,
} from "@/app/lib/http";
import { createCourseSchema } from "@/app/lib/validation/schemas";

/**
 * EP-01 — GET /api/courses
 *
 * Extensión de implementación no documentada como EP separado en Spec.md:
 * `?mine=true` (requiere sesión) filtra a EXCLUSIVAMENTE los cursos propios
 * del instructor autenticado, publicados o no — necesario para el dashboard
 * de instructor (F1/F2/F4), que de otro modo no tiene forma de listar solo
 * sus propios borradores sin que se mezclen con el catálogo público. No
 * cambia el comportamiento de ningún caso ya documentado (aditivo, opt-in).
 * Señalado al usuario para que decida si se formaliza en Spec.md/endpoints.md.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const { from, to } = parsePagination(searchParams);
  const categorySlug = searchParams.get("category");
  const mineOnly = searchParams.get("mine") === "true";

  let query = supabase
    .from("courses")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (mineOnly) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError(401, "unauthorized");
    query = query.eq("instructor_id", user.id);
  }

  if (categorySlug) {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", categorySlug)
      .maybeSingle();

    // Categoría inexistente → lista vacía (mismo criterio "no filtrar por
    // error" que el resto de la API), no un 404 (EP-01 no tiene esa rama).
    query = query.eq("category_id", category?.id ?? "00000000-0000-0000-0000-000000000000");
  }

  const { data, count, error } = await query;
  if (error) return jsonError(400, "validation_error", error.message);

  return jsonOk(data ?? [], { headers: paginationHeaders(count ?? 0) });
}

/** EP-02 — POST /api/courses */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { user, profile } = await getSessionProfile(supabase);

  if (!user) return jsonError(401, "unauthorized");
  if (!profile || profile.role !== "instructor") return jsonError(403, "forbidden");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation_error", "body no es JSON válido");
  }

  const parsed = createCourseSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation_error", parsed.error.issues[0]?.message);
  }

  const { data, error } = await supabase
    .from("courses")
    .insert({ ...parsed.data, instructor_id: user.id })
    .select()
    .single();

  if (error) return jsonError(400, "validation_error", error.message);

  return jsonOk(data, { status: 201 });
}
