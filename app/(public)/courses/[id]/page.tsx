import { notFound } from "next/navigation";
import { serverFetchJson } from "@/app/lib/fetchApi";
import { createClient } from "@/app/lib/supabase/server";
import { getSessionProfile } from "@/app/lib/profile";
import { CourseDetailHeader } from "@/app/components/courses/CourseDetailHeader";
import { ReviewList } from "@/app/components/reviews/ReviewList";
import { ReviewForm } from "@/app/components/reviews/ReviewForm";
import type { CourseWithInstructor, Enrollment, Review } from "@/docs/contracts/types";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const courseRes = await serverFetchJson<CourseWithInstructor>(`/api/courses/${id}`);
  if (!courseRes.ok) notFound();
  const course = courseRes.data;

  const reviewsRes = await serverFetchJson<Review[]>(`/api/courses/${id}/reviews?limit=100`);
  const reviews = reviewsRes.data ?? [];

  const supabase = await createClient();
  const { user, profile } = await getSessionProfile(supabase);

  let isEnrolled = false;
  if (user) {
    const enrollmentsRes = await serverFetchJson<Enrollment[]>(`/api/enrollments?limit=100`);
    isEnrolled = (enrollmentsRes.data ?? []).some((e) => e.course_id === id);
  }

  const isOwner = user?.id === course.instructor_id;
  const canEnroll = !!profile && profile.role === "estudiante";
  const myReview = user ? reviews.find((r) => r.student_id === user.id) ?? null : null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <CourseDetailHeader
        course={course}
        isEnrolled={isEnrolled}
        isOwner={isOwner}
        canEnroll={canEnroll}
      />

      <section>
        <h2 className="mb-4 text-xl font-bold text-foreground">Reviews</h2>

        {!isOwner && isEnrolled && profile?.role === "estudiante" && (
          <div className="mb-6">
            <ReviewForm courseId={id} existingReview={myReview} />
          </div>
        )}

        <ReviewList reviews={reviews} />
      </section>
    </main>
  );
}
