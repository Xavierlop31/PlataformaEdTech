import { loadFeature, describeFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { adminClient, apiFetch, createTestUser, userClient, type TestUser } from "../setup/supabase-test-client";

/** Implementa docs/gherkin/categories.feature (RLS-CAT1). */
const feature = await loadFeature("docs/gherkin/categories.feature", { language: "es" });

describeFeature(feature, ({ Scenario }) => {
  Scenario("Cualquiera puede listar las categorías", ({ Given, And, When, Then }) => {
    let categoryId: string;
    let response: Response;

    Given("que no hay ninguna sesión autenticada", () => {});

    And("existen categorías registradas", async () => {
      const admin = adminClient();
      const { data } = await admin
        .from("categories")
        .insert({ name: `Cat-${Date.now()}`, slug: `cat-${Date.now()}` })
        .select()
        .single();
      categoryId = data!.id;
    });

    When("el visitante solicita GET /api/categories", async () => {
      response = await apiFetch("/api/categories");
    });

    Then("la respuesta es 200", () => {
      expect(response.status).toBe(200);
    });

    And("la lista incluye las categorías existentes", async () => {
      const body = await response.json();
      expect(body.some((c: { id: string }) => c.id === categoryId)).toBe(true);
    });
  });

  Scenario(
    "Ningún usuario puede crear, editar o borrar categorías vía API en v1",
    ({ Given, When, Then }) => {
      let instructor: TestUser;
      let insertCount: number | null;

      Given("que un usuario autenticado tiene profiles.role = 'instructor'", async () => {
        instructor = await createTestUser("instructor");
      });

      When(
        "ese usuario intenta insertar/actualizar/borrar una fila en categories directamente",
        async () => {
          const client = await userClient(instructor);
          const { data } = await client
            .from("categories")
            .insert({ name: "Hackeada", slug: "hackeada" })
            .select();
          insertCount = data?.length ?? 0;
        }
      );

      Then(
        "la operación no afecta ninguna fila (no existe policy de escritura para authenticated/anon)",
        () => {
          expect(insertCount).toBe(0);
        }
      );
    }
  );
});
