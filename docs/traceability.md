# Matriz de Trazabilidad — Spec ↔ Endpoints ↔ Gherkin ↔ Tests

Punto único para auditar cobertura. Cada fila corresponde a una regla verificable de [`../Spec.md`](../Spec.md) §5.3.

**Revisión (implementación — ver [`../PlanImplementacion.md`](../PlanImplementacion.md)):** los 18 endpoints, el modelo de datos (migraciones + RLS + RPC) y los 6 archivos de test de la última columna **ya existen y están escritos** — `Implementado*` reemplaza a `Especificado`. El asterisco marca que **no se ejecutaron end-to-end en este entorno** (sin Docker disponible para `supabase start` ni un servidor Next real); sí se verificó que los 247 pasos de Gherkin parsean y matchean correctamente contra el código de test (0 errores estructurales), y que `npm run build`/`npm run lint` pasan limpios. Ver [`tests/README.md`](../tests/README.md) para el detalle y los 4 bugs de la suite ya corregidos. Antes de mover cualquier fila a "Implementado" sin asterisco, correr `npm test` contra Supabase local real.

**Revisión (Spec.md v1.1.0):** todas las filas que estaban marcadas `Pendiente` (profiles/categories) quedaron resueltas — tienen endpoint (`EP-11`, `EP-16..EP-18`) y escenario Gherkin dedicado. Se agregaron filas nuevas para reglas de negocio y errores que el Implementador señaló sin cobertura (`RLS-C6`, cruce de roles en `RLS-E2`/`RLS-R1`, exposición de `RLS-R3` como endpoint, y escenarios de error 400/401/404).

**Revisión (estrategia de testing, [`ADR-0001`](adr/0001-estrategia-testing.md)):** el framework de test queda decidido — Vitest híbrido, ejecutando los `.feature` existentes vía `@amiceli/vitest-cucumber` contra un Supabase CLI local. Por eso la columna "Test" pasó de un archivo distinto por regla/operación a **un único `tests/integration/<feature>.steps.test.ts` por archivo `.feature`** (todas las reglas de una misma tabla comparten el mismo archivo, porque un solo `describeFeature` implementa todos los escenarios de ese `.feature`). Ver [`tests/README.md`](../tests/README.md) para la estructura completa, incluyendo los tests de componentes de frontend (fuera de esta matriz, porque no son criterios de negocio con Gherkin).

**Revisión (Spec.md v1.2.0):** se cerró el bloqueante de arquitectura de acceso a datos (`RNF10` — Route Handlers como único punto de entrada, sin `supabase-js` directo desde el frontend), se agregó `RLS-L5` (auto-despublicar al borrar la última lección de un curso publicado, gap introducido por `EP-13` en la ronda anterior), y se documentó el desempate de `position` duplicado (`created_at asc`, sin `unique constraint`).

**Revisión (Spec.md v1.3.0):** dos hallazgos del Implementador sobre la implementación de `RLS-L5`: (1) la atomicidad borrar+despublicar se implementa como función RPC de Postgres (`delete_lesson_and_sync_publish`), no como llamadas secuenciales de `supabase-js`, porque estas últimas no comparten transacción; (2) esa misma función (y en general cualquier escritura gateada por ownership: `EP-04`, `EP-06`, `EP-12`, `EP-13`, `EP-14`, `EP-15`) no puede distinguir `403` de `404` a partir de "0 filas afectadas" — se resolvió con un patrón "`SELECT` de visibilidad antes de escribir" (mismo cliente scoped a la sesión, sin `service_role`) documentado en `Spec.md` §5.4bis, que requirió además ampliar `RLS-R2` (`reviews_select_public`) con `or auth.uid() = student_id` para que el autor de una review siempre pueda verla (y por lo tanto editarla/borrarla con el código de error correcto) aunque el curso se despublique después.

**Revisión (Spec.md v1.3.1, sin impacto de seguridad):** dos observaciones de completitud sobre la enmienda de `RLS-R2`. (1) `EP-09` (listado público de reviews) ahora chequea `courses.is_published` explícitamente en el Route Handler, para seguir siendo estrictamente binario (`[]` si no publicado, sin excepción ni para el propio autor) — la enmienda de `RLS-R2` es solo para el `SELECT` puntual de `EP-14`/`EP-15`, no debe filtrarse al listado. (2) se aclaró con un comentario en `reviews.feature` que el paso "GET de esa review (lectura propia)" en el escenario de `RLS-R2` verifica la policy directamente contra Supabase CLI local (test-only), no un endpoint HTTP — no existe `GET /api/courses/:id/reviews/:reviewId` singular en el contrato.

## Tabla `courses`

| Regla (Spec) | Descripción breve | Endpoint (Spec §5.4) | Escenario Gherkin | Test | Estado |
|---|---|---|---|---|---|
| RLS-C1 | Lectura de publicados libre, incluso anónima | EP-01 | `docs/gherkin/courses.feature` → "Un visitante anónimo ve los cursos publicados" | `tests/integration/courses.steps.test.ts` | Implementado* |
| RLS-C2 | No publicado invisible salvo para el dueño | EP-01, EP-03 | `docs/gherkin/courses.feature` → "Un curso no publicado no es visible para nadie excepto su dueño" | `tests/integration/courses.steps.test.ts` | Implementado* |
| RLS-C3 | Solo el dueño puede `UPDATE` | EP-04 | `docs/gherkin/courses.feature` → "Solo el instructor dueño puede editar su curso" | `tests/integration/courses.steps.test.ts` | Implementado* |
| RLS-C4 | Solo rol `instructor` puede `INSERT`, con `instructor_id = auth.uid()` | EP-02 | `docs/gherkin/courses.feature` → "Solo un usuario con rol instructor puede crear un curso" | `tests/integration/courses.steps.test.ts` | Implementado* |
| RLS-C5 | Solo el dueño puede `DELETE` | — (decisión validada: **fuera de la API v1**, RLS-only) | `docs/gherkin/courses.feature` → "Solo el instructor dueño puede borrar su curso" | `tests/integration/courses.steps.test.ts` | Implementado* |
| RLS-C6 | No se puede publicar (`is_published=true`) un curso con 0 lecciones (regla de negocio en Route Handler, no en RLS/Postgres) | EP-04 | `docs/gherkin/courses.feature` → "Publicar un curso sin lecciones es rechazado" | `tests/integration/courses.steps.test.ts` | Implementado* |
| — | Errores 401/404 de `EP-02`/`EP-04` | EP-02, EP-04 | `docs/gherkin/courses.feature` → "Crear un curso sin sesión devuelve 401" / "Editar un curso inexistente devuelve 404" | `tests/integration/courses.steps.test.ts` | Implementado* |
| — | Distinguir 403 (curso publicado, no dueño) de 404 (no existe / no publicado y no dueño) al editar un curso ajeno | EP-04, EP-06 | `docs/gherkin/courses.feature` → "Editar un curso ajeno publicado da 403" / "Editar un curso ajeno no publicado da 404, no 403" | `tests/integration/courses.steps.test.ts` | Implementado* |

## Tabla `lessons`

| Regla (Spec) | Descripción breve | Endpoint (Spec §5.4) | Escenario Gherkin | Test | Estado |
|---|---|---|---|---|---|
| RLS-L1 | Visibles solo para inscritos | EP-05 | `docs/gherkin/lessons.feature` → "Un estudiante inscrito ve las lecciones del curso" | `tests/integration/lessons.steps.test.ts` | Implementado* |
| RLS-L2 | No inscrito recibe `200` + `[]`, nunca 403 | EP-05 | `docs/gherkin/lessons.feature` → "Un estudiante NO inscrito recibe lista vacía, no un error" / "Un visitante anónimo recibe lista vacía, no un error" | `tests/integration/lessons.steps.test.ts` | Implementado* |
| RLS-L3 | El instructor dueño ve las lecciones de su curso sin inscripción | EP-05 | `docs/gherkin/lessons.feature` → "El instructor dueño ve las lecciones de su propio curso sin estar inscrito" | `tests/integration/lessons.steps.test.ts` | Implementado* |
| RLS-L4 | Solo el dueño escribe (`INSERT`/`UPDATE`/`DELETE`) lecciones de su curso | EP-06, EP-12, EP-13 | `docs/gherkin/lessons.feature` → "Solo el instructor dueño puede crear lecciones en su curso" / "Solo el instructor dueño puede editar o borrar una lección" | `tests/integration/lessons.steps.test.ts` | Implementado* |
| RLS-L5 | Borrar la última lección de un curso publicado auto-despublica el curso (regla de negocio en Route Handler, decisión validada) | EP-13 | `docs/gherkin/lessons.feature` → "Borrar la última lección de un curso publicado lo despublica" | `tests/integration/lessons.steps.test.ts` | Implementado* |
| — | 404 de `EP-05` cuando el curso no existe (distinto de "no inscrito" → `200 []`) | EP-05 | `docs/gherkin/lessons.feature` → "Un curso inexistente devuelve 404, no lista vacía" | `tests/integration/lessons.steps.test.ts` | Implementado* |
| — | Desempate de `position` duplicado por `created_at asc` (sin unique constraint, decisión validada) | EP-05, EP-06, EP-12 | `docs/gherkin/lessons.feature` → "Dos lecciones con la misma position se desempatan por fecha de creación" | `tests/integration/lessons.steps.test.ts` | Implementado* |
| — | Distinguir 403 (lección visible, inscrito pero no dueño) de 404 (no existe / no visible) al editar/borrar una lección ajena | EP-12, EP-13 | `docs/gherkin/lessons.feature` → "Un estudiante inscrito que no es dueño recibe 403 al editar una lección" / "Un instructor no relacionado recibe 404, no 403" | `tests/integration/lessons.steps.test.ts` | Implementado* |

## Tabla `enrollments`

| Regla (Spec) | Descripción breve | Endpoint (Spec §5.4) | Escenario Gherkin | Test | Estado |
|---|---|---|---|---|---|
| RLS-E1 | Cada estudiante ve solo sus propias inscripciones | EP-08 | `docs/gherkin/enrollments.feature` → "Un estudiante solo ve sus propias inscripciones" | `tests/integration/enrollments.steps.test.ts` | Implementado* |
| RLS-E2 | `INSERT` solo con `student_id = auth.uid()` **y** `profiles.role = 'estudiante'` (decisión validada — cruce de roles) | EP-07 | `docs/gherkin/enrollments.feature` → "Un estudiante se inscribe por primera vez a un curso publicado" / "Un instructor no puede inscribirse" | `tests/integration/enrollments.steps.test.ts` | Implementado* |
| RLS-E3 | Doble inscripción → `409`, no 500 ni 201 duplicado | EP-07 | `docs/gherkin/enrollments.feature` → "Inscribirse dos veces al mismo curso devuelve 409" | `tests/integration/enrollments.steps.test.ts` | Implementado* |
| RLS-E4 | El instructor ve inscripciones de su curso (`?course_id=`), no de cursos ajenos | EP-08 | `docs/gherkin/enrollments.feature` → "El instructor dueño puede ver las inscripciones de su curso, pero no las de cursos ajenos" | `tests/integration/enrollments.steps.test.ts` | Implementado* |
| — | Errores 401 (`EP-07`) y 404 por curso no publicado (`EP-07`) | EP-07 | `docs/gherkin/enrollments.feature` → "Inscribirse sin sesión devuelve 401" / "Inscribirse a un curso no publicado devuelve 404" | `tests/integration/enrollments.steps.test.ts` | Implementado* |

## Tabla `reviews`

| Regla (Spec) | Descripción breve | Endpoint (Spec §5.4) | Escenario Gherkin | Test | Estado |
|---|---|---|---|---|---|
| RLS-R1 | Solo estudiantes inscritos, con `profiles.role = 'estudiante'`, crean reviews (decisión validada — cruce de roles) | EP-10 | `docs/gherkin/reviews.feature` → "Solo un estudiante inscrito puede crear una review" / "Un instructor no puede dejar una review" | `tests/integration/reviews.steps.test.ts` | Implementado* |
| RLS-R2 | Lectura de reviews de curso publicado es libre; **además, el autor siempre puede leer su propia review** aunque el curso se despublique (enmienda validada — necesaria para que `EP-14`/`EP-15` puedan distinguir 403 de 404) | EP-09 | `docs/gherkin/reviews.feature` → "Las reviews de un curso publicado son visibles públicamente" / "El autor puede leer su propia review aunque el curso se despublique" | `tests/integration/reviews.steps.test.ts` | Implementado* |
| RLS-R3 | Un estudiante solo edita/borra su propia review | EP-14, EP-15 (decisión validada — sí se exponen en v1) | `docs/gherkin/reviews.feature` → "Un estudiante solo puede editar o borrar su propia review" | `tests/integration/reviews.steps.test.ts` | Implementado* |
| RLS-R4 | Máximo una review por (estudiante, curso) → `409` | EP-10 | `docs/gherkin/reviews.feature` → "Un estudiante no puede dejar más de una review por curso" | `tests/integration/reviews.steps.test.ts` | Implementado* |
| — | Distinguir 403 (visible, no autor) de 404 (no existe / no visible) al editar/borrar una review ajena | EP-14, EP-15 | `docs/gherkin/reviews.feature` → "Editar la review de otro en un curso publicado da 403" / "Editar una review inexistente da 404" | `tests/integration/reviews.steps.test.ts` | Implementado* |

## Tabla `profiles`

| Regla (Spec) | Descripción breve | Endpoint (Spec §5.4) | Escenario Gherkin | Test | Estado |
|---|---|---|---|---|---|
| RLS-P3 | Solo el propio usuario autenticado puede crear su fila de `profiles`, una sola vez (`id = auth.uid()`, sin trigger) | EP-16 | `docs/gherkin/profiles.feature` → "Un usuario autenticado crea su perfil eligiendo su rol" / "Crear un segundo perfil para el mismo usuario devuelve 409" | `tests/integration/profiles.steps.test.ts` | Implementado* |
| RLS-P1 | Perfil propio y campos públicos (`full_name`, `role`) legibles por cualquiera | EP-17 (propio), EP-01/EP-03 (público, vía `CourseWithInstructor.instructor`) | `docs/gherkin/profiles.feature` → "Cualquiera puede leer el nombre y rol público de un perfil" / "Un usuario sin perfil recibe 404 en /profiles/me" | `tests/integration/profiles.steps.test.ts` | Implementado* |
| RLS-P2 | Un usuario solo edita su propio perfil, y **nunca** su `role` (inmutable en v1 — decisión validada) | EP-18 | `docs/gherkin/profiles.feature` → "Un usuario solo puede editar su propio perfil" / "El rol de un perfil es inmutable" | `tests/integration/profiles.steps.test.ts` | Implementado* |

## Tabla `categories`

| Regla (Spec) | Descripción breve | Endpoint (Spec §5.4) | Escenario Gherkin | Test | Estado |
|---|---|---|---|---|---|
| RLS-CAT1 | `categories` de solo lectura pública, sin escritura vía API en v1 | EP-11 | `docs/gherkin/categories.feature` → "Cualquiera puede listar las categorías" | `tests/integration/categories.steps.test.ts` | Implementado* |

---

## Cómo mantener esta matriz al día

1. Toda regla nueva en `Spec.md` §5.3 debe agregar una fila aquí antes de escribir su endpoint o su escenario.
2. Todo endpoint nuevo en `Spec.md` §5.4 debe referenciar el/los `RLS-xx` que aplica.
3. Todo escenario `.feature` nuevo debe llevar tags `@RLS-xx` y, si corresponde, `@EP-xx` — deben coincidir con esta tabla.
4. Cuando un test corra de verdad contra Supabase local (no solo se parsee/matchee), quitar el asterisco: `Implementado*` → `Implementado`.
