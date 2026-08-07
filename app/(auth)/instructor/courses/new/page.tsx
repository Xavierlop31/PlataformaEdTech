import { serverFetchJson } from "@/app/lib/fetchApi";
import { Card } from "@/app/components/ui/Card";
import { CourseForm } from "@/app/components/courses/CourseForm";
import type { Category } from "@/docs/contracts/types";

export default async function NewCoursePage() {
  const categoriesRes = await serverFetchJson<Category[]>(`/api/categories`);

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Crear curso</h1>
      <Card>
        <CourseForm categories={categoriesRes.data ?? []} />
      </Card>
    </main>
  );
}
