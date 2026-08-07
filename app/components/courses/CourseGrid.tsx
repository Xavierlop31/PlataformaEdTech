import type { Course } from "@/docs/contracts/types";
import { CourseCard } from "./CourseCard";
import { EmptyState } from "@/app/components/ui/EmptyState";

export function CourseGrid({ courses }: { courses: Course[] }) {
  if (courses.length === 0) {
    return (
      <EmptyState
        title="No hay cursos todavía"
        description="Probá con otra categoría o volvé más tarde."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  );
}
