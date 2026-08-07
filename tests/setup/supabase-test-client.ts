import { createClient as createAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "@/docs/contracts/types";

/**
 * Helpers para tests de integración contra Supabase CLI local (ADR-0001).
 * Requiere `supabase start` corriendo y las env vars locales (ver
 * .env.local.example) — nunca corre contra un proyecto real.
 *
 * IMPORTANTE (sin verificar en este entorno — no había Docker disponible
 * para ejecutar `supabase start` ni correr esta suite): la app en runtime
 * lee la sesión vía cookies (@supabase/ssr, `next/headers`), así que estos
 * tests además necesitan un servidor Next real corriendo (`npm run dev` o
 * `next start`) para poder pegarle por HTTP a `app/api/*` autenticados. El
 * helper `cookieHeaderFor` reproduce el formato de cookie que usa
 * `@supabase/ssr` (`sb-<project-ref>-auth-token`) — si la versión instalada
 * cambia ese formato, este helper es el único lugar a ajustar.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const APP_URL = process.env.TEST_APP_URL ?? "http://127.0.0.1:3000";

export function adminClient(): SupabaseClient {
  if (!SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY no está seteada — necesaria solo en tests, nunca en runtime de la app (RNF1)."
    );
  }
  return createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface TestUser {
  id: string;
  email: string;
  cookieHeader: string;
  accessToken: string;
  refreshToken: string;
}

let counter = 0;

/** Crea un usuario de prueba con perfil ya asignado (vía admin, sin pasar por EP-16). */
export async function createTestUser(role: Role): Promise<TestUser> {
  counter += 1;
  const email = `test-${Date.now()}-${counter}@example.test`;
  const password = "Test1234!";

  const admin = adminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !created.user) throw error ?? new Error("no se pudo crear el usuario de prueba");

  await admin.from("profiles").insert({ id: created.user.id, role });

  const { data: signIn, error: signInError } = await admin.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError || !signIn.session) {
    throw signInError ?? new Error("no se pudo iniciar sesión el usuario de prueba");
  }

  return {
    id: created.user.id,
    email,
    cookieHeader: cookieHeaderFor(signIn.session),
    accessToken: signIn.session.access_token,
    refreshToken: signIn.session.refresh_token,
  };
}

/** Como createTestUser, pero SIN insertar fila en profiles (simula "recién hizo OAuth"). */
export async function createAuthUserWithoutProfile(): Promise<TestUser> {
  counter += 1;
  const email = `test-noprofile-${Date.now()}-${counter}@example.test`;
  const password = "Test1234!";

  const admin = adminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !created.user) throw error ?? new Error("no se pudo crear el usuario de prueba");

  const { data: signIn, error: signInError } = await admin.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError || !signIn.session) {
    throw signInError ?? new Error("no se pudo iniciar sesión el usuario de prueba");
  }

  return {
    id: created.user.id,
    email,
    cookieHeader: cookieHeaderFor(signIn.session),
    accessToken: signIn.session.access_token,
    refreshToken: signIn.session.refresh_token,
  };
}

/**
 * Cliente Supabase autenticado como `user`, hablando directo con
 * PostgREST (sin pasar por Next.js) — para verificar una regla RLS "cruda"
 * como RLS-C5, que a propósito no tiene endpoint HTTP en v1.
 */
export async function userClient(user: TestUser): Promise<SupabaseClient> {
  const client = createAdminClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await client.auth.setSession({
    access_token: user.accessToken,
    refresh_token: user.refreshToken,
  });
  return client;
}

function cookieHeaderFor(session: { access_token: string; refresh_token: string }) {
  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0] || "local";
  const value = encodeURIComponent(
    JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
  );
  return `sb-${projectRef}-auth-token=${value}`;
}

/** Cliente anon "crudo" (sin sesión) — equivalente a un visitante no autenticado. */
export function anonClient(): SupabaseClient {
  return createAdminClient(SUPABASE_URL, ANON_KEY);
}

export async function apiFetch(
  path: string,
  init: RequestInit & { user?: TestUser } = {}
) {
  const { user, headers, ...rest } = init;
  return fetch(`${APP_URL}${path}`, {
    ...rest,
    headers: {
      ...(headers ?? {}),
      ...(user ? { cookie: user.cookieHeader } : {}),
    },
  });
}
