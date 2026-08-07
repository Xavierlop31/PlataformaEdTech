import Link from "next/link";
import { Badge } from "@/app/components/ui/Badge";
import { RatingStars } from "@/app/components/ui/RatingStars";
import { Button } from "@/app/components/ui/Button";
import { EnrollButton } from "@/app/components/enrollments/EnrollButton";
import type { CourseWithInstructor } from "@/docs/contracts/types";

export function CourseDetailHeader({
  course,
  isEnrolled,
  isOwner,
  canEnroll,
}: {
  course: CourseWithInstructor;
  isEnrolled: boolean;
  isOwner: boolean;
  /** true si hay sesión con role === 'estudiante' (Spec.md F8: instructores no se inscriben) */
  canEnroll: boolean;
}) {
  return (
    <div className="mb-10 border-b border-surface pb-8">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Badge tone="papaya">
          {course.price > 0 ? `$${course.price.toFixed(2)}` : "Gratis"}
        </Badge>
        <RatingStars value={course.average_rating} />
        <span className="text-sm text-muted">({course.review_count} reviews)</span>
      </div>

      <h1 className="mb-2 text-3xl font-extrabold text-foreground sm:text-4xl">
        {course.title}
      </h1>
      <p className="mb-4 text-muted">
        Por {course.instructor.full_name ?? "Instructor"}
      </p>

      {course.description && (
        <p className="mb-6 max-w-2xl whitespace-pre-line text-foreground/90">
          {course.description}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {isOwner && (
          <Link href={`/instructor/courses/${course.id}/edit`}>
            <Button variant="secondary">Editar curso</Button>
          </Link>
        )}

        {!isOwner && isEnrolled && (
          <Link href={`/courses/${course.id}/learn`}>
            <Button>Ir a las lecciones</Button>
          </Link>
        )}

        {!isOwner && !isEnrolled && (
          <EnrollButton courseId={course.id} canEnroll={canEnroll} />
        )}
      </div>
    </div>
  );
}
