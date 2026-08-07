import { createClient } from "@/app/lib/supabase/server";
import {
  jsonError,
  jsonOk,
  isValidUuid,
  parsePagination,
  paginationHeaders,
} from "@/app/lib/http";

/** EP-08 — GET /api/enrollments (admite ?course_id= para el instructor dueño, F5) */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError(401, "unauthorized");

  const { searchParams } = new URL(request.url);
  const { from, to } = parsePagination(searchParams);
  const courseId = searchParams.get("course_id");

  if (courseId && !isValidUuid(courseId)) {
    return jsonError(400, "validation_error", "course_id no es un UUID válido");
  }

  let query = supabase
    .from("enrollments")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (courseId) {
    // RLS (enrollments_select_own_or_course_owner) restringe el resultado a
    // filas propias o del curso si quien llama es su instructor dueño.
    query = query.eq("course_id", courseId);
  } else {
    // Sin filtro: el default es EXCLUSIVAMENTE las inscripciones propias,
    // aunque RLS por sí sola dejaría ver también las de los cursos propios
    // de un instructor — esta restricción extra es a propósito (RNF2).
    query = query.eq("student_id", user.id);
  }

  const { data, count, error } = await query;
  if (error) return jsonError(400, "validation_error", error.message);

  return jsonOk(data ?? [], { headers: paginationHeaders(count ?? 0) });
}
