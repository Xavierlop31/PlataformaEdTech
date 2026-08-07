import { loadFeature, describeFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { adminClient, apiFetch, createTestUser, type TestUser } from "../setup/supabase-test-client";

/** Implementa docs/gherkin/enrollments.feature (RLS-E1..E4). */
const feature = await loadFeature("docs/gherkin/enrollments.feature", { language: "es" });

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
  Scenario("Un estudiante solo ve sus propias inscripciones", ({ Given, And, When, Then }) => {
    let studentA: TestUser;
    let studentB: TestUser;
    let response: Response;

    Given("que el estudiante A está inscrito en los cursos C1 y C2", async () => {
      studentA = await createTestUser("estudiante");
      const instructor = await createTestUser("instructor");
      const c1 = await publishedCourse(instructor.id, "C1");
      const c2 = await publishedCourse(instructor.id, "C2");
      await apiFetch(`/api/courses/${c1}/enroll`, { method: "POST", user: studentA });
      await apiFetch(`/api/courses/${c2}/enroll`, { method: "POST", user: studentA });
    });

    And("el estudiante B está inscrito en el curso C3", async () => {
      studentB = await createTestUser("estudiante");
      const instructor = await createTestUser("instructor");
      const c3 = await publishedCourse(instructor.id, "C3");
      await apiFetch(`/api/courses/${c3}/enroll`, { method: "POST", user: studentB });
    });

    When("el estudiante A solicita GET /api/enrollments", async () => {
      response = await apiFetch("/api/enrollments?limit=100", { user: studentA });
    });

    Then("la respuesta es 200", () => {
      expect(response.status).toBe(200);
    });

    And("la lista incluye únicamente inscripciones con student_id = A", async () => {
      const body = await response.json();
      expect(body.every((e: { student_id: string }) => e.student_id === studentA.id)).toBe(true);
    });

    And("la lista NO incluye la inscripción del estudiante B", async () => {
      const body = await response.json();
      expect(body.some((e: { student_id: string }) => e.student_id === studentB.id)).toBe(false);
    });
  });

  Scenario(
    "Un estudiante se inscribe por primera vez a un curso publicado",
    ({ Given, And, When, Then }) => {
      let student: TestUser;
      let courseId: string;
      let response: Response;

      Given("que el curso C está publicado", async () => {
        const instructor = await createTestUser("instructor");
        courseId = await publishedCourse(instructor.id);
      });

      And("el estudiante E no tiene una inscripción previa en el curso C", async () => {
        student = await createTestUser("estudiante");
      });

      When("el estudiante E solicita POST /api/courses/C/enroll", async () => {
        response = await apiFetch(`/api/courses/${courseId}/enroll`, {
          method: "POST",
          user: student,
        });
      });

      Then("la respuesta es 201", () => {
        expect(response.status).toBe(201);
      });

      And("queda creada una fila en enrollments con student_id = E y course_id = C", async () => {
        const admin = adminClient();
        const { data } = await admin
          .from("enrollments")
          .select("*")
          .eq("student_id", student.id)
          .eq("course_id", courseId)
          .maybeSingle();
        expect(data).not.toBeNull();
      });
    }
  );

  Scenario("Inscribirse dos veces al mismo curso devuelve 409", ({ Given, When, Then, And }) => {
    let student: TestUser;
    let courseId: string;
    let response: Response;

    Given("que el estudiante E ya está inscrito en el curso C", async () => {
      student = await createTestUser("estudiante");
      const instructor = await createTestUser("instructor");
      courseId = await publishedCourse(instructor.id);
      await apiFetch(`/api/courses/${courseId}/enroll`, { method: "POST", user: student });
    });

    When("el estudiante E solicita POST /api/courses/C/enroll nuevamente", async () => {
      response = await apiFetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
        user: student,
      });
    });

    Then("la respuesta es 409", () => {
      expect(response.status).toBe(409);
    });

    And('el cuerpo de la respuesta indica error "already_enrolled"', async () => {
      const body = await response.json();
      expect(body.error).toBe("already_enrolled");
    });

    And("no se crea una segunda fila en enrollments para (E, C)", async () => {
      const admin = adminClient();
      const { count } = await admin
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("student_id", student.id)
        .eq("course_id", courseId);
      expect(count).toBe(1);
    });
  });

  Scenario(
    "El instructor dueño puede ver las inscripciones de su curso, pero no las de cursos ajenos",
    ({ Given, And, When, Then }) => {
      let instructorI: TestUser;
      let student: TestUser;
      let courseC: string;
      let courseD: string;
      let response: Response;

      Given("que el curso C pertenece al instructor I", async () => {
        instructorI = await createTestUser("instructor");
        courseC = await publishedCourse(instructorI.id, "C");
      });

      And("el estudiante E está inscrito en el curso C", async () => {
        student = await createTestUser("estudiante");
        await apiFetch(`/api/courses/${courseC}/enroll`, { method: "POST", user: student });
      });

      When("el instructor I consulta las inscripciones del curso C", async () => {
        response = await apiFetch(`/api/enrollments?course_id=${courseC}`, { user: instructorI });
      });

      Then("la respuesta incluye la inscripción del estudiante E", async () => {
        const body = await response.json();
        expect(body.some((e: { student_id: string }) => e.student_id === student.id)).toBe(true);
      });

      Given("que el curso D pertenece a otro instructor J", async () => {
        const instructorJ = await createTestUser("instructor");
        courseD = await publishedCourse(instructorJ.id, "D");
      });

      When("el instructor I consulta las inscripciones del curso D", async () => {
        response = await apiFetch(`/api/enrollments?course_id=${courseD}`, { user: instructorI });
      });

      Then("la respuesta no incluye ninguna fila", async () => {
        const body = await response.json();
        expect(body.length).toBe(0);
      });
    }
  );

  Scenario(
    "Un instructor no puede inscribirse a un curso, ni siquiera al propio",
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

      When("ese instructor solicita POST /api/courses/C/enroll", async () => {
        response = await apiFetch(`/api/courses/${courseId}/enroll`, {
          method: "POST",
          user: instructor,
        });
      });

      Then("la respuesta es 403", () => {
        expect(response.status).toBe(403);
      });

      And('el cuerpo de la respuesta indica error "forbidden"', async () => {
        const body = await response.json();
        expect(body.error).toBe("forbidden");
      });

      And("no se crea ninguna fila en enrollments", async () => {
        const admin = adminClient();
        const { count } = await admin
          .from("enrollments")
          .select("id", { count: "exact", head: true })
          .eq("student_id", instructor.id);
        expect(count).toBe(0);
      });

      Given("que el curso C pertenece a ese mismo instructor", async () => {
        courseId = await publishedCourse(instructor.id, "Propio");
      });

      When("ese instructor solicita POST /api/courses/C/enroll sobre su propio curso", async () => {
        response = await apiFetch(`/api/courses/${courseId}/enroll`, {
          method: "POST",
          user: instructor,
        });
      });

      Then("la respuesta es 403 igualmente", () => {
        expect(response.status).toBe(403);
      });
    }
  );

  Scenario("Inscribirse sin sesión devuelve 401", ({ Given, And, When, Then }) => {
    let courseId: string;
    let response: Response;

    Given("que no hay ninguna sesión autenticada", () => {});

    And("el curso C está publicado", async () => {
      const instructor = await createTestUser("instructor");
      courseId = await publishedCourse(instructor.id);
    });

    When("se solicita POST /api/courses/C/enroll", async () => {
      response = await apiFetch(`/api/courses/${courseId}/enroll`, { method: "POST" });
    });

    Then("la respuesta es 401", () => {
      expect(response.status).toBe(401);
    });

    And('el cuerpo de la respuesta indica error "unauthorized"', async () => {
      const body = await response.json();
      expect(body.error).toBe("unauthorized");
    });
  });

  Scenario("Inscribirse a un curso no publicado devuelve 404", ({ Given, And, When, Then }) => {
    let student: TestUser;
    let courseId: string;
    let response: Response;

    Given("que el curso C no está publicado", async () => {
      const instructor = await createTestUser("instructor");
      const admin = adminClient();
      const { data } = await admin
        .from("courses")
        .insert({ instructor_id: instructor.id, title: "Borrador", price: 0 })
        .select()
        .single();
      courseId = data!.id;
    });

    And("el estudiante E no es el instructor dueño de C", async () => {
      student = await createTestUser("estudiante");
    });

    When("el estudiante E solicita POST /api/courses/C/enroll", async () => {
      response = await apiFetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
        user: student,
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
});
