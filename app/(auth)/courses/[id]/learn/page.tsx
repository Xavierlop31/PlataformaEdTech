import { redirect, notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { serverFetchJson } from "@/app/lib/fetchApi";
import { LessonSidebar } from "@/app/components/lessons/LessonSidebar";
import { LessonPlayer } from "@/app/components/lessons/LessonPlayer";
import { ProgressBar } from "@/app/components/ui/ProgressBar";
import type { Course, Lesson } from "@/docs/contracts/types";

export default async function LearnPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { id } = await params;
  const { lesson: lessonIdParam } = await searchParams;

  const courseRes = await serverFetchJson<Course>(`/api/courses/${id}`);
  if (!courseRes.ok) notFound();

  const lessonsRes = await serverFetchJson<Lesson[]>(`/api/courses/${id}/lessons?limit=100`);
  const lessons = lessonsRes.data ?? [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user?.id === courseRes.data.instructor_id;

  // RLS-L2: 0 lecciones visibles es indistinguible entre "no inscrito" y
  // "curso sin lecciones" a nivel de API — acá, con contexto de UI, se
  // interpreta como "no tenés acceso" y se manda de vuelta al detalle.
  if (lessons.length === 0 && !isOwner) {
    redirect(`/courses/${id}`);
  }

  const activeLesson = lessons.find((l) => l.id === lessonIdParam) ?? lessons[0];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h2 className="text-sm text-muted">{courseRes.data.title}</h2>
        <ProgressBar value={lessons.indexOf(activeLesson) + 1} max={lessons.length} />
      </div>

      <div className="flex flex-col gap-6 sm:flex-row">
        <LessonSidebar courseId={id} lessons={lessons} activeLessonId={activeLesson.id} />
        <div className="flex-1">
          <LessonPlayer lesson={activeLesson} />
        </div>
      </div>
    </main>
  );
}
