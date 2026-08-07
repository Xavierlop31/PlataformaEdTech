import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { OnboardingForm } from "@/app/components/profile/OnboardingForm";

export default async function OnboardingPage() {
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

  if (profile) redirect("/");

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4">
      <OnboardingForm />
    </main>
  );
}
