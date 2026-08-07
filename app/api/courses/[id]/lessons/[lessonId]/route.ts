import { createClient } from "@/app/lib/supabase/server";
import { jsonError, jsonOk } from "@/app/lib/http";
import { getVisibleLesson } from "@/app/lib/visibility";
import { updateLessonSchema } from "@/app/lib/validation/schemas";

type Params = { params: Promise<{ id: string; lessonId: string }> };

/** EP-12 — PATCH /api/courses/:id/lessons/:lessonId */
export async function PATCH(request: Request, { params }: Params) {
  const { lessonId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const lesson = await getVisibleLesson(supabase, lessonId);
  if (!lesson) return jsonError(404, "not_found");
  if (!user || lesson.courses.instructor_id !== user.id) return jsonError(403, "forbidden");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation_error", "body no es JSON válido");
  }

  const parsed = updateLessonSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation_error", parsed.error.issues[0]?.message);
  }

  const { data, error } = await supabase
    .from("lessons")
    .update(parsed.data)
    .eq("id", lessonId)
    .select()
    .single();

  if (error) return jsonError(400, "validation_error", error.message);

  return jsonOk(data);
}

/** EP-13 — DELETE /api/courses/:id/lessons/:lessonId */
export async function DELETE(_request: Request, { params }: Params) {
  const { lessonId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const lesson = await getVisibleLesson(supabase, lessonId);
  if (!lesson) return jsonError(404, "not_found");
  if (!user || lesson.courses.instructor_id !== user.id) return jsonError(403, "forbidden");

  // RLS-L5: nunca .from('lessons').delete() directo — la atomicidad
  // borrar+auto-despublicar vive en la función RPC (Spec.md §5.3/§5.4bis).
  const { error } = await supabase.rpc("delete_lesson_and_sync_publish", {
    p_lesson_id: lessonId,
  });

  if (error) {
    // Fallback de una carrera genuina entre el pre-chequeo de arriba y el
    // RPC (ver comentario en la función SQL) — mismo criterio: 404.
    return jsonError(404, "not_found");
  }

  return new Response(null, { status: 204 });
}
