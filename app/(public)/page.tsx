import { serverFetchJson } from "@/app/lib/fetchApi";
import { CourseGrid } from "@/app/components/courses/CourseGrid";
import { CategoryFilterBar } from "@/app/components/courses/CategoryFilterBar";
import { Pagination } from "@/app/components/ui/Pagination";
import type { Category, Course } from "@/docs/contracts/types";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const { category, page } = await searchParams;
  const pageNum = Number(page ?? "1") || 1;

  const query = new URLSearchParams({ page: String(pageNum), limit: "12" });
  if (category) query.set("category", category);

  const [coursesRes, categoriesRes] = await Promise.all([
    serverFetchJson<Course[]>(`/api/courses?${query.toString()}`),
    serverFetchJson<Category[]>(`/api/categories`),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-foreground">
          Aprendé a alta velocidad.
        </h1>
        <p className="mt-2 text-muted">
          Cursos publicados por instructores de Apex Performance Learning.
        </p>
      </div>

      <div className="mb-6">
        <CategoryFilterBar categories={categoriesRes.data ?? []} />
      </div>

      <CourseGrid courses={coursesRes.data ?? []} />

      <Pagination page={pageNum} limit={12} total={coursesRes.totalCount ?? 0} />
    </main>
  );
}
