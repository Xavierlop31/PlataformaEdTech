"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CreateProfileInput, Role } from "@/docs/contracts/types";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Input, Label, FieldError } from "@/app/components/ui/Input";

export function OnboardingForm() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("estudiante");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const body: CreateProfileInput = { role, full_name: fullName || undefined };
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? "No se pudo crear el perfil.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <h1 className="mb-1 text-xl font-bold text-foreground">Completá tu perfil</h1>
      <p className="mb-6 text-sm text-muted">
        Elegí tu rol — no se puede cambiar después.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Nombre completo</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={150} />
        </div>

        <div>
          <Label>Rol</Label>
          <div className="flex gap-3">
            {(["estudiante", "instructor"] as const).map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setRole(r)}
                className={
                  "flex-1 rounded-md border px-3 py-2 text-sm capitalize transition-colors " +
                  (role === r
                    ? "border-papaya bg-papaya/10 text-papaya"
                    : "border-surface text-muted hover:border-surface-bright")
                }
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <FieldError>{error}</FieldError>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Guardando…" : "Continuar"}
        </Button>
      </form>
    </Card>
  );
}
