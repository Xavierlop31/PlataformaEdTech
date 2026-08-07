import { createClient } from "@/app/lib/supabase/server";
import { jsonError, jsonOk, parsePagination, paginationHeaders } from "@/app/lib/http";
import { getVisibleCourse } from "@/app/lib/visibility";
import { createLessonSchema } from "@/app/lib/validation/schemas";

type Params = { params: Promise<{ id: string }> };

/** EP-05 — GET /api/courses/:id/lessons */
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  // Paso 1 (Spec.md §5.4bis "Existencia vs. autorización"): el curso debe
  // existir y ser visible, si no -> 404. Distinto del paso 2 (RLS-L2).
  const course = await getVisibleCourse(supabase, id);
  if (!course) return jsonError(404, "not_found");

  const { searchParams } = new URL(request.url);
  const { from, to } = parsePagination(searchParams);

  // Paso 2: RLS decide qué lecciones ve quien llama (inscrito/dueño → filas;
  // no inscrito → 0 filas). El resultado siempre es 200, vacío o no.
  const { data, count } = await supabase
    .from("lessons")
    .select("*", { count: "exact" })
    .eq("course_id", id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .range(from, to);

  return jsonOk(data ?? [], { headers: paginationHeaders(count ?? 0) });
}

/** EP-06 — POST /api/courses/:id/lessons */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const course = await getVisibleCourse(supabase, id);
  if (!course) return jsonError(404, "not_found");
  if (!user || course.instructor_id !== user.id) return jsonError(403, "forbidden");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation_error", "body no es JSON válido");
  }

  const parsed = createLessonSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation_error", parsed.error.issues[0]?.message);
  }

  const { data, error } = await supabase
    .from("lessons")
    .insert({ ...parsed.data, course_id: id })
    .select()
    .single();

  if (error) return jsonError(400, "validation_error", error.message);

  return jsonOk(data, { status: 201 });
}
