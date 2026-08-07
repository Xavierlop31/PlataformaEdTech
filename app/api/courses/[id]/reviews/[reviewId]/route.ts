import { createClient } from "@/app/lib/supabase/server";
import { jsonError, jsonOk } from "@/app/lib/http";
import { getVisibleReview } from "@/app/lib/visibility";
import { updateReviewSchema } from "@/app/lib/validation/schemas";

type Params = { params: Promise<{ id: string; reviewId: string }> };

/** EP-14 — PATCH /api/courses/:id/reviews/:reviewId */
export async function PATCH(request: Request, { params }: Params) {
  const { reviewId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const review = await getVisibleReview(supabase, reviewId);
  if (!review) return jsonError(404, "not_found");
  if (!user || review.student_id !== user.id) return jsonError(403, "forbidden");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation_error", "body no es JSON válido");
  }

  const parsed = updateReviewSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation_error", parsed.error.issues[0]?.message);
  }

  const { data, error } = await supabase
    .from("reviews")
    .update(parsed.data)
    .eq("id", reviewId)
    .select()
    .single();

  if (error) return jsonError(400, "validation_error", error.message);

  return jsonOk(data);
}

/** EP-15 — DELETE /api/courses/:id/reviews/:reviewId */
export async function DELETE(_request: Request, { params }: Params) {
  const { reviewId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const review = await getVisibleReview(supabase, reviewId);
  if (!review) return jsonError(404, "not_found");
  if (!user || review.student_id !== user.id) return jsonError(403, "forbidden");

  const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
  if (error) return jsonError(400, "validation_error", error.message);

  return new Response(null, { status: 204 });
}
