import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getSessionProfile } from "@/app/lib/profile";

/** Guard adicional sobre (auth): exige role='instructor' (Spec.md §2/F1-F5). */
export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { profile } = await getSessionProfile(supabase);

  if (!profile || profile.role !== "instructor") redirect("/");

  return <>{children}</>;
}
