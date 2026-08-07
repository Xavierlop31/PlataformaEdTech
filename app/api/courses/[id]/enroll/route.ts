import { createClient } from "@/app/lib/supabase/server";
import { getSessionProfile } from "@/app/lib/profile";
import { jsonError, jsonOk, isUniqueViolation } from "@/app/lib/http";
import { getVisibleCourse } from "@/app/lib/visibility";

type Params = { params: Promise<{ id: string }> };

/** EP-07 — POST /api/courses/:id/enroll */
export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, profile } = await getSessionProfile(supabase);

  if (!user) return jsonError(401, "unauthorized");
  // RLS-E2: un instructor nunca puede inscribirse, ni a su propio curso.
  if (!profile || profile.role !== "estudiante") return jsonError(403, "forbidden");

  const course = await getVisibleCourse(supabase, id);
  if (!course || !course.is_published) return jsonError(404, "not_found");

  const { data, error } = await supabase
    .from("enrollments")
    .insert({ student_id: user.id, course_id: id })
    .select()
    .single();

  if (error) {
    if (isUniqueViolation(error)) return jsonError(409, "already_enrolled");
    return jsonError(400, "validation_error", error.message);
  }

  return jsonOk(data, { status: 201 });
}
