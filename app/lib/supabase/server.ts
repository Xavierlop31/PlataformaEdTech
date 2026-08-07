import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Cliente Supabase scoped a la sesión del usuario (RNF10 de Spec.md).
 * Único punto de acceso a datos permitido — nunca se usa `service_role` aquí.
 * Usar exclusivamente dentro de Route Handlers / Server Components.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Se ignora: puede llamarse desde un Server Component sin permiso de escritura
            // de cookies; el middleware (app/lib/supabase/middleware.ts) refresca la sesión.
          }
        },
      },
    }
  );
}
