"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Category, Course } from "@/docs/contracts/types";
import { Button } from "@/app/components/ui/Button";
import { Input, Textarea, Select, Label, FieldError } from "@/app/components/ui/Input";

export function CourseForm({
  course,
  categories,
}: {
  course?: Course;
  categories: Category[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(course?.title ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [price, setPrice] = useState(course?.price ?? 0);
  const [categoryId, setCategoryId] = useState(course?.category_id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const body = {
      title,
      description: description || undefined,
      price: Number(price),
      category_id: categoryId || undefined,
    };

    const url = course ? `/api/courses/${course.id}` : "/api/courses";
    const method = course ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.message ?? "No se pudo guardar el curso.");
      setLoading(false);
      return;
    }

    if (course) {
      router.refresh();
    } else {
      router.push(`/instructor/courses/${data.id}/lessons`);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Título</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
        />
      </div>

      <div>
        <Label>Descripción</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={5000}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Precio (informativo, sin gate de pago v1)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </div>
        <div>
          <Label>Categoría</Label>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <FieldError>{error}</FieldError>

      <Button type="submit" disabled={loading}>
        {loading ? "Guardando…" : course ? "Guardar cambios" : "Crear curso"}
      </Button>
    </form>
  );
}
