import { Badge } from "@/app/components/ui/Badge";
import type { Role } from "@/docs/contracts/types";

export function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge tone={role === "instructor" ? "papaya" : "speedline"}>
      {role === "instructor" ? "Instructor" : "Estudiante"}
    </Badge>
  );
}
