import { createClient } from "@/app/lib/supabase/server";
import { getSessionProfile } from "@/app/lib/profile";
import {
  jsonError,
  jsonOk,
  isUniqueViolation,
  parsePagination,
  paginationHeaders,
} from "@/app/lib/http";
import { createReviewSchema } from "@/app/lib/validation/schemas";

type Params = { params: Promise<{ id: string }> };

/** EP-09 — GET /api/courses/:id/reviews (estrictamente binario, sin excepción) */
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  // La enmienda de RLS-R2 (or auth.uid() = student_id) es solo para que
  // EP-14/EP-15 distingan 403 de 404 — NO debe filtrarse acá. Por eso se
  // chequea is_published explícitamente en la app, sin delegar 100% en RLS
  // (Spec.md, nota bajo EP-09 en endpoints.md).
  const { data: course } = await supabase
    .from("courses")
    .select("is_published")
    .eq("id", id)
    .maybeSingle();

  if (!course || !course.is_published) return jsonOk([]);

  const { searchParams } = new URL(request.url);
  const { from, to } = parsePagination(searchParams);

  const { data, count } = await supabase
    .from("reviews")
    .select("*", { count: "exact" })
    .eq("course_id", id)
    .order("created_at", { ascending: false })
    .range(from, to);

  return jsonOk(data ?? [], { headers: paginationHeaders(count ?? 0) });
}

/** EP-10 — POST /api/courses/:id/reviews */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, profile } = await getSessionProfile(supabase);

  if (!user) return jsonError(401, "unauthorized");
  if (!profile || profile.role !== "estudiante") return jsonError(403, "forbidden");

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", user.id)
    .eq("course_id", id)
    .maybeSingle();

  if (!enrollment) return jsonError(403, "forbidden");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation_error", "body no es JSON válido");
  }

  const parsed = createReviewSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation_error", parsed.error.issues[0]?.message);
  }

  const { data, error } = await supabase
    .from("reviews")
    .insert({ ...parsed.data, student_id: user.id, course_id: id })
    .select()
    .single();

  if (error) {
    if (isUniqueViolation(error)) return jsonError(409, "already_reviewed");
    return jsonError(400, "validation_error", error.message);
  }

  return jsonOk(data, { status: 201 });
}
