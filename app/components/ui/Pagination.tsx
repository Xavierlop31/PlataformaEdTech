"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "./Button";

export function Pagination({
  page,
  limit,
  total,
}: {
  page: number;
  limit: number;
  total: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (totalPages <= 1) return null;

  function goTo(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-center gap-3 py-6">
      <Button variant="secondary" disabled={page <= 1} onClick={() => goTo(page - 1)}>
        Anterior
      </Button>
      <span className="text-sm text-muted">
        Página {page} de {totalPages}
      </span>
      <Button
        variant="secondary"
        disabled={page >= totalPages}
        onClick={() => goTo(page + 1)}
      >
        Siguiente
      </Button>
    </div>
  );
}
