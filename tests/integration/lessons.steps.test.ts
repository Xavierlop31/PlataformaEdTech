import { loadFeature, describeFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { adminClient, apiFetch, createTestUser, type TestUser } from "../setup/supabase-test-client";

/** Implementa docs/gherkin/lessons.feature (RLS-L1..L5). */
const feature = await loadFeature("docs/gherkin/lessons.feature", { language: "es" });

async function courseWithLesson(instructorId: string, published: boolean, title = "Curso") {
  const admin = adminClient();
  const { data: course } = await admin
    .from("courses")
    .insert({ instructor_id: instructorId, title, price: 0, is_published: false })
    .select()
    .single();
  const { data: lesson } = await admin
    .from("lessons")
    .insert({ course_id: course!.id, title: "Clase 1" })
    .select()
    .single();
  if (published) {
    await admin.from("courses").update({ is_published: true }).eq("id", course!.id);
  }
  return { courseId: course!.id as string, lessonId: lesson!.id as string };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario("Un estudiante inscrito ve las lecciones del curso", ({ Given, And, When, Then }) => {
    let student: TestUser;
    let courseId: string;
    let response: Response;

    Given("que el estudiante E está inscrito en el curso C", async () => {
      student = await createTestUser("estudiante");
      const instructor = await createTestUser("instructor");
      ({ courseId } = await courseWithLesson(instructor.id, true));
      await apiFetch(`/api/courses/${courseId}/enroll`, { method: "POST", user: student });
    });

    And("el curso C tiene una o más lecciones", () => {});

    When("el estudiante E solicita GET /api/courses/C/lessons", async () => {
      response = await apiFetch(`/api/courses/${courseId}/lessons`, { user: student });
    });

    Then("la respuesta es 200", () => {
      expect(response.status).toBe(200);
    });

    And("la lista incluye las lecciones del curso C", async () => {
      const body = await response.json();
      expect(body.length).toBeGreaterThan(0);
    });
  });

  Scenario(
    "Un estudiante NO inscrito recibe lista vacía, no un error",
    ({ Given, And, When, Then }) => {
      let student: TestUser;
      let courseId: string;
      let response: Response;

      Given("que el estudiante E no está inscrito en el curso C", async () => {
        student = await createTestUser("estudiante");
        const instructor = await createTestUser("instructor");
        ({ courseId } = await courseWithLesson(instructor.id, true));
      });

      And("el curso C tiene una o más lecciones", () => {});

      When("el estudiante E solicita GET /api/courses/C/lessons", async () => {
        response = await apiFetch(`/api/courses/${courseId}/lessons`, { user: student });
      });

      Then("la respuesta es 200", () => {
        expect(response.status).toBe(200);
      });

      And("el cuerpo de la respuesta es una lista vacía []", async () => {
        const body = await response.json();
        expect(body).toEqual([]);
      });

      And("la respuesta NO es 403 ni 401", () => {
        expect([403, 401]).not.toContain(response.status);
      });
    }
  );

  Scenario(
    "Un visitante anónimo recibe lista vacía, no un error",
    ({ Given, And, When, Then }) => {
      let courseId: string;
      let response: Response;

      Given("que no hay ninguna sesión autenticada", () => {});

      And("el curso C tiene una o más lecciones", async () => {
        const instructor = await createTestUser("instructor");
        ({ courseId } = await courseWithLesson(instructor.id, true));
      });

      When("el visitante solicita GET /api/courses/C/lessons", async () => {
        response = await apiFetch(`/api/courses/${courseId}/lessons`);
      });

      Then("la respuesta es 200", () => {
        expect(response.status).toBe(200);
      });

      And("el cuerpo de la respuesta es una lista vacía []", async () => {
        const body = await response.json();
        expect(body).toEqual([]);
      });
    }
  );

  Scenario(
    "El instructor dueño ve las lecciones de su propio curso sin estar inscrito",
    ({ Given, And, When, Then }) => {
      let instructor: TestUser;
      let courseId: string;
      let response: Response;

      Given("que el curso C pertenece al instructor I", async () => {
        instructor = await createTestUser("instructor");
        ({ courseId } = await courseWithLesson(instructor.id, true));
      });

      And("el instructor I no tiene una fila de inscripción en el curso C", () => {});

      When("el instructor I solicita GET /api/courses/C/lessons", async () => {
        response = await apiFetch(`/api/courses/${courseId}/lessons`, { user: instructor });
      });

      Then("la respuesta es 200", () => {
        expect(response.status).toBe(200);
      });

      And("la lista incluye las lecciones del curso C", async () => {
        const body = await response.json();
        expect(body.length).toBeGreaterThan(0);
      });
    }
  );

  Scenario(
    "Solo el instructor dueño puede crear lecciones en su curso",
    ({ Given, When, Then }) => {
      let instructorA: TestUser;
      let instructorB: TestUser;
      let courseId: string;
      let response: Response;

      Given("que el curso C pertenece al instructor A", async () => {
        instructorA = await createTestUser("instructor");
        instructorB = await createTestUser("instructor");
        ({ courseId } = await courseWithLesson(instructorA.id, true));
      });

      When("el instructor B intenta POST /api/courses/C/lessons", async () => {
        response = await apiFetch(`/api/courses/${courseId}/lessons`, {
          method: "POST",
          user: instructorB,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Intrusa" }),
        });
      });

      Then("la respuesta es 403", () => {
        expect(response.status).toBe(403);
      });

      When("el instructor A intenta POST /api/courses/C/lessons", async () => {
        response = await apiFetch(`/api/courses/${courseId}/lessons`, {
          method: "POST",
          user: instructorA,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Clase 2" }),
        });
      });

      Then("la respuesta es 201 y la lección queda creada", () => {
        expect(response.status).toBe(201);
      });
    }
  );

  Scenario(
    "Solo el instructor dueño puede editar o borrar una lección",
    ({ Given, When, Then }) => {
      let instructorA: TestUser;
      let courseId: string;
      let lessonId: string;
      let response: Response;

      Given("que el curso C pertenece al instructor A y tiene una lección L", async () => {
        instructorA = await createTestUser("instructor");
        ({ courseId, lessonId } = await courseWithLesson(instructorA.id, true));
      });

      When("el instructor A intenta PATCH /api/courses/C/lessons/L", async () => {
        response = await apiFetch(`/api/courses/${courseId}/lessons/${lessonId}`, {
          method: "PATCH",
          user: instructorA,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Actualizada" }),
        });
      });

      Then("la respuesta es 200 y la lección queda actualizada", () => {
        expect(response.status).toBe(200);
      });

      When("el instructor A intenta DELETE /api/courses/C/lessons/L", async () => {
        // agrega una segunda lección para no disparar RLS-L5 (auto-despublicar)
        const admin = adminClient();
        await admin.from("lessons").insert({ course_id: courseId, title: "Clase 2" });
        response = await apiFetch(`/api/courses/${courseId}/lessons/${lessonId}`, {
          method: "DELETE",
          user: instructorA,
        });
      });

      Then("la respuesta es 204 y la lección queda eliminada", () => {
        expect(response.status).toBe(204);
      });
    }
  );

  Scenario(
    "Un instructor no relacionado recibe 404, no 403, al intentar editar una lección ajena",
    ({ Given, And, When, Then }) => {
      let instructorB: TestUser;
      let courseId: string;
      let lessonId: string;
      let response: Response;

      Given("que el curso C pertenece al instructor A y tiene una lección L", async () => {
        const instructorA = await createTestUser("instructor");
        ({ courseId, lessonId } = await courseWithLesson(instructorA.id, true));
      });

      And(
        "el instructor B no está inscrito en el curso C (los instructores no se inscriben) ni es su dueño",
        async () => {
          instructorB = await createTestUser("instructor");
        }
      );

      When("el instructor B intenta PATCH /api/courses/C/lessons/L", async () => {
        response = await apiFetch(`/api/courses/${courseId}/lessons/${lessonId}`, {
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

      When("el instructor B intenta DELETE /api/courses/C/lessons/L", async () => {
        response = await apiFetch(`/api/courses/${courseId}/lessons/${lessonId}`, {
          method: "DELETE",
          user: instructorB,
        });
      });

      Then("la respuesta del DELETE también es 404", () => {
        expect(response.status).toBe(404);
      });
    }
  );

  Scenario(
    "Un estudiante inscrito que no es dueño recibe 403 al intentar editar una lección",
    ({ Given, And, When, Then }) => {
      let student: TestUser;
      let courseId: string;
      let lessonId: string;
      let response: Response;

      Given("que el curso C pertenece al instructor A y tiene una lección L", async () => {
        const instructorA = await createTestUser("instructor");
        ({ courseId, lessonId } = await courseWithLesson(instructorA.id, true));
      });

      And(
        "el estudiante E está inscrito en el curso C (puede ver la lección L, pero no es su dueño)",
        async () => {
          student = await createTestUser("estudiante");
          await apiFetch(`/api/courses/${courseId}/enroll`, { method: "POST", user: student });
        }
      );

      When("el estudiante E intenta PATCH /api/courses/C/lessons/L", async () => {
        response = await apiFetch(`/api/courses/${courseId}/lessons/${lessonId}`, {
          method: "PATCH",
          user: student,
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

      When("el estudiante E intenta DELETE /api/courses/C/lessons/L", async () => {
        response = await apiFetch(`/api/courses/${courseId}/lessons/${lessonId}`, {
          method: "DELETE",
          user: student,
        });
      });

      Then("la respuesta del DELETE también es 403", () => {
        expect(response.status).toBe(403);
      });
    }
  );

  Scenario("Un curso inexistente devuelve 404, no lista vacía", ({ Given, When, Then, And }) => {
    let response: Response;
    const fakeId = "00000000-0000-0000-0000-000000000000";

    Given("que no existe ningún curso con el id solicitado", () => {});

    When("cualquier visitante solicita GET /api/courses/:id/lessons con ese id inexistente", async () => {
      response = await apiFetch(`/api/courses/${fakeId}/lessons`);
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
    "Un curso no publicado devuelve 404 al pedir sus lecciones (salvo el dueño)",
    ({ Given, When, Then }) => {
      let instructor: TestUser;
      let student: TestUser;
      let courseId: string;
      let response: Response;

      Given("que el curso C no está publicado y pertenece al instructor A", async () => {
        instructor = await createTestUser("instructor");
        ({ courseId } = await courseWithLesson(instructor.id, false));
        student = await createTestUser("estudiante");
      });

      When(
        "el estudiante E (no inscrito, curso no visible para él) solicita GET /api/courses/C/lessons",
        async () => {
          response = await apiFetch(`/api/courses/${courseId}/lessons`, { user: student });
        }
      );

      Then("la respuesta es 404", () => {
        expect(response.status).toBe(404);
      });

      When("el instructor A solicita GET /api/courses/C/lessons", async () => {
        response = await apiFetch(`/api/courses/${courseId}/lessons`, { user: instructor });
      });

      Then("la respuesta es 200 y la lista incluye las lecciones del curso C", async () => {
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.length).toBeGreaterThan(0);
      });
    }
  );

  Scenario(
    "Borrar la última lección de un curso publicado lo despublica",
    ({ Given, When, Then, And }) => {
      let instructor: TestUser;
      let courseId: string;
      let lessonId: string;
      let response: Response;

      Given("que el curso C está publicado y tiene exactamente una lección L", async () => {
        instructor = await createTestUser("instructor");
        ({ courseId, lessonId } = await courseWithLesson(instructor.id, true));
      });

      When("el instructor dueño solicita DELETE /api/courses/C/lessons/L", async () => {
        response = await apiFetch(`/api/courses/${courseId}/lessons/${lessonId}`, {
          method: "DELETE",
          user: instructor,
        });
      });

      Then("la respuesta es 204", () => {
        expect(response.status).toBe(204);
      });

      And("el curso C queda con is_published = false", async () => {
        const admin = adminClient();
        const { data } = await admin.from("courses").select("is_published").eq("id", courseId).single();
        expect(data!.is_published).toBe(false);
      });
    }
  );

  Scenario(
    "Borrar una lección que no es la última no cambia la publicación del curso",
    ({ Given, When, Then, And }) => {
      let instructor: TestUser;
      let courseId: string;
      let lessonId: string;
      let response: Response;

      Given("que el curso C está publicado y tiene dos o más lecciones", async () => {
        instructor = await createTestUser("instructor");
        ({ courseId, lessonId } = await courseWithLesson(instructor.id, true));
        const admin = adminClient();
        await admin.from("lessons").insert({ course_id: courseId, title: "Clase 2" });
      });

      When("el instructor dueño borra una de esas lecciones (quedando al menos 1 restante)", async () => {
        response = await apiFetch(`/api/courses/${courseId}/lessons/${lessonId}`, {
          method: "DELETE",
          user: instructor,
        });
      });

      Then("la respuesta es 204", () => {
        expect(response.status).toBe(204);
      });

      And("el curso C sigue con is_published = true", async () => {
        const admin = adminClient();
        const { data } = await admin.from("courses").select("is_published").eq("id", courseId).single();
        expect(data!.is_published).toBe(true);
      });
    }
  );

  Scenario(
    "Dos lecciones con la misma position se desempatan por fecha de creación",
    ({ Given, And, When, Then }) => {
      let courseId: string;
      let l1Id: string;
      let l2Id: string;
      let response: Response;

      Given("que el curso C tiene la lección L1 con position 1 creada primero", async () => {
        const instructor = await createTestUser("instructor");
        const admin = adminClient();
        const { data: course } = await admin
          .from("courses")
          .insert({ instructor_id: instructor.id, title: "Curso", price: 0, is_published: true })
          .select()
          .single();
        courseId = course!.id;
        const { data: l1 } = await admin
          .from("lessons")
          .insert({ course_id: courseId, title: "L1", position: 1 })
          .select()
          .single();
        l1Id = l1!.id;
      });

      And(
        "el curso C tiene la lección L2 con position 1 creada después (mismo position que L1)",
        async () => {
          const admin = adminClient();
          const { data: l2 } = await admin
            .from("lessons")
            .insert({ course_id: courseId, title: "L2", position: 1 })
            .select()
            .single();
          l2Id = l2!.id;
        }
      );

      When("se solicita GET /api/courses/C/lessons", async () => {
        response = await apiFetch(`/api/courses/${courseId}/lessons`);
      });

      Then("la respuesta es 200", () => {
        expect(response.status).toBe(200);
      });

      And("L1 aparece antes que L2 en la lista (desempate por created_at asc)", async () => {
        const body = await response.json();
        const ids = body.map((l: { id: string }) => l.id);
        expect(ids.indexOf(l1Id)).toBeLessThan(ids.indexOf(l2Id));
      });
    }
  );
});
