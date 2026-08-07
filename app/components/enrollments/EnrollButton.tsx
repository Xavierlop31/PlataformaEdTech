"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/app/components/ui/Button";

export function EnrollButton({
  courseId,
  canEnroll,
}: {
  courseId: string;
  /** false si no hay sesión o el rol es instructor — igual mostramos el botón, redirige a login. */
  canEnroll: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnroll() {
    if (!canEnroll) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setError(null);
    const res = await fetch(`/api/courses/${courseId}/enroll`, { method: "POST" });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        router.refresh();
        return;
      }
      setError(data.message ?? "No se pudo completar la inscripción.");
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <Button onClick={handleEnroll} disabled={loading}>
        {loading ? "Inscribiendo…" : "Inscribirme"}
      </Button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
