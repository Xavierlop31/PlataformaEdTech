"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Badge";

export function PublishToggle({
  courseId,
  isPublished,
}: {
  courseId: string;
  isPublished: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/courses/${courseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !isPublished }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        data.message ??
          (res.status === 400
            ? "No se puede publicar un curso sin lecciones."
            : "No se pudo actualizar el curso.")
      );
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <Badge tone={isPublished ? "success" : "muted"}>
        {isPublished ? "Publicado" : "Borrador"}
      </Badge>
      <Button variant="secondary" onClick={toggle} disabled={loading}>
        {loading ? "…" : isPublished ? "Despublicar" : "Publicar"}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
