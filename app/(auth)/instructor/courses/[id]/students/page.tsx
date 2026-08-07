import { notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { serverFetchJson } from "@/app/lib/fetchApi";
import { StudentRosterTable } from "@/app/components/enrollments/StudentRosterTable";
import type { CourseWithInstructor, Enrollment } from "@/docs/contracts/types";

export default async function CourseStudentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [courseRes, enrollmentsRes] = await Promise.all([
    serverFetchJson<CourseWithInstructor>(`/api/courses/${id}`),
    serverFetchJson<Enrollment[]>(`/api/enrollments?course_id=${id}&limit=100`),
  ]);

  if (!courseRes.ok || courseRes.data.instructor_id !== user?.id) notFound();

  const enrollments = enrollmentsRes.data ?? [];

  // Nombres de estudiantes: lectura pública de `profiles` (RLS-P1) para
  // enriquecer la vista — no hay endpoint de listado de perfiles en el
  // contrato, así que se resuelve directo (mismo criterio que Navbar/guards).
  const studentIds = [...new Set(enrollments.map((e) => e.student_id))];
  const studentNames: Record<string, string | null> = {};
  if (studentIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", studentIds);
    for (const p of profiles ?? []) studentNames[p.id] = p.full_name;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-foreground">
        Estudiantes — {courseRes.data.title}
      </h1>
      <StudentRosterTable enrollments={enrollments} studentNames={studentNames} />
    </main>
  );
}
