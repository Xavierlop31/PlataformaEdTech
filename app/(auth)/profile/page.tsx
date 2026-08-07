import { createClient } from "@/app/lib/supabase/server";
import { Card } from "@/app/components/ui/Card";
import { ProfileForm } from "@/app/components/profile/ProfileForm";
import type { Profile } from "@/docs/contracts/types";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // El layout de (auth) ya garantiza que existan sesión y perfil.
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Mi perfil</h1>
      <Card>
        <ProfileForm profile={profile as Profile} />
      </Card>
    </main>
  );
}
