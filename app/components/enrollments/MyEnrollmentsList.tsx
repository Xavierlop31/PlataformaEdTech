import Link from "next/link";
import { Card } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { EmptyState } from "@/app/components/ui/EmptyState";
import type { Course } from "@/docs/contracts/types";

export function MyEnrollmentsList({ courses }: { courses: Course[] }) {
  if (courses.length === 0) {
    return (
      <EmptyState
        title="Todavía no te inscribiste a ningún curso"
        description="Explorá el catálogo y empezá a aprender."
        action={
          <Link href="/">
            <Button>Ver catálogo</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {courses.map((course) => (
        <Card key={course.id} className="flex items-center justify-between gap-3">
          <span className="font-medium text-foreground">{course.title}</span>
          <Link href={`/courses/${course.id}/learn`}>
            <Button variant="secondary">Continuar</Button>
          </Link>
        </Card>
      ))}
    </div>
  );
}
