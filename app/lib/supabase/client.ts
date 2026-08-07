"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para el navegador. Solo se usa para el flujo de Auth
 * (signInWithOAuth, signOut) — nunca para leer/escribir las 6 tablas del
 * dominio directamente (RNF10 de Spec.md: eso pasa siempre por
 * `app/api/*`).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
