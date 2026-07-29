# Contrato de Endpoints — Plataforma EdTech

Fuente de verdad: [`../../Spec.md`](../../Spec.md) §5.4. Los IDs `EP-xx` son la clave de correlación con [`../traceability.md`](../traceability.md) y con los escenarios en [`../gherkin/`](../gherkin/). Tipos referenciados en [`./types.ts`](./types.ts).

Todas las respuestas de error usan la forma `ApiError` (`{ error, message? }`) definida en `types.ts`.

**Arquitectura de acceso (decisión validada, RNF10 de `Spec.md` §6):** todos los endpoints de este documento son Route Handlers de Next.js — son el **único** punto de entrada a los datos. El frontend nunca instancia `supabase-js` contra Postgres directamente, ni para leer ni para escribir; cada Route Handler usa un cliente Supabase scoped a la sesión del usuario (nunca `service_role` expuesto). Esto es lo que permite que `RLS-C6`, `RLS-L5`, la validación de `content_url`, la distinción 404/200 de `EP-05` y la paginación/orden de más abajo se cumplan siempre — ninguna vive en RLS.

---

## EP-01 — `GET /api/courses`

Listado público de cursos. Sin autenticación: solo publicados. Autenticado como instructor: incluye además sus propios cursos no publicados.

- **Auth:** No requerida.
- **Reglas asociadas:** `RLS-C1`, `RLS-C2`.
- **Query params:** `?category=<slug>` (filtra por categoría), `?page=` (default `1`), `?limit=` (default `20`, máximo `100`).
- **Orden por defecto:** `created_at desc`.
- **Response 200:** header `X-Total-Count` con el total sin paginar.
```json
[
  {
    "id": "c1f2...",
    "instructor_id": "a1b2...",
    "category_id": "cat1...",
    "title": "Introducción a Next.js",
    "description": "Curso desde cero",
    "price": 29.99,
    "is_published": true,
    "created_at": "2026-07-01T00:00:00Z",
    "updated_at": "2026-07-10T00:00:00Z"
  }
]
```
Tipo: `Course[]`.

---

## EP-02 — `POST /api/courses`

Crea un curso en borrador (`is_published: false` por defecto).

- **Auth:** Requerida, rol `instructor`.
- **Reglas asociadas:** `RLS-C4`.
- **Request body** (`CreateCourseInput`):
```json
{ "title": "Introducción a Next.js", "description": "Curso desde cero", "price": 29.99, "category_id": "cat1..." }
```
- **Response 201:** `Course` recién creado, con `instructor_id = auth.uid()`.
- **Errores:**
  - `403 { "error": "forbidden" }` — el usuario autenticado no tiene `profiles.role = 'instructor'`.
  - `401 { "error": "unauthorized" }` — sin sesión.
  - `400 { "error": "validation_error" }` — `title` vacío o >200 chars, `price < 0`, `description` >5000 chars, `category_id` con formato UUID inválido.

---

## EP-03 — `GET /api/courses/:id`

Detalle público de un curso. **No** embebe el array completo de reviews (eso es EP-09) — embebe el agregado (`average_rating`, `review_count`) para la ficha del curso (F7).

- **Auth:** No requerida.
- **Reglas asociadas:** `RLS-C1`, `RLS-C2`.
- **Response 200:** `CourseWithInstructor` — incluye `average_rating: number | null` (null si 0 reviews) y `review_count: number`.
- **Errores:**
  - `404 { "error": "not_found" }` — el curso no existe, o no está publicado y quien consulta no es el instructor dueño (mismo criterio no distinguible que `RLS-C2`).
  - `400 { "error": "validation_error" }` — `:id` no es un UUID válido.

---

## EP-04 — `PATCH /api/courses/:id`

Edita campos del curso, incluyendo publicar/despublicar.

- **Auth:** Requerida, dueño del curso.
- **Reglas asociadas:** `RLS-C3`, `RLS-C6` (publicar requiere ≥1 lección).
- **Request body** (`UpdateCourseInput`, todos los campos opcionales):
```json
{ "is_published": true }
```
- **Response 200:** `Course` actualizado.
- **Errores:**
  - `403 { "error": "forbidden" }` — el curso es visible para quien llama (publicado) pero no es el `instructor_id`.
  - `404 { "error": "not_found" }` — el curso no existe, o no está publicado y quien llama no es el dueño (mismo criterio de indistinguibilidad que `EP-03`/`RLS-C2` — ver "Distinguir 403 de 404" más abajo).
  - `400 { "error": "validation_error" }` — se intenta `is_published: true` con 0 filas en `lessons` para este curso; o `title`/`price`/`description` fuera de los límites de `Spec.md` §5.2.

> **Despublicar (`is_published: false`) no revoca acceso** de estudiantes ya inscritos a las lecciones — ver nota bajo `RLS-L1` en `Spec.md` §5.3. Este endpoint no dispara ninguna lógica adicional de revocación.

---

## EP-05 — `GET /api/courses/:id/lessons`

Lista las lecciones de un curso. **Contrato crítico:** un usuario no inscrito (incluido anónimo) recibe `200` con arreglo vacío, nunca un error de autorización — la ausencia de acceso es indistinguible de "el curso no tiene lecciones". Esto es distinto de "el curso no existe", que sí es un 404 (ver lógica del handler más abajo).

- **Auth:** No requerida (el filtrado de contenido lo hace RLS + el handler, no un chequeo previo de sesión).
- **Reglas asociadas:** `RLS-L1`, `RLS-L2`, `RLS-L3`.
- **Orden por defecto:** `position asc, created_at asc` (el segundo criterio desempata lecciones del mismo curso con `position` duplicado — no hay `unique constraint` sobre `position`, decisión validada). Admite `?page=`/`?limit=` (misma convención que EP-01), header `X-Total-Count`. Un curso con más lecciones que `?limit=` requiere pedir páginas adicionales o subir `?limit=` hasta el máximo (`100`) para armar el sidebar completo.
- **Lógica del handler (2 pasos, resuelve la ambigüedad 404 vs. `200 []`):**
  1. Verificar que el curso exista y sea visible para quien llama, con el mismo criterio que `RLS-C2`/EP-03 (publicado, o no publicado pero quien llama es el dueño). Si no → **404**.
  2. Si el curso es visible, consultar `lessons` (RLS decide qué filas devuelve). El resultado, vacío o no, siempre es **200**.
- **Response 200 (inscrito o instructor dueño):**
```json
[{ "id": "l1...", "course_id": "c1f2...", "title": "Clase 1", "content_url": "https://...", "position": 1, "created_at": "2026-07-01T00:00:00Z" }]
```
- **Response 200 (curso visible, no inscrito):**
```json
[]
```
- **Errores:**
  - `404 { "error": "not_found" }` — el curso no existe, o no está publicado y quien llama no es el dueño (paso 1 de arriba).

Tipo: `Lesson[]` en los casos 200.

---

## EP-06 — `POST /api/courses/:id/lessons`

Crea una lección dentro de un curso propio.

- **Auth:** Requerida, dueño del curso.
- **Reglas asociadas:** `RLS-L4`.
- **Request body** (`CreateLessonInput`):
```json
{ "title": "Clase 1", "content_url": "https://...", "position": 1 }
```
- **Response 201:** `Lesson` creada.
- **Errores:**
  - `403 { "error": "forbidden" }` — el curso padre es visible (publicado) pero quien llama no es su `instructor_id`.
  - `404 { "error": "not_found" }` — el curso padre no existe, o no está publicado y quien llama no es el dueño (ver "Distinguir 403 de 404" más abajo).
  - `400 { "error": "validation_error" }` — `title` vacío/>200 chars, `content_url` no es URL válida o >2048 chars.

> **`position` duplicado (decisión validada):** no se rechaza ni se reindexan las demás lecciones. Si `position` coincide con el de otra lección del mismo curso, el orden entre ambas en `EP-05` se desempata por `created_at asc`. El frontend es responsable de mandar valores coherentes al reordenar.

---

## EP-07 — `POST /api/courses/:id/enroll`

Inscribe al estudiante autenticado en el curso.

- **Auth:** Requerida, usuario con `profiles.role = 'estudiante'`.
- **Reglas asociadas:** `RLS-E2` (incluye chequeo de rol), `RLS-E3`.
- **Request body:** ninguno (el `course_id` viene de la ruta, `student_id` de la sesión).
- **Response 201:** `Enrollment` creada. **Sin gate de pago en v1**: se concede acceso sin importar `courses.price` (ver `Spec.md` §1/F8).
- **Errores:**
  - `409 { "error": "already_enrolled" }` — ya existía una fila `(student_id, course_id)`. El handler traduce la violación de constraint Postgres (`23505`) a este código.
  - `403 { "error": "forbidden" }` — quien llama tiene `profiles.role = 'instructor'` (los instructores no se inscriben, ni a cursos propios ni ajenos).
  - `404 { "error": "not_found" }` — el curso no existe o no está publicado.
  - `401 { "error": "unauthorized" }` — sin sesión.

---

## EP-08 — `GET /api/enrollments`

Lista las inscripciones del usuario autenticado.

- **Auth:** Requerida.
- **Reglas asociadas:** `RLS-E1`, `RLS-E4`.
- **Query params:** `?course_id=<uuid>` (opcional) — si quien llama es el `instructor_id` de ese curso, devuelve las inscripciones de ese curso (F5, listado de estudiantes). Si el curso no le pertenece, el filtro no amplía nada: se sigue aplicando el comportamiento por defecto (solo `student_id = auth.uid()`, que para un instructor son 0 filas).
- **Orden por defecto:** `created_at desc`. Admite `?page=`/`?limit=`, header `X-Total-Count`.
- **Response 200:** `Enrollment[]` — sin `?course_id=`, **exclusivamente** filas con `student_id = auth.uid()`; con `?course_id=` y siendo el dueño del curso, las inscripciones de ese curso.
- **Errores:**
  - `401 { "error": "unauthorized" }` — sin sesión.
  - `400 { "error": "validation_error" }` — `course_id` no es un UUID válido.

---

## EP-09 — `GET /api/courses/:id/reviews`

Lista las reviews de un curso publicado (lectura pública, para mostrar en la ficha del curso). **Estrictamente binario por diseño (decisión validada):** si `course.is_published = false`, la respuesta es `[]` para **cualquiera**, incluido el propio autor de una review ahí — sin excepción.

- **Auth:** No requerida.
- **Reglas asociadas:** `RLS-R2`.
- **Orden por defecto:** `created_at desc`. Admite `?page=`/`?limit=`, header `X-Total-Count`.
- **Response 200:** `Review[]`.
- **Implementación (nota, decisión validada):** la enmienda de `RLS-R2` (`or auth.uid() = student_id` en `reviews_select_public`) existe **solo** para que `EP-14`/`EP-15` puedan distinguir 403 de 404 sobre la propia review (§5.4bis de `Spec.md`). Ese matiz **no** debe filtrarse a este endpoint público: el Route Handler de `EP-09` chequea `courses.is_published` explícitamente en la capa de aplicación (no delega la condición completa a RLS) y devuelve `[]` si el curso no está publicado, sin importar quién pregunte. Esto mantiene a `EP-09` estrictamente atado a "curso publicado", tal como dice su descripción.

---

## EP-10 — `POST /api/courses/:id/reviews`

Crea una review. Solo permitido si el usuario está inscrito en el curso y tiene rol `estudiante`.

- **Auth:** Requerida, estudiante inscrito.
- **Reglas asociadas:** `RLS-R1` (incluye chequeo de rol), `RLS-R4`.
- **Request body** (`CreateReviewInput`):
```json
{ "rating": 5, "comment": "Excelente curso" }
```
- **Response 201:** `Review` creada.
- **Errores:**
  - `403 { "error": "forbidden" }` — el usuario no tiene una fila en `enrollments` para este curso, o tiene `profiles.role = 'instructor'`.
  - `409 { "error": "already_reviewed" }` — ya existía una review de este estudiante para este curso (constraint `unique(student_id, course_id)`).
  - `400 { "error": "validation_error" }` — `rating` fuera de 1–5, `comment` >2000 chars.

---

## EP-11 — `GET /api/categories`

Catálogo de categorías, lectura pública. Usado por el instructor para poblar el selector de categoría al crear/editar un curso (F1/F2), y por el estudiante para filtrar el catálogo (`?category=`, F6).

- **Auth:** No requerida.
- **Reglas asociadas:** `RLS-CAT1`.
- **Response 200:**
```json
[{ "id": "cat1...", "name": "Programación", "slug": "programacion" }]
```
Tipo: `Category[]`. Sin paginación (catálogo pequeño y de gestión manual).

---

## EP-12 — `PATCH /api/courses/:id/lessons/:lessonId`

Edita una lección de un curso propio (título, `content_url`, `position`).

- **Auth:** Requerida, dueño del curso.
- **Reglas asociadas:** `RLS-L4`.
- **Request body** (`UpdateLessonInput`, todos los campos opcionales):
```json
{ "position": 2 }
```
- **Response 200:** `Lesson` actualizada.
- **Errores:**
  - `403 { "error": "forbidden" }` — la lección es visible para quien llama (está inscrito en el curso) pero no es el `instructor_id` del curso padre — caso posible aunque infrecuente (un estudiante forzando esta ruta).
  - `404 { "error": "not_found" }` — la lección/el curso no existen, o quien llama no está inscrito ni es el dueño (no puede ni verla — ver "Distinguir 403 de 404" más abajo; es el caso típico: otro instructor cualquiera).
  - `400 { "error": "validation_error" }` — mismos límites que EP-06.

> `position` duplicado: mismo criterio que EP-06 — no se rechaza, se desempata por `created_at asc` en EP-05.

---

## EP-13 — `DELETE /api/courses/:id/lessons/:lessonId`

Elimina una lección de un curso propio.

- **Auth:** Requerida, dueño del curso.
- **Reglas asociadas:** `RLS-L4`, `RLS-L5`.
- **Implementación (decisión validada):** este endpoint **no** llama `supabase.from('lessons').delete()` directo. Invoca la función RPC de Postgres `delete_lesson_and_sync_publish(p_lesson_id)` vía `supabase.rpc(...)` (SQL de referencia en `Spec.md` §5.3, bajo `lessons`). La función corre `security invoker` (RLS-L4/RLS-C3 se siguen aplicando) y hace `DELETE` + `count` + `UPDATE` condicional en una única transacción de Postgres — dos llamadas HTTP secuenciales de `supabase-js` no comparten transacción y dejarían una ventana de carrera real.
- **Efecto colateral:** si la lección eliminada era la **última** del curso y el curso estaba `is_published = true`, la función deja `is_published = false` de forma atómica junto con el borrado. Si quedan ≥1 lecciones, no cambia nada.
- **Response 204:** sin body. El frontend debe asumir que el curso puede haber cambiado su estado de publicación y refrescar `GET /api/courses/:id` si lo necesita mostrar.
- **Errores:**
  - `403 { "error": "forbidden" }` — la lección es visible para quien llama pero no es el `instructor_id` del curso padre.
  - `404 { "error": "not_found" }` — la lección/el curso no existen, o no son visibles para quien llama.
  - **Cómo se decide 403 vs 404 (importante, ver "Distinguir 403 de 404" más abajo):** la función RPC en sí **no puede distinguir** ambos casos — un `DELETE` que afecta 0 filas por RLS es igual tanto si la lección no existe como si existe pero no sos el dueño. El Route Handler decide **antes** de invocar `delete_lesson_and_sync_publish`: hace un `SELECT` de la lección con el mismo cliente scoped a la sesión (policy `lessons_select_enrolled_or_owner`); 0 filas → 404; 1 fila (visible) pero no sos el dueño → 403; solo si sos el dueño se invoca el RPC.

---

## EP-14 — `PATCH /api/courses/:id/reviews/:reviewId`

Edita la propia review (rating y/o comentario).

- **Auth:** Requerida, autor de la review.
- **Reglas asociadas:** `RLS-R3`.
- **Request body** (`UpdateReviewInput`, todos los campos opcionales):
```json
{ "rating": 4, "comment": "Actualizo mi opinión" }
```
- **Response 200:** `Review` actualizada.
- **Errores:**
  - `403 { "error": "forbidden" }` — la review es visible (curso publicado, o sos su autor) pero `auth.uid() != student_id`.
  - `404 { "error": "not_found" }` — la review no existe, o no es visible para quien llama (curso no publicado y no sos el autor — ver "Distinguir 403 de 404" más abajo; usa `reviews_select_public` ya con la enmienda de `RLS-R2` que agrega `or auth.uid() = student_id`, sin la cual un autor en un curso despublicado recibiría 404 al editar su propia review).
  - `400 { "error": "validation_error" }` — `rating` fuera de 1–5, `comment` >2000 chars.

---

## EP-15 — `DELETE /api/courses/:id/reviews/:reviewId`

Elimina la propia review.

- **Auth:** Requerida, autor de la review.
- **Reglas asociadas:** `RLS-R3`.
- **Response 204:** sin body.
- **Errores:**
  - `403 { "error": "forbidden" }` — la review es visible (curso publicado, o sos su autor) pero `auth.uid() != student_id`.
  - `404 { "error": "not_found" }` — la review no existe, o no es visible para quien llama (mismo criterio que EP-14).

---

## EP-16 — `POST /api/profiles`

Crea la fila de `profiles` del usuario recién autenticado (F0/§4.0 de `Spec.md`). No existe trigger de Postgres para esto — este endpoint **es** el mecanismo de alta.

- **Auth:** Requerida (sesión de Supabase Auth existente, sin perfil todavía).
- **Reglas asociadas:** ninguna RLS de `profiles` restringe el insert más allá de `auth.uid() = id` (ver policy `profiles_insert_self`).
- **Request body** (`CreateProfileInput`):
```json
{ "role": "estudiante", "full_name": "Ada Lovelace" }
```
- **Response 201:** `Profile` creado, con `id = auth.uid()`. El `role` queda fijo para siempre (inmutable en v1).
- **Errores:**
  - `409 { "error": "already_has_profile" }` — ya existe una fila en `profiles` para `auth.uid()` (la PK lo impide a nivel DB; el handler traduce el `23505`).
  - `401 { "error": "unauthorized" }` — sin sesión.
  - `400 { "error": "validation_error" }` — `role` no es `"instructor"` ni `"estudiante"`, o `full_name` >150 chars.

---

## EP-17 — `GET /api/profiles/me`

Devuelve el perfil propio. Útil para que el frontend distinga "autenticado sin perfil" (debe llamar a EP-16) de "autenticado con perfil".

- **Auth:** Requerida.
- **Reglas asociadas:** `RLS-P1`.
- **Response 200:** `Profile`.
- **Errores:**
  - `404 { "error": "not_found" }` — el usuario tiene sesión pero aún no creó su perfil.
  - `401 { "error": "unauthorized" }` — sin sesión.

---

## EP-18 — `PATCH /api/profiles/me`

Edita el perfil propio. **`role` no es un campo aceptado** (inmutable en v1) — si el body lo incluye, el handler lo ignora o responde `400`, nunca lo aplica.

- **Auth:** Requerida.
- **Reglas asociadas:** `RLS-P2`.
- **Request body** (`UpdateProfileInput`):
```json
{ "full_name": "Ada Lovelace Byron" }
```
- **Response 200:** `Profile` actualizado.
- **Errores:**
  - `400 { "error": "validation_error" }` — se envía `role` en el body, o `full_name` >150 chars.
  - `401 { "error": "unauthorized" }` — sin sesión.

---

## Convenciones transversales

- **Arquitectura de acceso:** único punto de entrada = estos Route Handlers (RNF10). Sin `supabase-js` directo desde el frontend, ni para leer ni para escribir.
- **Paginación:** `?page=` (default `1`) / `?limit=` (default `20`, máx `100`) en `EP-01`, `EP-05`, `EP-08`, `EP-09`. El body sigue siendo el array plano; el total sin paginar va en el header `X-Total-Count`.
- **400 Bad Request:** nueva variante `"validation_error"` de `ApiError`, usada en todo endpoint de escritura para: campos de texto vacíos o fuera de longitud (`Spec.md` §5.2), `price < 0`, `rating` fuera de 1–5, `content_url` con formato inválido, y parámetros de ruta/query que no son UUIDs válidos.
- **Efectos colaterales de escritura:** `EP-13` auto-despublica el curso si borra su última lección estando publicado (`RLS-L5`), implementado como función RPC de Postgres (`delete_lesson_and_sync_publish`) para atomicidad real — no como llamadas secuenciales de `supabase-js`.
- **Distinguir 403 de 404 (`EP-04`, `EP-06`, `EP-12`, `EP-13`, `EP-14`, `EP-15`):** un `UPDATE`/`DELETE` que afecta 0 filas por RLS es indistinguible entre "no existe" y "no tenés permiso". El Route Handler resuelve esto con un `SELECT` de visibilidad primero (mismo cliente scoped a la sesión, sin `service_role`): 0 filas → `404` (mismo criterio de no revelar existencia que `RLS-C2`/`EP-03`/`EP-05`); 1 fila visible pero la escritura falla → `403`. Requiere que la policy de lectura de cada tabla sea igual o más permisiva que la de escritura — por eso `reviews_select_public` (`RLS-R2`) se amplió con `or auth.uid() = student_id`. Detalle completo y tabla por endpoint en `Spec.md` §5.4bis, "Distinguir 403 de 404 en escrituras gateadas por ownership".
- **`position` de lecciones:** sin `unique constraint`; duplicados permitidos, desempate por `created_at asc` en `EP-05`.
- **Fuera de alcance v1 (explícito, no pendiente):** `DELETE /api/courses/:id` (RLS-C5 vive solo en RLS), subida de archivos a Supabase Storage (RNF8 de `Spec.md`), integración de pagos (§1 de `Spec.md`), preview gratuito de lecciones sin inscripción (RLS-L1/L2 lo prohíben tal como están).
