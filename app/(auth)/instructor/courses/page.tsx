import Link from "next/link";
import { serverFetchJson } from "@/app/lib/fetchApi";
import { InstructorCourseTable } from "@/app/components/courses/InstructorCourseTable";
import { Button } from "@/app/components/ui/Button";
import type { Course } from "@/docs/contracts/types";

export default async function InstructorCoursesPage() {
  const res = await serverFetchJson<Course[]>(`/api/courses?mine=true&limit=100`);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Mis cursos</h1>
        <Link href="/instructor/courses/new">
          <Button>+ Nuevo curso</Button>
        </Link>
      </div>
      <InstructorCourseTable courses={res.data ?? []} />
    </main>
  );
}
