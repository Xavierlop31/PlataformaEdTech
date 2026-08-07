import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Patrón "SELECT de visibilidad antes de escribir" (Spec.md §5.4bis,
 * "Distinguir 403 de 404 en escrituras gateadas por ownership").
 *
 * Un UPDATE/DELETE que afecta 0 filas por RLS es indistinguible entre "no
 * existe" y "no tenés permiso". Estas funciones hacen el SELECT con el mismo
 * cliente scoped a la sesión (nunca service_role) usando la policy de LECTURA
 * de cada tabla, que debe ser igual o más permisiva que la de escritura.
 *
 * Uso en un Route Handler:
 *   const course = await getVisibleCourse(supabase, id);
 *   if (!course) return jsonError(404, "not_found");
 *   if (course.instructor_id !== userId) return jsonError(403, "forbidden");
 *   // recién acá se procede con el UPDATE/DELETE real
 */

export async function getVisibleCourse(supabase: SupabaseClient, courseId: string) {
  const { data } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();
  return data;
}

export async function getVisibleLesson(supabase: SupabaseClient, lessonId: string) {
  // lessons_select_enrolled_or_owner también deja ver la lección a un
  // estudiante inscrito (no solo al dueño) — por eso el 403 en EP-12/EP-13
  // puede darse tanto a un estudiante inscrito como a un instructor ajeno
  // que de algún modo viera la fila (ver tabla en Spec.md §5.4bis).
  const { data } = await supabase
    .from("lessons")
    .select("*, courses!inner(id, instructor_id, is_published)")
    .eq("id", lessonId)
    .maybeSingle();
  return data as
    | (Record<string, unknown> & {
        id: string;
        course_id: string;
        courses: { id: string; instructor_id: string; is_published: boolean };
      })
    | null;
}

export async function getVisibleReview(supabase: SupabaseClient, reviewId: string) {
  // reviews_select_public ya incluye `or auth.uid() = student_id` (enmienda
  // validada) para que el autor siempre pueda ver/editar/borrar su propia
  // review aunque el curso se despublique después.
  const { data } = await supabase
    .from("reviews")
    .select("*")
    .eq("id", reviewId)
    .maybeSingle();
  return data;
}
