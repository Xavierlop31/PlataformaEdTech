import Link from "next/link";
import { Card } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Badge";
import type { Course } from "@/docs/contracts/types";

export function CourseCard({ course }: { course: Course }) {
  return (
    <Link href={`/courses/${course.id}`}>
      <Card className="h-full transition-colors hover:border-papaya">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="text-lg font-bold text-foreground">{course.title}</h3>
          <Badge tone="papaya">
            {course.price > 0 ? `$${course.price.toFixed(2)}` : "Gratis"}
          </Badge>
        </div>
        {course.description && (
          <p className="line-clamp-3 text-sm text-muted">{course.description}</p>
        )}
      </Card>
    </Link>
  );
}
