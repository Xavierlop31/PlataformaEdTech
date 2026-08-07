import { loadFeature, describeFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import {
  createTestUser,
  apiFetch,
  adminClient,
  userClient,
  type TestUser,
} from "../setup/supabase-test-client";

/**
 * Implementa docs/gherkin/courses.feature (RLS-C1..C6). Ver caveat de
 * autenticación por cookie en tests/setup/supabase-test-client.ts — esta
 * suite no se pudo ejecutar en este entorno (sin Docker disponible para
 * `supabase start`), ver PlanImplementacion.md / resumen final.
 */
const feature = await loadFeature("docs/gherkin/courses.feature", { language: "es" });

describeFeature(feature, ({ Scenario }) => {
  Scenario("Un visitante anónimo ve los cursos publicados", ({ Given, And, When, Then }) => {
    let instructor: TestUser;
    let courseId: string;
    let response: Response;

    Given("que no hay ninguna sesión autenticada", () => {
      // no-op: apiFetch sin `user` = sin cookie de sesión.
    });

    And("existe un curso con is_published = true", async () => {
      instructor = await createTestUser("instructor");
      const admin = adminClient();
      const { data } = await admin
        .from("courses")
        .insert({ instructor_id: instructor.id, title: "Curso publicado", price: 0, is_published: true })
        .select()
        .single();
      courseId = data!.id;
    });

    When("el visitante solicita GET /api/courses", async () => {
      response = await apiFetch("/api/courses");
    });

    Then("la respuesta es 200", () => {
      expect(response.status).toBe(200);
    });

    And("la lista incluye ese curso", async () => {
      const body = await response.json();
      expect(body.some((c: { id: string }) => c.id === courseId)).toBe(true);
    });
  });

  Scenario(
    "Un curso no publicado no es visible para nadie excepto su dueño",
    ({ Given, When, Then }) => {
      let instructorA: TestUser;
      let instructorB: TestUser;
      let courseId: string;
      let response: Response;

      Given("que existe un curso con is_published = false perteneciente al instructor A", async () => {
        instructorA = await createTestUser("instructor");
        instructorB = await createTestUser("instructor");
        const admin = adminClient();
        const { data } = await admin
          .from("courses")
          .insert({ instructor_id: instructorA.id, title: "Borrador", price: 0, is_published: false })
          .select()
          .single();
        courseId = data!.id;
      });

      When("el instructor B (distinto de A) solicita GET /api/courses/:id de ese curso", async () => {
        response = await apiFetch(`/api/courses/${courseId}`, { user: instructorB });
      });

      Then("la respuesta es 404", () => {
        expect(response.status).toBe(404);
      });

      When("el instructor A solicita GET /api/courses/:id de ese mismo curso", async () => {
        response = await apiFetch(`/api/courses/${courseId}`, { user: instructorA });
      });

      Then("la respuesta es 200 y devuelve el curso", async () => {
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.id).toBe(courseId);
      });
    }
  );

  Scenario("Solo el instructor dueño puede editar su curso", ({ Given, When, Then }) => {
    let instructorA: TestUser;
    let instructorB: TestUser;
    let courseId: string;
    let response: Response;

    Given("que existe un curso publicado perteneciente al instructor A", async () => {
      instructorA = await createTestUser("instructor");
      instructorB = await createTestUser("instructor");
      const admin = adminClient();
      const { data } = await admin
        .from("courses")
        .insert({ instructor_id: instructorA.id, title: "Curso", price: 0, is_published: true })
        .select()
        .single();
      courseId = data!.id;
    });

    When("el instructor B intenta PATCH /api/courses/:id sobre ese curso", async () => {
      response = await apiFetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        user: instructorB,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Hackeado" }),
      });
    });

    Then("la respuesta es 403", () => {
      expect(response.status).toBe(403);
    });

    When("el instructor A intenta PATCH /api/courses/:id sobre ese mismo curso", async () => {
      response = await apiFetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        user: instructorA,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Actualizado" }),
      });
    });

    Then("la respuesta es 200 y el curso queda actualizado", async () => {
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.title).toBe("Actualizado");
    });
  });

  Scenario("Editar un curso ajeno publicado da 403", ({ Given, When, Then, And }) => {
    let instructorB: TestUser;
    let courseId: string;
    let response: Response;

    Given("que existe un curso con is_published = true perteneciente al instructor A", async () => {
      const instructorA = await createTestUser("instructor");
      instructorB = await createTestUser("instructor");
      const admin = adminClient();
      const { data } = await admin
        .from("courses")
        .insert({ instructor_id: instructorA.id, title: "Curso", price: 0, is_published: true })
        .select()
        .single();
      courseId = data!.id;
    });

    When("el instructor B (distinto de A) intenta PATCH /api/courses/:id sobre ese curso", async () => {
      response = await apiFetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        user: instructorB,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "x" }),
      });
    });

    Then("la respuesta es 403", () => {
      expect(response.status).toBe(403);
    });

    And('el cuerpo de la respuesta indica error "forbidden"', async () => {
      const body = await response.json();
      expect(body.error).toBe("forbidden");
    });
  });

  Scenario("Editar un curso ajeno no publicado da 404, no 403", ({ Given, When, Then, And }) => {
    let instructorB: TestUser;
    let courseId: string;
    let response: Response;

    Given("que existe un curso con is_published = false perteneciente al instructor A", async () => {
      const instructorA = await createTestUser("instructor");
      instructorB = await createTestUser("instructor");
      const admin = adminClient();
      const { data } = await admin
        .from("courses")
        .insert({ instructor_id: instructorA.id, title: "Curso", price: 0, is_published: false })
        .select()
        .single();
      courseId = data!.id;
    });

    When("el instructor B (distinto de A) intenta PATCH /api/courses/:id sobre ese curso", async () => {
      response = await apiFetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        user: instructorB,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "x" }),
      });
    });

    Then("la respuesta es 404", () => {
      expect(response.status).toBe(404);
    });

    And('el cuerpo de la respuesta indica error "not_found"', async () => {
      const body = await response.json();
      expect(body.error).toBe("not_found");
    });

    And("la respuesta NO es 403 (el instructor B no puede ver que el curso existe)", () => {
      expect(response.status).not.toBe(403);
    });
  });

  Scenario(
    "Solo un usuario con rol instructor puede crear un curso",
    ({ Given, When, Then }) => {
      let student: TestUser;
      let instructor: TestUser;
      let response: Response;

      Given("que un usuario autenticado tiene profiles.role = 'estudiante'", async () => {
        student = await createTestUser("estudiante");
      });

      When("ese usuario intenta POST /api/courses", async () => {
        response = await apiFetch("/api/courses", {
          method: "POST",
          user: student,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "x", price: 0 }),
        });
      });

      Then("la respuesta es 403", () => {
        expect(response.status).toBe(403);
      });

      Given("que un usuario autenticado tiene profiles.role = 'instructor'", async () => {
        instructor = await createTestUser("instructor");
      });

      When(
        "ese usuario intenta POST /api/courses con instructor_id = su propio auth.uid()",
        async () => {
          response = await apiFetch("/api/courses", {
            method: "POST",
            user: instructor,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Nuevo curso", price: 10 }),
          });
        }
      );

      Then("la respuesta es 201 y el curso queda creado con is_published = false", async () => {
        expect(response.status).toBe(201);
        const body = await response.json();
        expect(body.is_published).toBe(false);
      });
    }
  );

  Scenario("Solo el instructor dueño puede borrar su curso", ({ Given, When, Then }) => {
    // RLS-C5 no tiene endpoint HTTP en v1 (decisión validada, Spec.md) — se
    // verifica la policy directo contra PostgREST, con un cliente scoped a
    // cada usuario (no admin), igual que hace la app en runtime.
    let instructorA: TestUser;
    let instructorB: TestUser;
    let courseId: string;
    let lastDeleteCount: number | null;

    Given("que existe un curso perteneciente al instructor A", async () => {
      instructorA = await createTestUser("instructor");
      instructorB = await createTestUser("instructor");
      const admin = adminClient();
      const { data } = await admin
        .from("courses")
        .insert({ instructor_id: instructorA.id, title: "Curso", price: 0 })
        .select()
        .single();
      courseId = data!.id;
    });

    When("el instructor B intenta eliminar ese curso", async () => {
      const client = await userClient(instructorB);
      const { count } = await client
        .from("courses")
        .delete({ count: "exact" })
        .eq("id", courseId);
      lastDeleteCount = count;
    });

    Then("la operación no afecta ninguna fila", () => {
      expect(lastDeleteCount ?? 0).toBe(0);
    });

    When("el instructor A intenta eliminar ese mismo curso", async () => {
      const client = await userClient(instructorA);
      const { count } = await client
        .from("courses")
        .delete({ count: "exact" })
        .eq("id", courseId);
      lastDeleteCount = count;
    });

    Then("la operación elimina exactamente una fila", () => {
      expect(lastDeleteCount).toBe(1);
    });
  });

  Scenario("Publicar un curso sin lecciones es rechazado", ({ Given, When, Then, And }) => {
    let instructor: TestUser;
    let courseId: string;
    let response: Response;

    Given("que existe un curso perteneciente al instructor A con 0 lecciones", async () => {
      instructor = await createTestUser("instructor");
      const admin = adminClient();
      const { data } = await admin
        .from("courses")
        .insert({ instructor_id: instructor.id, title: "Sin lecciones", price: 0 })
        .select()
        .single();
      courseId = data!.id;
    });

    When("el instructor A intenta PATCH /api/courses/:id con is_published = true", async () => {
      response = await apiFetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        user: instructor,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: true }),
      });
    });

    Then("la respuesta es 400", () => {
      expect(response.status).toBe(400);
    });

    And('el cuerpo de la respuesta indica error "validation_error"', async () => {
      const body = await response.json();
      expect(body.error).toBe("validation_error");
    });

    And("el curso permanece con is_published = false", async () => {
      const admin = adminClient();
      const { data } = await admin.from("courses").select("is_published").eq("id", courseId).single();
      expect(data!.is_published).toBe(false);
    });

    Given("que el instructor A agrega al menos una lección al curso", async () => {
      const admin = adminClient();
      await admin.from("lessons").insert({ course_id: courseId, title: "Clase 1" });
    });

    When("el instructor A intenta PATCH /api/courses/:id con is_published = true nuevamente", async () => {
      response = await apiFetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        user: instructor,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: true }),
      });
    });

    Then("la respuesta es 200 y el curso queda publicado", async () => {
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.is_published).toBe(true);
    });
  });

  Scenario("Crear un curso sin sesión devuelve 401", ({ Given, When, Then, And }) => {
    let response: Response;

    Given("que no hay ninguna sesión autenticada", () => {});

    When("se solicita POST /api/courses", async () => {
      response = await apiFetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "x", price: 0 }),
      });
    });

    Then("la respuesta es 401", () => {
      expect(response.status).toBe(401);
    });

    And('el cuerpo de la respuesta indica error "unauthorized"', async () => {
      const body = await response.json();
      expect(body.error).toBe("unauthorized");
    });
  });

  Scenario("Editar un curso inexistente devuelve 404", ({ Given, And, When, Then }) => {
    let instructor: TestUser;
    let response: Response;
    const fakeId = "00000000-0000-0000-0000-000000000000";

    Given("que un instructor autenticado tiene sesión válida", async () => {
      instructor = await createTestUser("instructor");
    });

    And("no existe ningún curso con el id solicitado", () => {});

    When("el instructor intenta PATCH /api/courses/:id sobre ese id inexistente", async () => {
      response = await apiFetch(`/api/courses/${fakeId}`, {
        method: "PATCH",
        user: instructor,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "x" }),
      });
    });

    Then("la respuesta es 404", () => {
      expect(response.status).toBe(404);
    });

    And('el cuerpo de la respuesta indica error "not_found"', async () => {
      const body = await response.json();
      expect(body.error).toBe("not_found");
    });
  });

  Scenario("Crear un curso con datos inválidos devuelve 400", ({ Given, When, Then, And }) => {
    let instructor: TestUser;
    let response: Response;

    Given("que un usuario autenticado tiene profiles.role = 'instructor'", async () => {
      instructor = await createTestUser("instructor");
    });

    When('ese usuario intenta POST /api/courses con title = "" y price = -5', async () => {
      response = await apiFetch("/api/courses", {
        method: "POST",
        user: instructor,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "", price: -5 }),
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
});
