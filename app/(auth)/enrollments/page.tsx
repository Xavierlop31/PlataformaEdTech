import { serverFetchJson } from "@/app/lib/fetchApi";
import { MyEnrollmentsList } from "@/app/components/enrollments/MyEnrollmentsList";
import type { Course, Enrollment } from "@/docs/contracts/types";

export default async function MyEnrollmentsPage() {
  const enrollmentsRes = await serverFetchJson<Enrollment[]>(`/api/enrollments?limit=100`);
  const enrollments = enrollmentsRes.data ?? [];

  const courses = (
    await Promise.all(
      enrollments.map((e) =>
        serverFetchJson<Course>(`/api/courses/${e.course_id}`).then((r) => (r.ok ? r.data : null))
      )
    )
  ).filter((c): c is Course => c !== null);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Mi aprendizaje</h1>
      <MyEnrollmentsList courses={courses} />
    </main>
  );
}
