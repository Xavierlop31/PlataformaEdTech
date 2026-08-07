import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import { getSessionProfile } from "@/app/lib/profile";
import { Button } from "@/app/components/ui/Button";

export async function Navbar() {
  const supabase = await createClient();
  const { user, profile } = await getSessionProfile(supabase);

  return (
    <header className="sticky top-0 z-10 border-b border-surface bg-carbon/95 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-foreground">
          Apex <span className="text-papaya">Performance</span> Learning
        </Link>

        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-muted hover:text-foreground">
            Catálogo
          </Link>

          {!user && (
            <Link href="/login">
              <Button variant="primary">Iniciar sesión</Button>
            </Link>
          )}

          {user && !profile && (
            <Link href="/onboarding" className="text-papaya hover:underline">
              Completar perfil
            </Link>
          )}

          {user && profile && (
            <>
              <Link href="/enrollments" className="text-muted hover:text-foreground">
                Mi aprendizaje
              </Link>
              {profile.role === "instructor" && (
                <Link href="/instructor/courses" className="text-muted hover:text-foreground">
                  Mis cursos
                </Link>
              )}
              <Link href="/profile" className="text-muted hover:text-foreground">
                {profile.full_name ?? "Perfil"}
              </Link>
              <form action="/auth/signout" method="post">
                <Button variant="ghost" type="submit">
                  Salir
                </Button>
              </form>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
