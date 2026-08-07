import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/app/components/ui/Button";

describe("Button", () => {
  it("renderiza el texto y responde al click", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Inscribirme</Button>);

    const button = screen.getByRole("button", { name: "Inscribirme" });
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("se deshabilita cuando disabled=true", () => {
    render(<Button disabled>Cargando…</Button>);
    expect(screen.getByRole("button", { name: "Cargando…" })).toBeDisabled();
  });
});
