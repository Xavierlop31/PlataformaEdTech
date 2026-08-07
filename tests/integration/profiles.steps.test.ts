import { loadFeature, describeFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import {
  adminClient,
  apiFetch,
  createAuthUserWithoutProfile,
  createTestUser,
  type TestUser,
} from "../setup/supabase-test-client";

/** Implementa docs/gherkin/profiles.feature (RLS-P1..P3). */
const feature = await loadFeature("docs/gherkin/profiles.feature", { language: "es" });

describeFeature(feature, ({ Scenario }) => {
  Scenario("Un usuario autenticado crea su perfil eligiendo su rol", ({ Given, When, Then, And }) => {
    let user: TestUser;
    let response: Response;

    Given("que un usuario completó el signup OAuth y no tiene fila en profiles", async () => {
      user = await createAuthUserWithoutProfile();
    });

    When('ese usuario solicita POST /api/profiles con role "estudiante" y full_name "Ada Lovelace"', async () => {
      response = await apiFetch("/api/profiles", {
        method: "POST",
        user,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "estudiante", full_name: "Ada Lovelace" }),
      });
    });

    Then("la respuesta es 201", () => {
      expect(response.status).toBe(201);
    });

    And('queda creada una fila en profiles con id = auth.uid() y role = "estudiante"', async () => {
      const admin = adminClient();
      const { data } = await admin.from("profiles").select("*").eq("id", user.id).single();
      expect(data!.role).toBe("estudiante");
    });
  });

  Scenario("Crear un segundo perfil para el mismo usuario devuelve 409", ({ Given, When, Then, And }) => {
    let user: TestUser;
    let response: Response;

    Given("que el usuario U ya tiene una fila en profiles", async () => {
      user = await createTestUser("estudiante");
    });

    When("el usuario U solicita POST /api/profiles nuevamente", async () => {
      response = await apiFetch("/api/profiles", {
        method: "POST",
        user,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "estudiante" }),
      });
    });

    Then("la respuesta es 409", () => {
      expect(response.status).toBe(409);
    });

    And('el cuerpo de la respuesta indica error "already_has_profile"', async () => {
      const body = await response.json();
      expect(body.error).toBe("already_has_profile");
    });
  });

  Scenario("Crear un perfil con un rol inválido devuelve 400", ({ Given, When, Then, And }) => {
    let user: TestUser;
    let response: Response;

    Given("que un usuario completó el signup OAuth y no tiene fila en profiles", async () => {
      user = await createAuthUserWithoutProfile();
    });

    When('ese usuario solicita POST /api/profiles con role "admin"', async () => {
      response = await apiFetch("/api/profiles", {
        method: "POST",
        user,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "admin" }),
      });
    });

    Then("la respuesta es 400", () => {
      expect(response.status).toBe(400);
    });

    And('el cuerpo de la respuesta indica error "validation_error"', async () => {
      const body = await response.json();
      expect(body.error).toBe("validation_error");
    });
  });

  Scenario("Un usuario sin perfil recibe 404 en /profiles/me", ({ Given, When, Then, And }) => {
    let user: TestUser;
    let response: Response;

    Given("que un usuario tiene sesión pero no ha creado su perfil", async () => {
      user = await createAuthUserWithoutProfile();
    });

    When("ese usuario solicita GET /api/profiles/me", async () => {
      response = await apiFetch("/api/profiles/me", { user });
    });

    Then("la respuesta es 404", () => {
      expect(response.status).toBe(404);
    });

    And('el cuerpo de la respuesta indica error "not_found"', async () => {
      const body = await response.json();
      expect(body.error).toBe("not_found");
    });
  });

  Scenario(
    "Cualquiera puede leer el nombre y rol público de un perfil",
    ({ Given, When, Then }) => {
      let courseId: string;
      let response: Response;

      Given('que existe un perfil con full_name "Ada Lovelace" y role "instructor"', async () => {
        const instructor = await createTestUser("instructor");
        const admin = adminClient();
        await admin.from("profiles").update({ full_name: "Ada Lovelace" }).eq("id", instructor.id);
        const { data } = await admin
          .from("courses")
          .insert({ instructor_id: instructor.id, title: "Curso", price: 0, is_published: true })
          .select()
          .single();
        courseId = data!.id;
      });

      When("un visitante anónimo consulta el detalle de un curso de ese instructor (EP-03)", async () => {
        response = await apiFetch(`/api/courses/${courseId}`);
      });

      Then('la respuesta incluye instructor.full_name = "Ada Lovelace"', async () => {
        const body = await response.json();
        expect(body.instructor.full_name).toBe("Ada Lovelace");
      });
    }
  );

  Scenario("Un usuario solo puede editar su propio perfil", ({ Given, When, Then }) => {
    let userA: TestUser;
    let userB: TestUser;
    let response: Response;

    Given("que existe un perfil perteneciente al usuario A", async () => {
      userA = await createTestUser("estudiante");
      userB = await createTestUser("estudiante");
    });

    When("el usuario B intenta PATCH /api/profiles/me con datos del perfil de A", async () => {
      response = await apiFetch("/api/profiles/me", {
        method: "PATCH",
        user: userB,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: "Nombre de A" }),
      });
    });

    Then("la respuesta solo afecta el perfil de B, nunca el de A", async () => {
      expect(response.status).toBe(200);
      const admin = adminClient();
      const { data: profileA } = await admin.from("profiles").select("full_name").eq("id", userA.id).single();
      expect(profileA!.full_name).not.toBe("Nombre de A");
    });

    When('el usuario A solicita PATCH /api/profiles/me con full_name "Nuevo Nombre"', async () => {
      response = await apiFetch("/api/profiles/me", {
        method: "PATCH",
        user: userA,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: "Nuevo Nombre" }),
      });
    });

    Then("la respuesta es 200 y el perfil de A queda actualizado", async () => {
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.full_name).toBe("Nuevo Nombre");
    });
  });

  Scenario("El rol de un perfil es inmutable", ({ Given, When, Then, And }) => {
    let user: TestUser;
    let response: Response;

    Given('que existe un perfil con role "estudiante"', async () => {
      user = await createTestUser("estudiante");
    });

    When('el dueño de ese perfil solicita PATCH /api/profiles/me con role "instructor"', async () => {
      response = await apiFetch("/api/profiles/me", {
        method: "PATCH",
        user,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "instructor" }),
      });
    });

    Then("la respuesta es 400", () => {
      expect(response.status).toBe(400);
    });

    And('el perfil conserva role = "estudiante"', async () => {
      const admin = adminClient();
      const { data } = await admin.from("profiles").select("role").eq("id", user.id).single();
      expect(data!.role).toBe("estudiante");
    });
  });
});
