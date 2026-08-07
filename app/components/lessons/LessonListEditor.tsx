"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Lesson } from "@/docs/contracts/types";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { LessonForm } from "./LessonForm";

export function LessonListEditor({
  courseId,
  lessons,
}: {
  courseId: string;
  lessons: Lesson[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(lessons.length === 0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function refresh() {
    setEditingId(null);
    setShowAddForm(false);
    router.refresh();
  }

  async function handleDelete(lessonId: string) {
    setDeletingId(lessonId);
    const res = await fetch(`/api/courses/${courseId}/lessons/${lessonId}`, {
      method: "DELETE",
    });
    setDeletingId(null);
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-3">
      {lessons.length === 0 && !showAddForm && (
        <EmptyState
          title="Sin lecciones todavía"
          description="Agregá al menos una para poder publicar el curso (RLS-C6)."
        />
      )}

      {lessons.map((lesson) =>
        editingId === lesson.id ? (
          <LessonForm
            key={lesson.id}
            courseId={courseId}
            lesson={lesson}
            onSaved={refresh}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <Card key={lesson.id} className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-foreground">
                <span className="mr-2 text-muted">#{lesson.position}</span>
                {lesson.title}
              </p>
              {lesson.content_url && (
                <p className="truncate text-xs text-muted">{lesson.content_url}</p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="secondary" onClick={() => setEditingId(lesson.id)}>
                Editar
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDelete(lesson.id)}
                disabled={deletingId === lesson.id}
              >
                Borrar
              </Button>
            </div>
          </Card>
        )
      )}

      {showAddForm ? (
        <LessonForm
          courseId={courseId}
          nextPosition={lessons.length}
          onSaved={refresh}
          onCancel={lessons.length > 0 ? () => setShowAddForm(false) : undefined}
        />
      ) : (
        <Button variant="secondary" onClick={() => setShowAddForm(true)}>
          + Agregar lección
        </Button>
      )}
    </div>
  );
}
