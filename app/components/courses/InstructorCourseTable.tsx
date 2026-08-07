import Link from "next/link";
import type { Course } from "@/docs/contracts/types";
import { Card } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { EmptyState } from "@/app/components/ui/EmptyState";

export function InstructorCourseTable({ courses }: { courses: Course[] }) {
  if (courses.length === 0) {
    return (
      <EmptyState
        title="Todavía no creaste ningún curso"
        description="Empezá creando tu primer curso."
        action={
          <Link href="/instructor/courses/new">
            <Button>Crear curso</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {courses.map((course) => (
        <Card key={course.id} className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-foreground">{course.title}</p>
            <Badge tone={course.is_published ? "success" : "muted"} className="mt-1">
              {course.is_published ? "Publicado" : "Borrador"}
            </Badge>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link href={`/instructor/courses/${course.id}/lessons`}>
              <Button variant="secondary">Lecciones</Button>
            </Link>
            <Link href={`/instructor/courses/${course.id}/edit`}>
              <Button variant="secondary">Editar</Button>
            </Link>
            <Link href={`/instructor/courses/${course.id}/students`}>
              <Button variant="ghost">Estudiantes</Button>
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}
