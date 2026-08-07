"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile, UpdateProfileInput } from "@/docs/contracts/types";
import { Button } from "@/app/components/ui/Button";
import { Input, Label, FieldError } from "@/app/components/ui/Input";
import { RoleBadge } from "./RoleBadge";

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const body: UpdateProfileInput = { full_name: fullName };
    const res = await fetch("/api/profiles/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? "No se pudo actualizar el perfil.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted">Rol (inmutable):</span>
        <RoleBadge role={profile.role} />
      </div>

      <div>
        <Label>Nombre completo</Label>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={150} />
      </div>

      <FieldError>{error}</FieldError>
      {success && <p className="text-sm text-success">Perfil actualizado.</p>}

      <Button type="submit" disabled={loading}>
        {loading ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
