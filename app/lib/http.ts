import { NextResponse } from "next/server";
import type { ApiError } from "@/docs/contracts/types";

/** Respuesta de error uniforme, forma `ApiError` de docs/contracts/types.ts. */
export function jsonError(
  status: number,
  error: ApiError["error"],
  message?: string
) {
  const body: ApiError = message ? { error, message } : { error };
  return NextResponse.json(body, { status });
}

export function jsonOk<T>(data: T, init?: { status?: number; headers?: HeadersInit }) {
  return NextResponse.json(data, { status: init?.status ?? 200, headers: init?.headers });
}

/** Código Postgres de violación de constraint único (usado para 409). */
export const PG_UNIQUE_VIOLATION = "23505";

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === PG_UNIQUE_VIOLATION
  );
}

/** Construye los headers de paginación (`X-Total-Count`) — Spec.md §5.4bis. */
export function paginationHeaders(total: number): HeadersInit {
  return { "X-Total-Count": String(total) };
}

export function parsePagination(searchParams: URLSearchParams) {
  const pageRaw = Number(searchParams.get("page") ?? "1");
  const limitRaw = Number(searchParams.get("limit") ?? "20");
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const limit = Number.isFinite(limitRaw) && limitRaw >= 1 ? Math.floor(limitRaw) : 20;
  const clampedLimit = Math.min(limit, 100);
  const from = (page - 1) * clampedLimit;
  const to = from + clampedLimit - 1;
  return { page, limit: clampedLimit, from, to };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}
