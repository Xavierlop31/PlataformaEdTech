import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

/**
 * Guard de (auth): exige sesión Y perfil (F0/RNF9 de Spec.md). El caso
 * "autenticado sin perfil" se resuelve mandando a /onboarding, que vive
 * fuera de este grupo para evitar un loop de redirects.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/onboarding");

  return <>{children}</>;
}
