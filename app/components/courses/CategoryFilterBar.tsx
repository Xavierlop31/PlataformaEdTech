"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/app/lib/cn";
import type { Category } from "@/docs/contracts/types";

export function CategoryFilterBar({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("category");

  function select(slug: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) params.set("category", slug);
    else params.delete("category");
    params.delete("page");
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => select(null)}
        className={cn(
          "rounded-full border px-3 py-1 text-sm transition-colors",
          !current
            ? "border-papaya bg-papaya/10 text-papaya"
            : "border-surface text-muted hover:border-surface-bright"
        )}
      >
        Todas
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          onClick={() => select(c.slug)}
          className={cn(
            "rounded-full border px-3 py-1 text-sm transition-colors",
            current === c.slug
              ? "border-papaya bg-papaya/10 text-papaya"
              : "border-surface text-muted hover:border-surface-bright"
          )}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}
