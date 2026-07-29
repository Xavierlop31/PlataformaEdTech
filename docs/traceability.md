# Matriz de Trazabilidad — Spec ↔ Endpoints ↔ Gherkin ↔ Tests

Punto único para auditar cobertura. Cada fila corresponde a una regla verificable de [`../Spec.md`](../Spec.md) §5.3.
Los archivos de test listados en la última columna **aún no existen** — son la ruta prevista para cuando arranque la implementación (ver [`../Spec.md`](../Spec.md), fuera de alcance de esta fase).

**Revisión (Spec.md v1.1.0):** todas las filas que estaban marcadas `Pendiente` (profiles/categories) quedaron resueltas — tienen endpoint (`EP-11`, `EP-16..EP-18`) y escenario Gherkin dedicado. Se agregaron filas nuevas para reglas de negocio y errores que el Implementador señaló sin cobertura (`RLS-C6`, cruce de roles en `RLS-E2`/`RLS-R1`, exposición de `RLS-R3` como endpoint, y escenarios de error 400/401/404).

**Revisión (estrategia de testing, [`ADR-0001`](adr/0001-estrategia-testing.md)):** el framework de test queda decidido — Vitest híbrido, ejecutando los `.feature` existentes vía `@amiceli/vitest-cucumber` contra un Supabase CLI local. Por eso la columna "Test futuro (placeholder)" pasó de un archivo distinto por regla/operación a **un único `tests/integration/<feature>.steps.test.ts` por archivo `.feature`** (todas las reglas de una misma tabla comparten el mismo archivo, porque un solo `describeFeature` implementa todos los escenarios de ese `.feature`). Ver [`tests/README.md`](../tests/README.md) para la estructura completa, incluyendo los tests de componentes de frontend (fuera de esta matriz, porque no son criterios de negocio con Gherkin).

**Revisión (Spec.md v1.2.0):** se cerró el bloqueante de arquitectura de acceso a datos (`RNF10` — Route Handlers como único punto de entrada, sin `supabase-js` directo desde el frontend), se agregó `RLS-L5` (auto-despublicar al borrar la última lección de un curso publicado, gap introducido por `EP-13` en la ronda anterior), y se documentó el desempate de `position` duplicado (`created_at asc`, sin `unique constraint`).

## Tabla `courses`

| Regla (Spec) | Descripción breve | Endpoint (Spec §5.4) | Escenario Gherkin | Test futuro (placeholder) | Estado |
|---|---|---|---|---|---|
| RLS-C1 | Lectura de publicados libre, incluso anónima | EP-01 | `docs/gherkin/courses.feature` → "Un visitante anónimo ve los cursos publicados" | `tests/integration/courses.steps.test.ts` | Especificado |
| RLS-C2 | No publicado invisible salvo para el dueño | EP-01, EP-03 | `docs/gherkin/courses.feature` → "Un curso no publicado no es visible para nadie excepto su dueño" | `tests/integration/courses.steps.test.ts` | Especificado |
| RLS-C3 | Solo el dueño puede `UPDATE` | EP-04 | `docs/gherkin/courses.feature` → "Solo el instructor dueño puede editar su curso" | `tests/integration/courses.steps.test.ts` | Especificado |
| RLS-C4 | Solo rol `instructor` puede `INSERT`, con `instructor_id = auth.uid()` | EP-02 | `docs/gherkin/courses.feature` → "Solo un usuario con rol instructor puede crear un curso" | `tests/integration/courses.steps.test.ts` | Especificado |
| RLS-C5 | Solo el dueño puede `DELETE` | — (decisión validada: **fuera de la API v1**, RLS-only) | `docs/gherkin/courses.feature` → "Solo el instructor dueño puede borrar su curso" | `tests/integration/courses.steps.test.ts` | Especificado |
| RLS-C6 | No se puede publicar (`is_published=true`) un curso con 0 lecciones (regla de negocio en Route Handler, no en RLS/Postgres) | EP-04 | `docs/gherkin/courses.feature` → "Publicar un curso sin lecciones es rechazado" | `tests/integration/courses.steps.test.ts` | Especificado |
| — | Errores 401/404 de `EP-02`/`EP-04` | EP-02, EP-04 | `docs/gherkin/courses.feature` → "Crear un curso sin sesión devuelve 401" / "Editar un curso inexistente devuelve 404" | `tests/integration/courses.steps.test.ts` | Especificado |

## Tabla `lessons`

| Regla (Spec) | Descripción breve | Endpoint (Spec §5.4) | Escenario Gherkin | Test futuro (placeholder) | Estado |
|---|---|---|---|---|---|
| RLS-L1 | Visibles solo para inscritos | EP-05 | `docs/gherkin/lessons.feature` → "Un estudiante inscrito ve las lecciones del curso" | `tests/integration/lessons.steps.test.ts` | Especificado |
| RLS-L2 | No inscrito recibe `200` + `[]`, nunca 403 | EP-05 | `docs/gherkin/lessons.feature` → "Un estudiante NO inscrito recibe lista vacía, no un error" / "Un visitante anónimo recibe lista vacía, no un error" | `tests/integration/lessons.steps.test.ts` | Especificado |
| RLS-L3 | El instructor dueño ve las lecciones de su curso sin inscripción | EP-05 | `docs/gherkin/lessons.feature` → "El instructor dueño ve las lecciones de su propio curso sin estar inscrito" | `tests/integration/lessons.steps.test.ts` | Especificado |
| RLS-L4 | Solo el dueño escribe (`INSERT`/`UPDATE`/`DELETE`) lecciones de su curso | EP-06, EP-12, EP-13 | `docs/gherkin/lessons.feature` → "Solo el instructor dueño puede crear lecciones en su curso" / "Solo el instructor dueño puede editar o borrar una lección" | `tests/integration/lessons.steps.test.ts` | Especificado |
| RLS-L5 | Borrar la última lección de un curso publicado auto-despublica el curso (regla de negocio en Route Handler, decisión validada) | EP-13 | `docs/gherkin/lessons.feature` → "Borrar la última lección de un curso publicado lo despublica" | `tests/integration/lessons.steps.test.ts` | Especificado |
| — | 404 de `EP-05` cuando el curso no existe (distinto de "no inscrito" → `200 []`) | EP-05 | `docs/gherkin/lessons.feature` → "Un curso inexistente devuelve 404, no lista vacía" | `tests/integration/lessons.steps.test.ts` | Especificado |
| — | Desempate de `position` duplicado por `created_at asc` (sin unique constraint, decisión validada) | EP-05, EP-06, EP-12 | `docs/gherkin/lessons.feature` → "Dos lecciones con la misma position se desempatan por fecha de creación" | `tests/integration/lessons.steps.test.ts` | Especificado |

## Tabla `enrollments`

| Regla (Spec) | Descripción breve | Endpoint (Spec §5.4) | Escenario Gherkin | Test futuro (placeholder) | Estado |
|---|---|---|---|---|---|
| RLS-E1 | Cada estudiante ve solo sus propias inscripciones | EP-08 | `docs/gherkin/enrollments.feature` → "Un estudiante solo ve sus propias inscripciones" | `tests/integration/enrollments.steps.test.ts` | Especificado |
| RLS-E2 | `INSERT` solo con `student_id = auth.uid()` **y** `profiles.role = 'estudiante'` (decisión validada — cruce de roles) | EP-07 | `docs/gherkin/enrollments.feature` → "Un estudiante se inscribe por primera vez a un curso publicado" / "Un instructor no puede inscribirse" | `tests/integration/enrollments.steps.test.ts` | Especificado |
| RLS-E3 | Doble inscripción → `409`, no 500 ni 201 duplicado | EP-07 | `docs/gherkin/enrollments.feature` → "Inscribirse dos veces al mismo curso devuelve 409" | `tests/integration/enrollments.steps.test.ts` | Especificado |
| RLS-E4 | El instructor ve inscripciones de su curso (`?course_id=`), no de cursos ajenos | EP-08 | `docs/gherkin/enrollments.feature` → "El instructor dueño puede ver las inscripciones de su curso, pero no las de cursos ajenos" | `tests/integration/enrollments.steps.test.ts` | Especificado |
| — | Errores 401 (`EP-07`) y 404 por curso no publicado (`EP-07`) | EP-07 | `docs/gherkin/enrollments.feature` → "Inscribirse sin sesión devuelve 401" / "Inscribirse a un curso no publicado devuelve 404" | `tests/integration/enrollments.steps.test.ts` | Especificado |

## Tabla `reviews`

| Regla (Spec) | Descripción breve | Endpoint (Spec §5.4) | Escenario Gherkin | Test futuro (placeholder) | Estado |
|---|---|---|---|---|---|
| RLS-R1 | Solo estudiantes inscritos, con `profiles.role = 'estudiante'`, crean reviews (decisión validada — cruce de roles) | EP-10 | `docs/gherkin/reviews.feature` → "Solo un estudiante inscrito puede crear una review" / "Un instructor no puede dejar una review" | `tests/integration/reviews.steps.test.ts` | Especificado |
| RLS-R2 | Lectura de reviews de curso publicado es libre | EP-09 | `docs/gherkin/reviews.feature` → "Las reviews de un curso publicado son visibles públicamente" | `tests/integration/reviews.steps.test.ts` | Especificado |
| RLS-R3 | Un estudiante solo edita/borra su propia review | EP-14, EP-15 (decisión validada — sí se exponen en v1) | `docs/gherkin/reviews.feature` → "Un estudiante solo puede editar o borrar su propia review" | `tests/integration/reviews.steps.test.ts` | Especificado |
| RLS-R4 | Máximo una review por (estudiante, curso) → `409` | EP-10 | `docs/gherkin/reviews.feature` → "Un estudiante no puede dejar más de una review por curso" | `tests/integration/reviews.steps.test.ts` | Especificado |

## Tabla `profiles`

| Regla (Spec) | Descripción breve | Endpoint (Spec §5.4) | Escenario Gherkin | Test futuro (placeholder) | Estado |
|---|---|---|---|---|---|
| RLS-P3 | Solo el propio usuario autenticado puede crear su fila de `profiles`, una sola vez (`id = auth.uid()`, sin trigger) | EP-16 | `docs/gherkin/profiles.feature` → "Un usuario autenticado crea su perfil eligiendo su rol" / "Crear un segundo perfil para el mismo usuario devuelve 409" | `tests/integration/profiles.steps.test.ts` | Especificado |
| RLS-P1 | Perfil propio y campos públicos (`full_name`, `role`) legibles por cualquiera | EP-17 (propio), EP-01/EP-03 (público, vía `CourseWithInstructor.instructor`) | `docs/gherkin/profiles.feature` → "Cualquiera puede leer el nombre y rol público de un perfil" / "Un usuario sin perfil recibe 404 en /profiles/me" | `tests/integration/profiles.steps.test.ts` | Especificado |
| RLS-P2 | Un usuario solo edita su propio perfil, y **nunca** su `role` (inmutable en v1 — decisión validada) | EP-18 | `docs/gherkin/profiles.feature` → "Un usuario solo puede editar su propio perfil" / "El rol de un perfil es inmutable" | `tests/integration/profiles.steps.test.ts` | Especificado |

## Tabla `categories`

| Regla (Spec) | Descripción breve | Endpoint (Spec §5.4) | Escenario Gherkin | Test futuro (placeholder) | Estado |
|---|---|---|---|---|---|
| RLS-CAT1 | `categories` de solo lectura pública, sin escritura vía API en v1 | EP-11 | `docs/gherkin/categories.feature` → "Cualquiera puede listar las categorías" | `tests/integration/categories.steps.test.ts` | Especificado |

---

## Cómo mantener esta matriz al día

1. Toda regla nueva en `Spec.md` §5.3 debe agregar una fila aquí antes de escribir su endpoint o su escenario.
2. Todo endpoint nuevo en `Spec.md` §5.4 debe referenciar el/los `RLS-xx` que aplica.
3. Todo escenario `.feature` nuevo debe llevar tags `@RLS-xx` y, si corresponde, `@EP-xx` — deben coincidir con esta tabla.
4. Cuando se implemente un test real, actualizar la columna "Estado" de `Especificado`/`Pendiente` a `Implementado` y enlazar el archivo real.
