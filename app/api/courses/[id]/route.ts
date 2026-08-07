import { createClient } from "@/app/lib/supabase/server";
import { jsonError, jsonOk, isValidUuid } from "@/app/lib/http";
import { getVisibleCourse } from "@/app/lib/visibility";
import { updateCourseSchema } from "@/app/lib/validation/schemas";
import type { CourseWithInstructor } from "@/docs/contracts/types";

type Params = { params: Promise<{ id: string }> };

/** EP-03 — GET /api/courses/:id */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!isValidUuid(id)) return jsonError(400, "validation_error", ":id no es un UUID válido");

  const supabase = await createClient();
  const course = await getVisibleCourse(supabase, id);
  if (!course) return jsonError(404, "not_found");

  const { data: instructor } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", course.instructor_id)
    .maybeSingle();

  const { data: reviews } = await supabase
    .from("reviews")
    .select("rating")
    .eq("course_id", id);

  const review_count = reviews?.length ?? 0;
  const average_rating =
    review_count > 0
      ? reviews!.reduce((sum, r) => sum + r.rating, 0) / review_count
      : null;

  const body: CourseWithInstructor = {
    ...course,
    instructor: instructor ?? { id: course.instructor_id, full_name: null },
    average_rating,
    review_count,
  };

  return jsonOk(body);
}

/** EP-04 — PATCH /api/courses/:id */
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  if (!isValidUuid(id)) return jsonError(400, "validation_error", ":id no es un UUID válido");

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

  const parsed = updateCourseSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation_error", parsed.error.issues[0]?.message);
  }

  // RLS-C6: no se puede publicar un curso con 0 lecciones. Regla de negocio
  // en el Route Handler (no expresable limpiamente en una policy RLS).
  if (parsed.data.is_published === true) {
    const { count } = await supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("course_id", id);

    if (!count || count === 0) {
      return jsonError(
        400,
        "validation_error",
        "no se puede publicar un curso sin lecciones"
      );
    }
  }

  const { data, error } = await supabase
    .from("courses")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) return jsonError(400, "validation_error", error.message);

  return jsonOk(data);
}
