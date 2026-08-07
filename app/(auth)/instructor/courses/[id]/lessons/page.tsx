import { notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { serverFetchJson } from "@/app/lib/fetchApi";
import { LessonListEditor } from "@/app/components/lessons/LessonListEditor";
import type { CourseWithInstructor, Lesson } from "@/docs/contracts/types";

export default async function CourseLessonsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [courseRes, lessonsRes] = await Promise.all([
    serverFetchJson<CourseWithInstructor>(`/api/courses/${id}`),
    serverFetchJson<Lesson[]>(`/api/courses/${id}/lessons?limit=100`),
  ]);

  if (!courseRes.ok || courseRes.data.instructor_id !== user?.id) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold text-foreground">
        Lecciones — {courseRes.data.title}
      </h1>
      <p className="mb-6 text-sm text-muted">
        Publicar requiere al menos una lección (RLS-C6).
      </p>
      <LessonListEditor courseId={id} lessons={lessonsRes.data ?? []} />
    </main>
  );
}
