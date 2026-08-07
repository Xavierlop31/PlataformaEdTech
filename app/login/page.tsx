"use client";

import { useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm text-center">
        <h1 className="mb-2 text-2xl font-extrabold text-foreground">
          Apex Performance Learning
        </h1>
        <p className="mb-6 text-sm text-muted">
          Iniciá sesión para continuar. Solo Google en v1.
        </p>
        <Button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Redirigiendo…" : "Continuar con Google"}
        </Button>
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      </Card>
    </main>
  );
}
