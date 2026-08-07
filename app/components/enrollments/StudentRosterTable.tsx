import { Card } from "@/app/components/ui/Card";
import { EmptyState } from "@/app/components/ui/EmptyState";
import type { Enrollment } from "@/docs/contracts/types";

export function StudentRosterTable({
  enrollments,
  studentNames,
}: {
  enrollments: Enrollment[];
  studentNames: Record<string, string | null>;
}) {
  if (enrollments.length === 0) {
    return <EmptyState title="Todavía nadie se inscribió a este curso" />;
  }

  return (
    <div className="space-y-2">
      {enrollments.map((e) => (
        <Card key={e.id} className="flex items-center justify-between">
          <span className="text-foreground">
            {studentNames[e.student_id] ?? "Estudiante"}
          </span>
          <span className="text-xs text-muted">
            Inscrito el {new Date(e.created_at).toLocaleDateString("es-AR")}
          </span>
        </Card>
      ))}
    </div>
  );
}
