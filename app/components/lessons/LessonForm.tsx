"use client";

import { useState } from "react";
import type { Lesson } from "@/docs/contracts/types";
import { Button } from "@/app/components/ui/Button";
import { Input, Label, FieldError } from "@/app/components/ui/Input";

export function LessonForm({
  courseId,
  lesson,
  nextPosition,
  onSaved,
  onCancel,
}: {
  courseId: string;
  lesson?: Lesson;
  /** posición sugerida para una lección nueva (al final de la lista). */
  nextPosition?: number;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [contentUrl, setContentUrl] = useState(lesson?.content_url ?? "");
  const [position, setPosition] = useState(lesson?.position ?? nextPosition ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const body = {
      title,
      content_url: contentUrl || undefined,
      position: Number(position),
    };

    const url = lesson
      ? `/api/courses/${courseId}/lessons/${lesson.id}`
      : `/api/courses/${courseId}/lessons`;
    const method = lesson ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? "No se pudo guardar la lección.");
      setLoading(false);
      return;
    }

    setLoading(false);
    if (!lesson) {
      setTitle("");
      setContentUrl("");
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-surface p-3">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div>
          <Label>Título de la lección</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
          />
        </div>
        <div className="w-20">
          <Label>Posición</Label>
          <Input
            type="number"
            value={position}
            onChange={(e) => setPosition(Number(e.target.value))}
          />
        </div>
      </div>

      <div>
        <Label>URL del contenido (video)</Label>
        <Input
          value={contentUrl}
          onChange={(e) => setContentUrl(e.target.value)}
          placeholder="https://…"
        />
      </div>

      <FieldError>{error}</FieldError>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando…" : lesson ? "Guardar" : "Agregar lección"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
