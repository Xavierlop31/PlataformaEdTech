import { notFound } from "next/navigation";
import { serverFetchJson } from "@/app/lib/fetchApi";
import { createClient } from "@/app/lib/supabase/server";
import { Card } from "@/app/components/ui/Card";
import { CourseForm } from "@/app/components/courses/CourseForm";
import { PublishToggle } from "@/app/components/courses/PublishToggle";
import type { Category, CourseWithInstructor } from "@/docs/contracts/types";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [courseRes, categoriesRes] = await Promise.all([
    serverFetchJson<CourseWithInstructor>(`/api/courses/${id}`),
    serverFetchJson<Category[]>(`/api/categories`),
  ]);

  if (!courseRes.ok || courseRes.data.instructor_id !== user?.id) notFound();
  const course = courseRes.data;

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Editar curso</h1>
        <PublishToggle courseId={course.id} isPublished={course.is_published} />
      </div>
      <Card>
        <CourseForm course={course} categories={categoriesRes.data ?? []} />
      </Card>
    </main>
  );
}
