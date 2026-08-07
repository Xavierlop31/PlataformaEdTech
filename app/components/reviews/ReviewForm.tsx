"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Review } from "@/docs/contracts/types";
import { Button } from "@/app/components/ui/Button";
import { Textarea, Label, FieldError } from "@/app/components/ui/Input";

export function ReviewForm({
  courseId,
  existingReview,
}: {
  courseId: string;
  existingReview: Review | null;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(existingReview?.rating ?? 5);
  const [comment, setComment] = useState(existingReview?.comment ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const url = existingReview
      ? `/api/courses/${courseId}/reviews/${existingReview.id}`
      : `/api/courses/${courseId}/reviews`;
    const method = existingReview ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment: comment || undefined }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? "No se pudo guardar la review.");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!existingReview) return;
    setLoading(true);
    await fetch(`/api/courses/${courseId}/reviews/${existingReview.id}`, {
      method: "DELETE",
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-surface p-4">
      <div>
        <Label>Tu calificación</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => setRating(n)}
              className={n <= rating ? "text-2xl text-papaya" : "text-2xl text-surface-bright"}
              aria-label={`${n} estrellas`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Comentario (opcional)</Label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={2000}
        />
      </div>

      <FieldError>{error}</FieldError>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {existingReview ? "Actualizar review" : "Publicar review"}
        </Button>
        {existingReview && (
          <Button type="button" variant="danger" onClick={handleDelete} disabled={loading}>
            Borrar
          </Button>
        )}
      </div>
    </form>
  );
}
