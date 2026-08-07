import { loadFeature, describeFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import {
  adminClient,
  apiFetch,
  createTestUser,
  userClient,
  type TestUser,
} from "../setup/supabase-test-client";

/** Implementa docs/gherkin/reviews.feature (RLS-R1..R4). */
const feature = await loadFeature("docs/gherkin/reviews.feature", { language: "es" });

async function publishedCourse(instructorId: string, title = "Curso") {
  const admin = adminClient();
  const { data: course } = await admin
    .from("courses")
    .insert({ instructor_id: instructorId, title, price: 0, is_published: false })
    .select()
    .single();
  await admin.from("lessons").insert({ course_id: course!.id, title: "Clase 1" });
  await admin.from("courses").update({ is_published: true }).eq("id", course!.id);
  return course!.id as string;
}

describeFeature(feature, ({ Scenario }) => {
  Scenario("Solo un estudiante inscrito puede crear una review", ({ Given, When, Then }) => {
    let student: TestUser;
    let courseId: string;
    let response: Response;

    Given("que el estudiante E no está inscrito en el curso C", async () => {
      student = await createTestUser("estudiante");
      const instructor = await createTestUser("instructor");
      courseId = await publishedCourse(instructor.id);
    });

    When("el estudiante E intenta POST /api/courses/C/reviews", async () => {
      response = await apiFetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        user: student,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: 5 }),
      });
    });

    Then("la respuesta es 403", () => {
      expect(response.status).toBe(403);
    });

    Given("que el estudiante E está inscrito en el curso C", async () => {
      await apiFetch(`/api/courses/${courseId}/enroll`, { method: "POST", user: student });
    });

    When("el estudiante E intenta POST /api/courses/C/reviews con rating 5", async () => {
      response = await apiFetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        user: student,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: 5 }),
      });
    });

    Then("la respuesta es 201 y la review queda creada", async () => {
      expect(response.status).toBe(201);
    });
  });

  Scenario(
    "Las reviews de un curso publicado son visibles públicamente",
    ({ Given, And, When, Then }) => {
      let courseId: string;
      let response: Response;

      Given("que no hay ninguna sesión autenticada", () => {});

      And("el curso C está publicado y tiene reviews", async () => {
        const instructor = await createTestUser("instructor");
        courseId = await publishedCourse(instructor.id);
        const student = await createTestUser("estudiante");
        await apiFetch(`/api/courses/${courseId}/enroll`, { method: "POST", user: student });
        await apiFetch(`/api/courses/${courseId}/reviews`, {
          method: "POST",
          user: student,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: 4, comment: "Bien" }),
        });
      });

      When("el visitante solicita GET /api/courses/C/reviews", async () => {
        response = await apiFetch(`/api/courses/${courseId}/reviews`);
      });

      Then("la respuesta es 200", () => {
        expect(response.status).toBe(200);
      });

      And("la lista incluye las reviews del curso C", async () => {
        const body = await response.json();
        expect(body.length).toBeGreaterThan(0);
      });
    }
  );

  Scenario(
    "Un estudiante solo puede editar o borrar su propia review",
    ({ Given, When, Then }) => {
      let studentA: TestUser;
      let studentB: TestUser;
      let courseId: string;
      let reviewId: string;
      let response: Response;

      Given("que el curso C está publicado y el estudiante A creó una review en él", async () => {
        studentA = await createTestUser("estudiante");
        studentB = await createTestUser("estudiante");
        const instructor = await createTestUser("instructor");
        courseId = await publishedCourse(instructor.id);
        await apiFetch(`/api/courses/${courseId}/enroll`, { method: "POST", user: studentA });
        const res = await apiFetch(`/api/courses/${courseId}/reviews`, {
          method: "POST",
          user: studentA,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: 3 }),
        });
        reviewId = (await res.json()).id;
      });

      When("el estudiante B intenta PATCH o DELETE sobre esa review", async () => {
        response = await apiFetch(`/api/courses/${courseId}/reviews/${reviewId}`, {
          method: "PATCH",
          user: studentB,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: 1 }),
        });
      });

      Then("la respuesta es 403 y la operación no afecta ninguna fila", () => {
        expect(response.status).toBe(403);
      });

      When("el estudiante A intenta PATCH sobre esa misma review", async () => {
        response = await apiFetch(`/api/courses/${courseId}/reviews/${reviewId}`, {
          method: "PATCH",
          user: studentA,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: 5 }),
        });
      });

      Then("la respuesta es 200 y la review queda actualizada", async () => {
        expect(response.status).toBe(200);
      });

      When("el estudiante A intenta DELETE sobre esa misma review", async () => {
        response = await apiFetch(`/api/courses/${courseId}/reviews/${reviewId}`, {
          method: "DELETE",
          user: studentA,
        });
      });

      Then("la respuesta es 204 y la review queda eliminada", () => {
        expect(response.status).toBe(204);
      });
    }
  );

  Scenario("Editar una review inexistente devuelve 404", ({ Given, When, Then, And }) => {
    let student: TestUser;
    let response: Response;
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const fakeCourseId = "00000000-0000-0000-0000-000000000000";

    Given("que no existe ninguna review con el id solicitado", async () => {
      student = await createTestUser("estudiante");
    });

    When(
      "un estudiante autenticado intenta PATCH /api/courses/:id/reviews/:reviewId sobre ese id inexistente",
      async () => {
        response = await apiFetch(`/api/courses/${fakeCourseId}/reviews/${fakeId}`, {
          method: "PATCH",
          user: student,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: 3 }),
        });
      }
    );

    Then("la respuesta es 404", () => {
      expect(response.status).toBe(404);
    });

    And('el cuerpo de la respuesta indica error "not_found"', async () => {
      const body = await response.json();
      expect(body.error).toBe("not_found");
    });
  });

  Scenario(
    "El autor puede leer y editar su propia review aunque el curso se despublique",
    ({ Given, And, When, Then }) => {
      let studentA: TestUser;
      let instructor: TestUser;
      let courseId: string;
      let reviewId: string;
      let response: Response;
      let rlsRow: unknown;

      Given("que el estudiante A creó una review en el curso C mientras estaba publicado", async () => {
        studentA = await createTestUser("estudiante");
        instructor = await createTestUser("instructor");
        courseId = await publishedCourse(instructor.id);
        await apiFetch(`/api/courses/${courseId}/enroll`, { method: "POST", user: studentA });
        const res = await apiFetch(`/api/courses/${courseId}/reviews`, {
          method: "POST",
          user: studentA,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: 4 }),
        });
        reviewId = (await res.json()).id;
      });

      And("el instructor dueño despublica el curso C después", async () => {
        await apiFetch(`/api/courses/${courseId}`, {
          method: "PATCH",
          user: instructor,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_published: false }),
        });
      });

      When(
        "el estudiante A hace un select directo (test-only, vía Supabase CLI local) de esa review con su propia sesión",
        async () => {
          const client = await userClient(studentA);
          const { data } = await client.from("reviews").select("*").eq("id", reviewId).maybeSingle();
          rlsRow = data;
        }
      );

      Then("la review sigue siendo visible para su autor a nivel de policy RLS", () => {
        expect(rlsRow).not.toBeNull();
      });

      When("el estudiante A intenta PATCH /api/courses/C/reviews/:reviewId sobre esa misma review", async () => {
        response = await apiFetch(`/api/courses/${courseId}/reviews/${reviewId}`, {
          method: "PATCH",
          user: studentA,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: 5 }),
        });
      });

      Then("la respuesta es 200, no 404 (gracias a la enmienda de RLS-R2)", () => {
        expect(response.status).toBe(200);
      });
    }
  );

  Scenario(
    "Editar la review de otro en un curso ya despublicado da 404, no 403",
    ({ Given, And, When, Then }) => {
      let studentA: TestUser;
      let studentB: TestUser;
      let instructor: TestUser;
      let courseId: string;
      let reviewId: string;
      let response: Response;

      Given("que el estudiante A creó una review en el curso C", async () => {
        studentA = await createTestUser("estudiante");
        studentB = await createTestUser("estudiante");
        instructor = await createTestUser("instructor");
        courseId = await publishedCourse(instructor.id);
        await apiFetch(`/api/courses/${courseId}/enroll`, { method: "POST", user: studentA });
        const res = await apiFetch(`/api/courses/${courseId}/reviews`, {
          method: "POST",
          user: studentA,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: 4 }),
        });
        reviewId = (await res.json()).id;
      });

      And("el instructor dueño despublica el curso C después", async () => {
        await apiFetch(`/api/courses/${courseId}`, {
          method: "PATCH",
          user: instructor,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_published: false }),
        });
      });

      When("el estudiante B (que no es el autor) intenta PATCH sobre esa review", async () => {
        response = await apiFetch(`/api/courses/${courseId}/reviews/${reviewId}`, {
          method: "PATCH",
          user: studentB,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: 1 }),
        });
      });

      Then("la respuesta es 404", () => {
        expect(response.status).toBe(404);
      });

      And("la respuesta NO es 403 (el estudiante B no puede ver la review de un curso no publicado)", () => {
        expect(response.status).not.toBe(403);
      });
    }
  );

  Scenario("Un estudiante no puede dejar más de una review por curso", ({ Given, When, Then, And }) => {
    let student: TestUser;
    let courseId: string;
    let response: Response;

    Given("que el estudiante E ya dejó una review en el curso C", async () => {
      student = await createTestUser("estudiante");
      const instructor = await createTestUser("instructor");
      courseId = await publishedCourse(instructor.id);
      await apiFetch(`/api/courses/${courseId}/enroll`, { method: "POST", user: student });
      await apiFetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        user: student,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: 5 }),
      });
    });

    When("el estudiante E intenta POST /api/courses/C/reviews nuevamente", async () => {
      response = await apiFetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        user: student,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: 2 }),
      });
    });

    Then("la respuesta es 409", () => {
      expect(response.status).toBe(409);
    });

    And('el cuerpo de la respuesta indica error "already_reviewed"', async () => {
      const body = await response.json();
      expect(body.error).toBe("already_reviewed");
    });
  });

  Scenario(
    "Un instructor no puede dejar una review, ni siquiera en un curso ajeno",
    ({ Given, And, When, Then }) => {
      let instructor: TestUser;
      let courseId: string;
      let response: Response;

      Given("que un usuario autenticado tiene profiles.role = 'instructor'", async () => {
        instructor = await createTestUser("instructor");
      });

      And("el curso C está publicado", async () => {
        const otherInstructor = await createTestUser("instructor");
        courseId = await publishedCourse(otherInstructor.id);
      });

      When("ese instructor intenta POST /api/courses/C/reviews con rating 5", async () => {
        response = await apiFetch(`/api/courses/${courseId}/reviews`, {
          method: "POST",
          user: instructor,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: 5 }),
        });
      });

      Then("la respuesta es 403", () => {
        expect(response.status).toBe(403);
      });

      And('el cuerpo de la respuesta indica error "forbidden"', async () => {
        const body = await response.json();
        expect(body.error).toBe("forbidden");
      });
    }
  );

  Scenario("Dejar una review con rating fuera de rango devuelve 400", ({ Given, When, Then, And }) => {
    let student: TestUser;
    let courseId: string;
    let response: Response;

    Given("que el estudiante E está inscrito en el curso C", async () => {
      student = await createTestUser("estudiante");
      const instructor = await createTestUser("instructor");
      courseId = await publishedCourse(instructor.id);
      await apiFetch(`/api/courses/${courseId}/enroll`, { method: "POST", user: student });
    });

    When("el estudiante E intenta POST /api/courses/C/reviews con rating 7", async () => {
      response = await apiFetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        user: student,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: 7 }),
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
