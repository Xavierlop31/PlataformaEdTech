import { headers } from "next/headers";

/**
 * Fetch server-side hacia nuestros propios Route Handlers, reenviando la
 * cookie de sesión. Server Components no llaman a Supabase directo para
 * datos de dominio (RNF10) — solo consumen `app/api/*`, igual que el
 * navegador. Excepción pragmática: checks de sesión/perfil para guards de
 * layout (ver app/lib/profile.ts), que no son datos de negocio de las 6 tablas.
 */
export async function serverFetch(path: string, init?: RequestInit) {
  const h = await headers();
  const host = h.get("host")!;
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const protocol = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  const cookie = h.get("cookie") ?? "";

  return fetch(`${protocol}://${host}${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), cookie },
    cache: "no-store",
  });
}

export async function serverFetchJson<T>(path: string, init?: RequestInit): Promise<{
  ok: boolean;
  status: number;
  data: T;
  totalCount: number | null;
}> {
  const res = await serverFetch(path, init);
  const data = (await res.json().catch(() => null)) as T;
  const totalCountHeader = res.headers.get("X-Total-Count");
  return {
    ok: res.ok,
    status: res.status,
    data,
    totalCount: totalCountHeader ? Number(totalCountHeader) : null,
  };
}
