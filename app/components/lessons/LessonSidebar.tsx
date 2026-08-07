import Link from "next/link";
import type { Lesson } from "@/docs/contracts/types";
import { cn } from "@/app/lib/cn";

export function LessonSidebar({
  courseId,
  lessons,
  activeLessonId,
}: {
  courseId: string;
  lessons: Lesson[];
  activeLessonId: string;
}) {
  return (
    <nav className="w-full shrink-0 space-y-1 sm:w-64">
      {lessons.map((lesson, i) => (
        <Link
          key={lesson.id}
          href={`/courses/${courseId}/learn?lesson=${lesson.id}`}
          className={cn(
            "block rounded-md px-3 py-2 text-sm transition-colors",
            lesson.id === activeLessonId
              ? "bg-papaya/10 text-papaya"
              : "text-muted hover:bg-surface hover:text-foreground"
          )}
        >
          <span className="mr-2 text-xs">{i + 1}.</span>
          {lesson.title}
        </Link>
      ))}
    </nav>
  );
}
