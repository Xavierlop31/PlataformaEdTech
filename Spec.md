# Spec.md — Plataforma EdTech

**Versión:** 1.2.1
**Estado:** Draft para validación (ambigüedades de tres rondas de implementación resueltas — pendiente validar policies SQL contra Supabase de prueba)
**Stack:** Next.js (App Router) + Supabase (Postgres + Auth + RLS + Storage)
**Fecha:** 2026-07-29 (revisión sobre observaciones del Implementador)

---

## 1. Visión

Plataforma de cursos online estilo Udemy/Gumroad donde **instructores** publican y venden cursos en video, y **estudiantes** se inscriben y consumen el contenido. El entregable de este documento es el **SPEC validado y sus contratos** (modelo de datos, reglas de acceso RLS y contratos de endpoints), que sirve como fuente única de verdad antes de escribir código de implementación.

### Objetivos del producto
- Permitir a un instructor crear, editar y publicar cursos compuestos por lecciones.
- Permitir a un estudiante descubrir cursos publicados, inscribirse y acceder al contenido de las lecciones solo si está inscrito.
- Permitir reviews (reseñas) de estudiantes inscritos para dar señal de calidad a futuros compradores.
- Mantener toda la seguridad de acceso a nivel de base de datos (RLS de Supabase), no solo en la capa de aplicación.

### No-objetivos (fuera de alcance v1)
- Procesamiento de pagos real (se asume `enrollments` como el registro de "acceso concedido"; la integración con pasarela de pago se especificará en un documento aparte).
- Certificados, quizzes/evaluaciones, foros de discusión.
- Roles adicionales (admin, moderador) — quedan fuera de este SPEC v1.

---

## 2. Usuarios (roles)

El sistema tiene dos roles, almacenados en `profiles.role`:

| Rol | Descripción | Puede hacer |
|---|---|---|
| **instructor** | Crea y administra sus propios cursos y lecciones. | Crear/editar/publicar cursos propios, crear lecciones en cursos propios, ver inscripciones de sus cursos (agregadas, no el detalle de otros estudiantes salvo lo necesario). |
| **estudiante** | Consume cursos. | Ver cursos publicados, inscribirse, ver sus propias inscripciones, ver lecciones de cursos en los que está inscrito, dejar reviews de cursos en los que está inscrito. |

**Regla de identidad:** todo usuario autenticado tiene una fila en `profiles` (1:1 con `auth.users`). El rol determina permisos de escritura; la lectura de contenido publicado es independiente del rol (ver §5 RLS).

**Alta de perfil (decisión validada):** la fila en `profiles` **no** se crea automáticamente vía trigger de Postgres. Se crea explícitamente vía `POST /api/profiles` (EP-16), invocado por el frontend inmediatamente después de un signup exitoso en Supabase Auth. Hasta que ese endpoint se complete, el usuario tiene sesión (`auth.users`) pero no tiene `profiles` — el frontend debe tratar "autenticado sin perfil" como un estado válido intermedio y reintentar/forzar la creación del perfil antes de permitir cualquier otra acción. Ver F0 en §3.3 y RNF9 en §6.

**Asignación y mutabilidad de rol (decisión validada):** el usuario elige su rol (`instructor` o `estudiante`) en el propio formulario de signup; ese valor se envía como parte del body de `POST /api/profiles`. **El rol es inmutable en v1**: no existe endpoint ni policy que permita cambiarlo una vez creada la fila (`UPDATE profiles` solo puede modificar `full_name`, nunca `role` — ver RLS-P2 y EP-18). Si en el futuro se requiere "convertirme en instructor", será un flujo explícito fuera de este SPEC v1.

**Mecanismo de autenticación (decisión validada):** Supabase Auth vía **OAuth**, con **Google como único proveedor en v1** (default de bajo riesgo; ampliar a GitHub/otros es un cambio de configuración en Supabase Auth, no de contrato — no requiere tocar este Spec si se agrega después). Cierra el punto abierto del checklist original.

Un usuario anónimo (no autenticado) puede navegar el catálogo público (cursos publicados) pero no puede inscribirse, ver lecciones ni dejar reviews.

---

## 3. Funcionalidades

### 3.0 Transversal — alta de cuenta
- F0. Tras el signup en Supabase Auth (OAuth), el usuario crea explícitamente su perfil (`POST /api/profiles`) eligiendo su rol (`instructor`/`estudiante`). Ver §2.

### 3.1 Instructor
- F1. Crear curso (borrador, no publicado por defecto).
- F2. Editar curso propio (título, descripción, precio, categoría, estado publicado/no publicado). Publicar (`is_published: true`) requiere que el curso tenga **al menos 1 lección**; en caso contrario el endpoint responde `400` (ver EP-04, RLS-C3).
- F3. Crear/editar/eliminar lecciones dentro de un curso propio (`EP-06` crear, `EP-12` editar, `EP-13` eliminar).
- F4. Publicar/despublicar un curso propio. Despublicar **no revoca** el acceso de estudiantes ya inscritos a las lecciones (ver nota bajo RLS-L1 en §5.3); solo lo retira del catálogo público y bloquea nuevas inscripciones (RLS-C1/C2 ya filtran por `is_published`).
- F5. Ver lista de estudiantes inscritos en sus cursos (`EP-08` con filtro opcional `?course_id=`).

### 3.2 Estudiante
- F6. Explorar catálogo de cursos publicados (con filtro por categoría, `EP-01`) y consultar el catálogo de categorías (`EP-11`).
- F7. Ver detalle público de un curso publicado (título, descripción, precio, instructor, rating promedio y cantidad de reviews) sin necesidad de estar inscrito; el listado completo de reviews se consulta aparte (`EP-09`).
- F8. Inscribirse a un curso. **Sin gate de pago en v1**: cualquier usuario autenticado con rol `estudiante` obtiene acceso inmediato sin importar `courses.price` (campo informativo/display en v1 — ver §1 No-objetivos y RLS-E2). Un usuario con rol `instructor` **no puede** inscribirse (ni siquiera a su propio curso).
- F9. Ver lista de sus propias inscripciones.
- F10. Ver lecciones de un curso en el que está inscrito.
- F11. Dejar una review (rating + comentario) de un curso en el que está inscrito, y editar/borrar su propia review después (`EP-14`/`EP-15`). Solo rol `estudiante` puede dejar reviews (RLS-R1); un `instructor` no puede, ni siquiera en cursos ajenos.

### 3.3 Transversal
- F12. Autenticación vía Supabase Auth con **OAuth** (decisión validada, ver §2).
- F13. Cada operación de escritura queda protegida tanto por RLS (base de datos) como por validación en el endpoint (defensa en profundidad), incluyendo validación de payload (`400 Bad Request` — ver §5.4bis).

---

## 4. Flujos principales

### 4.0 Flujo: Alta de cuenta (previo a todo lo demás)
1. Usuario completa OAuth con Supabase Auth → existe fila en `auth.users`, aún **no** existe fila en `profiles`.
2. Frontend llama `POST /api/profiles` (EP-16) con `{ role, full_name? }` elegido en el formulario de signup.
3. Se crea la fila en `profiles` con `id = auth.uid()`. El `role` queda fijo para siempre (inmutable en v1 — ver §2).
4. Cualquier acción que dependa de `profiles` (crear curso, inscribirse, dejar review) asume que este paso ya se completó; el frontend no debe permitir esas acciones mientras el perfil no exista (`GET /api/profiles/me`, EP-17, sirve para chequear si ya existe).

### 4.1 Flujo: Instructor publica un curso
1. Instructor autenticado (con perfil `role = 'instructor'`) crea curso → `POST /api/courses` → fila en `courses` con `instructor_id = auth.uid()`, `is_published = false`.
2. Instructor agrega lecciones → `POST /api/courses/:id/lessons`.
3. Instructor marca como publicado → `PATCH /api/courses/:id` con `is_published = true`.
   - Si el curso tiene 0 lecciones → **400 Bad Request** (`{ "error": "validation_error" }`), no se publica.
4. El curso aparece en el catálogo público (`GET /api/courses`) para cualquier visitante, incluso anónimo.

### 4.2 Flujo: Estudiante descubre e ingresa a un curso
1. Visitante (anónimo o autenticado) navega `GET /api/courses` (solo ve publicados; admite `?category=`, `?page=`, `?limit=`).
2. Visitante ve detalle `GET /api/courses/:id` (incluye `average_rating`/`review_count` agregados, no la lista completa de reviews ni las lecciones si no está inscrito).
3. Usuario se autentica (si no lo estaba) y crea su perfil si aún no existe (§4.0).
4. Estudiante se inscribe → `POST /api/courses/:id/enroll`. **Sin gate de pago en v1** — el `price` del curso es informativo, no bloquea el acceso.
   - Si el que llama tiene `role = 'instructor'` → **403 Forbidden** (`{ "error": "forbidden" }`), los instructores no se inscriben.
   - Si ya estaba inscrito → **409 Conflict**.
   - Si es la primera inscripción → **201 Created**, fila en `enrollments`.
5. Estudiante accede a lecciones → `GET /api/courses/:id/lessons`.
   - Si el curso no existe (o no está publicado y quien pregunta no es el dueño) → **404 Not Found**, mismo criterio de indistinguibilidad que `RLS-C2`/`EP-03`.
   - Si el curso existe/es visible y está inscrito (o es el instructor dueño) → 200 con el array de lecciones.
   - Si el curso existe/es visible pero NO está inscrito → **200 con array vacío `[]`** (no 403 — el curso existe y es público, solo el contenido está gateado).
6. Estudiante deja review → `POST /api/courses/:id/reviews` (solo `role = 'estudiante'` inscrito; si no está inscrito → 403, si el rol no es `estudiante` → 403).

### 4.3 Flujo: Estudiante consulta sus inscripciones
1. `GET /api/enrollments` (autenticado) → devuelve únicamente las inscripciones cuyo `student_id = auth.uid()`. Nunca las de otro estudiante.
2. `GET /api/enrollments?course_id=X` (autenticado, dueño del curso X) → devuelve las inscripciones de ese curso (F5); ver EP-08.

---

## 5. Arquitectura

### 5.1 Stack técnico
- **Frontend/Backend:** Next.js (App Router, Route Handlers como API layer).
- **Base de datos + Auth + RLS:** Supabase (Postgres).
- **Autorización:** Row Level Security (RLS) en Postgres como línea de defensa primaria; los Route Handlers aplican reglas de negocio adicionales (ej. lógica de 409 en inscripción duplicada) pero **nunca** deben depender de un `service_role` que bypasee RLS para servir datos a usuarios finales, salvo justificación explícita.
- **Acceso a datos (decisión validada — RNF10):** el frontend **nunca** instancia `supabase-js` contra Postgres directamente, ni para leer ni para escribir. Toda interacción pasa por los Route Handlers (`app/api/*`), que usan un cliente Supabase scoped a la sesión del usuario (nunca `service_role` expuesto al navegador). Esto es obligatorio porque buena parte de la lógica de este SPEC no vive en RLS y solo se aplica si el acceso pasa por el Route Handler: `RLS-C6` y `RLS-L5` (invariante de curso publicado con lecciones), la validación de formato de `content_url`, la distinción `404` vs `200 []` de `EP-05`, la paginación (`X-Total-Count`) y el orden por defecto. Si el navegador pudiera llamar a Supabase directo con su JWT, todas esas reglas quedarían sin aplicar pese a que RLS siga activo.

### 5.2 Modelo de datos (6 tablas)

```sql
-- profiles: 1:1 con auth.users
-- Se crea explícitamente vía POST /api/profiles (EP-16) tras el signup OAuth,
-- NO vía trigger. El rol es inmutable en v1 (ver §2, RLS-P2, EP-18).
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('instructor', 'estudiante')),
  full_name text check (char_length(full_name) <= 150),
  created_at timestamptz not null default now()
);

-- categories: catálogo de categorías de curso
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) <= 100),
  slug text not null unique check (char_length(slug) <= 100)
);

-- courses
create table courses (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references profiles(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 5000),
  price numeric(10,2) not null default 0 check (price >= 0),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index courses_is_published_idx on courses (is_published);

-- lessons: pertenecen a un curso
-- position NO tiene unique constraint (decisión validada): se permiten valores duplicados
-- entre lecciones del mismo curso; el desempate en lecturas es position asc, created_at asc.
-- El frontend es responsable de mandar valores coherentes al reordenar (sin endpoint de
-- reordenamiento masivo en v1).
create table lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  content_url text check (content_url is null or char_length(content_url) <= 2048),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index lessons_course_id_idx on lessons (course_id);
create index lessons_course_id_position_idx on lessons (course_id, position);

-- enrollments: relación estudiante-curso
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_id, course_id) -- garantiza no duplicidad a nivel DB
);
create index enrollments_course_id_idx on enrollments (course_id);

-- reviews: reseñas de estudiantes inscritos
create table reviews (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 2000),
  created_at timestamptz not null default now(),
  unique (student_id, course_id) -- un estudiante, una review por curso
);
create index reviews_course_id_idx on reviews (course_id);
```

**Límites de longitud (resumen):** `profiles.full_name` ≤150, `categories.name`/`slug` ≤100, `courses.title` 1–200, `courses.description` ≤5000, `lessons.title` 1–200, `lessons.content_url` ≤2048, `reviews.comment` ≤2000. El Route Handler valida estos mismos límites antes de llegar a Postgres y responde `400 { "error": "validation_error" }` si se exceden (ver §5.4bis).

### 5.3 Reglas de acceso (RLS) — EXPLÍCITAS y verificables

Cada regla se expresa como **criterio verificable** (dado un estado, se puede comprobar con una prueba automatizada si pasa o falla).

#### `courses`

| ID | Regla | Criterio verificable |
|---|---|---|
| RLS-C1 | Lectura de cursos publicados es libre, incluso anónima. | `select * from courses where is_published = true` ejecutado con rol `anon` (sin sesión) **devuelve las filas publicadas** (no vacío, no error). |
| RLS-C2 | Un curso no publicado NO es visible para nadie excepto su instructor dueño. | `select * from courses where is_published = false` ejecutado por un usuario que **no** es `instructor_id` (incluyendo `anon` y otros estudiantes/instructores) **devuelve 0 filas** para ese curso. El mismo query ejecutado por el instructor dueño (`auth.uid() = instructor_id`) **sí devuelve la fila**. |
| RLS-C3 | Solo el instructor dueño puede `UPDATE` un curso. | `update courses set ... where id = X` con `auth.uid() != instructor_id` **falla / afecta 0 filas**. Con `auth.uid() = instructor_id` **afecta 1 fila**. |
| RLS-C4 | Solo un usuario con `profiles.role = 'instructor'` puede `INSERT` en `courses`, y solo con `instructor_id = auth.uid()`. | Insert con `instructor_id != auth.uid()` **falla**. Insert de un usuario con rol `estudiante` **falla**. |
| RLS-C5 | Solo el instructor dueño puede `DELETE` su curso. | `delete from courses where id = X` con `auth.uid() != instructor_id` **afecta 0 filas**. **Decisión validada:** en v1 esta regla se mantiene como protección de base de datos solamente — **no** se expone como endpoint HTTP (`DELETE /api/courses/:id` queda fuera de alcance de v1, decisión explícita, no pendiente). |
| RLS-C6 | Un curso no puede publicarse (`is_published: true`) si tiene 0 lecciones. | **Regla de negocio en el Route Handler, no en RLS/Postgres** (no hay forma limpia de expresar "count de tabla relacionada" en una policy `with check` sin una subquery costosa en cada update). `PATCH /api/courses/:id` con `is_published: true` y 0 filas en `lessons` para ese `course_id` responde **400** (`{ "error": "validation_error" }`) y no aplica el cambio. |

**Policy SQL de referencia (RLS-C1 + RLS-C2 + RLS-C3):**
```sql
alter table courses enable row level security;

create policy "courses_select_published_or_owner"
on courses for select
using ( is_published = true or auth.uid() = instructor_id );

create policy "courses_insert_owner_instructor"
on courses for insert
with check (
  auth.uid() = instructor_id
  and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'instructor')
);

create policy "courses_update_owner"
on courses for update
using ( auth.uid() = instructor_id )
with check ( auth.uid() = instructor_id );

create policy "courses_delete_owner"
on courses for delete
using ( auth.uid() = instructor_id );
```

#### `lessons`

| ID | Regla | Criterio verificable |
|---|---|---|
| RLS-L1 | Las lecciones solo son visibles para estudiantes **inscritos** en el curso al que pertenecen. | `select * from lessons where course_id = X` ejecutado por un estudiante **inscrito** en X **devuelve las lecciones**. |
| RLS-L2 | Un usuario **no inscrito** (incluido anónimo) que consulta las lecciones de un curso recibe **lista vacía, HTTP 200**, nunca 403/401. | El endpoint `GET /api/courses/:id/lessons` para un no-inscrito responde `200 OK` con body `[]`. La policy RLS filtra las filas (0 rows) en vez de rechazar la query; el Route Handler no debe traducir "0 filas" en un código de error. |
| RLS-L3 | El instructor dueño del curso también puede ver (y gestionar) las lecciones de su propio curso, esté o no "inscrito". | `select * from lessons where course_id = X` con `auth.uid() = courses.instructor_id` **devuelve las lecciones**. |
| RLS-L4 | Solo el instructor dueño puede `INSERT`/`UPDATE`/`DELETE` lecciones de su curso. | Cualquier escritura sobre `lessons` de un curso ajeno **falla** (0 filas afectadas) para todo actor que no sea el `instructor_id` del curso padre. |
| RLS-L5 | Un curso publicado nunca puede quedar con 0 lecciones — si se borra la última lección de un curso con `is_published = true`, el curso se **auto-despublica** de forma atómica. | **Regla de negocio implementada como función RPC de Postgres** (mismo motivo que RLS-C6: no se puede expresar limpiamente en RLS un `count` de la tabla relacionada; y una secuencia de llamadas HTTP independientes de `supabase-js` — `.delete()` + `.select(count)` + `.update()` — no comparte transacción, dejando una ventana de carrera real). `EP-13` invoca `delete_lesson_and_sync_publish(p_lesson_id)` vía `supabase.rpc(...)`, que hace `DELETE` + `count` + `UPDATE` condicional dentro de un único `BEGIN/COMMIT` de Postgres. Si quedan ≥1 lecciones tras el borrado, `is_published` no cambia. **(Decisión validada — ver SQL de referencia más abajo.)** |

**Policy SQL de referencia:**
```sql
alter table lessons enable row level security;

create policy "lessons_select_enrolled_or_owner"
on lessons for select
using (
  exists (
    select 1 from enrollments e
    where e.course_id = lessons.course_id and e.student_id = auth.uid()
  )
  or exists (
    select 1 from courses c
    where c.id = lessons.course_id and c.instructor_id = auth.uid()
  )
);

create policy "lessons_write_owner"
on lessons for all
using (
  exists (select 1 from courses c where c.id = lessons.course_id and c.instructor_id = auth.uid())
)
with check (
  exists (select 1 from courses c where c.id = lessons.course_id and c.instructor_id = auth.uid())
);
```

**Función RPC de referencia (`RLS-L5`, invocada por `EP-13` vía `supabase.rpc(...)`):**
```sql
-- security invoker (default): corre con los permisos del llamador, así que RLS-L4 (dueño)
-- y RLS-C3 (dueño) se siguen aplicando dentro de la función — no bypasea RLS, solo agrupa
-- dos escrituras en una única transacción real (BEGIN/COMMIT implícito de la función).
create or replace function delete_lesson_and_sync_publish(p_lesson_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  v_course_id uuid;
  v_remaining int;
begin
  select course_id into v_course_id from lessons where id = p_lesson_id;

  delete from lessons where id = p_lesson_id;
  if not found then
    -- RLS bloqueó el delete (no es el dueño) o la lección no existe; el Route Handler
    -- traduce esto a 403/404 según corresponda (ver EP-13).
    raise exception using errcode = 'PGRST', message = 'lesson_not_found_or_forbidden';
  end if;

  select count(*) into v_remaining from lessons where course_id = v_course_id;

  if v_remaining = 0 then
    update courses set is_published = false where id = v_course_id and is_published = true;
  end if;
end;
$$;
```
> **Decisión validada — despublicar no revoca acceso:** `lessons_select_enrolled_or_owner` deliberadamente **no** chequea `courses.is_published`. Un estudiante ya inscrito conserva acceso a las lecciones aunque el instructor despublique el curso después; despublicar solo retira el curso del catálogo (`RLS-C1`) y de nuevas inscripciones. Si en el futuro se quiere revocar acceso al despublicar, habría que añadir `and c.is_published = true` a esta policy — cambio de alcance explícito, no aplica en v1.
> Nota de implementación: RLS-L2 depende de que el Route Handler **no** convierta "consulta con 0 resultados" en un error. La ausencia de filas por RLS es indistinguible (a propósito) de "el curso no tiene lecciones"; el contrato del endpoint es devolver siempre `200` con el array (vacío o no).

#### `enrollments`

| ID | Regla | Criterio verificable |
|---|---|---|
| RLS-E1 | Cada estudiante solo puede ver **sus propias** inscripciones. | `select * from enrollments` ejecutado por el estudiante A **nunca** incluye filas con `student_id != A`. |
| RLS-E2 | Un estudiante solo puede `INSERT` una inscripción con `student_id = auth.uid()`, **y solo si su perfil tiene `role = 'estudiante'`**. | Insert con `student_id != auth.uid()` **falla**. Insert de un usuario cuyo `profiles.role = 'instructor'` **falla también**, incluso si intenta inscribirse a su propio curso — un instructor nunca puede tener fila en `enrollments`. **(Decisión validada — cruce de roles.)** |
| RLS-E3 | Inscribirse dos veces al mismo curso devuelve **409 Conflict**, no un 500 ni un 201 duplicado. | La restricción `unique (student_id, course_id)` en DB provoca un error de constraint violation en el segundo insert; el Route Handler **debe** capturar ese error (código Postgres `23505`) y traducirlo a `HTTP 409`. |
| RLS-E4 | El instructor de un curso puede ver las inscripciones de **su** curso (para el listado de estudiantes, F5), pero no las de cursos ajenos. | `select * from enrollments where course_id = X` con `auth.uid() = courses(X).instructor_id` **devuelve filas**; con cualquier otro `auth.uid()` (que no sea el propio estudiante inscrito ni el instructor dueño) **devuelve 0 filas**. |

**Policy SQL de referencia:**
```sql
alter table enrollments enable row level security;

create policy "enrollments_select_own_or_course_owner"
on enrollments for select
using (
  auth.uid() = student_id
  or exists (select 1 from courses c where c.id = enrollments.course_id and c.instructor_id = auth.uid())
);

create policy "enrollments_insert_own"
on enrollments for insert
with check (
  auth.uid() = student_id
  and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'estudiante')
);
```

**Contrato de endpoint — manejo del 409 y del rol:**
```
POST /api/courses/:id/enroll
→ Éxito (1ra vez):        201 Created  { id, student_id, course_id, created_at }
→ Ya inscrito (repetido): 409 Conflict { error: "already_enrolled" }
→ Rol != estudiante:      403 Forbidden { error: "forbidden" }  (ej. un instructor intentando inscribirse)
→ Curso no publicado:     404 Not Found
→ No autenticado:         401 Unauthorized
```

#### `reviews`

| ID | Regla | Criterio verificable |
|---|---|---|
| RLS-R1 | Solo estudiantes **inscritos** en el curso, **con `profiles.role = 'estudiante'`**, pueden crear (`INSERT`) una review para ese curso. | Insert en `reviews` por un estudiante sin fila correspondiente en `enrollments (student_id, course_id)` **falla**. Insert de un usuario con `role = 'instructor'` **falla también**, incluso en cursos ajenos donde por hipótesis estuviera inscrito. Insert por un estudiante inscrito con `role = 'estudiante'` **se acepta**. **(Decisión validada — cruce de roles, mismo criterio que RLS-E2.)** |
| RLS-R2 | La lectura de reviews de un curso publicado es libre (para mostrarlas en el detalle público, F7), incluso para anónimos. | `select * from reviews where course_id = X` (X publicado) con rol `anon` **devuelve las filas**. |
| RLS-R3 | Un estudiante solo puede editar/borrar **su propia** review. | `update/delete reviews where id = Y` con `auth.uid() != student_id` **afecta 0 filas**. **Decisión validada:** en v1 esta regla **sí** se expone como endpoint HTTP — `PATCH /api/courses/:id/reviews/:reviewId` (EP-14) y `DELETE /api/courses/:id/reviews/:reviewId` (EP-15). |
| RLS-R4 | Un estudiante no puede dejar más de una review por curso. | La restricción `unique (student_id, course_id)` rechaza el segundo insert (constraint violation → el endpoint debe responder 409, igual patrón que RLS-E3). |

**Policy SQL de referencia:**
```sql
alter table reviews enable row level security;

create policy "reviews_select_public"
on reviews for select
using (
  exists (select 1 from courses c where c.id = reviews.course_id and c.is_published = true)
);

create policy "reviews_insert_enrolled_student"
on reviews for insert
with check (
  auth.uid() = student_id
  and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'estudiante')
  and exists (
    select 1 from enrollments e
    where e.course_id = reviews.course_id and e.student_id = auth.uid()
  )
);

create policy "reviews_update_delete_own"
on reviews for update using ( auth.uid() = student_id ) with check ( auth.uid() = student_id );
create policy "reviews_delete_own"
on reviews for delete using ( auth.uid() = student_id );
```

#### `profiles` / `categories`

| ID | Regla | Criterio verificable |
|---|---|---|
| RLS-P1 | Cualquier usuario autenticado puede leer su propio `profile`; los perfiles públicos (nombre, rol) son legibles por todos para mostrar "instructor: Fulano" en el detalle del curso. | `select * from profiles where id = auth.uid()` siempre devuelve la fila propia. `select full_name, role from profiles` es legible públicamente. |
| RLS-P2 | Un usuario solo puede editar su propio `profile`, y **nunca** su propio `role` (inmutable en v1 — decisión validada). | `update profiles where id != auth.uid()` **afecta 0 filas**. `update profiles set role = ... where id = auth.uid()` **no cambia `role`** (columna excluida del `with check`/manejada por trigger de protección — ver SQL de referencia). |
| RLS-P3 | Solo el propio usuario autenticado puede crear su fila en `profiles` (`INSERT`), con `id = auth.uid()`, una única vez. No hay trigger de alta — este `INSERT` **es** el mecanismo de creación (EP-16, decisión validada — ver §2/§4.0). | `insert into profiles (id, ...) values (X, ...)` con `auth.uid() != X` **falla**. Un segundo insert para el mismo `id` **falla** por violación de PK (el endpoint lo traduce a `409 already_has_profile`). |
| RLS-CAT1 | `categories` es de solo lectura pública; su escritura queda fuera de alcance v1 (gestión manual/admin). | `select * from categories` libre para todos; no existe policy de insert/update/delete para roles `anon`/`authenticated`. |

**Policy SQL de referencia (`profiles`):**
```sql
alter table profiles enable row level security;

-- Lectura: cualquiera (incluido anon) ve full_name/role de cualquier perfil (necesario para
-- mostrar "instructor: Fulano" en EP-01/EP-03); el propio usuario también ve su fila completa.
create policy "profiles_select_public"
on profiles for select
using ( true );

-- Insert: únicamente el propio usuario autenticado puede crear su fila (EP-16), una sola vez
-- (la PK id = auth.uid() ya impide duplicados).
create policy "profiles_insert_self"
on profiles for insert
with check ( auth.uid() = id );

-- Update: el propio usuario puede editar su fila, pero el trigger de abajo bloquea cambios de role.
create policy "profiles_update_self"
on profiles for update
using ( auth.uid() = id )
with check ( auth.uid() = id );

-- Trigger de protección: impide mutar `role` incluso vía UPDATE directo del dueño.
create or replace function profiles_protect_role()
returns trigger as $$
begin
  if new.role is distinct from old.role then
    raise exception 'role is immutable in v1';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger profiles_role_immutable
before update on profiles
for each row execute function profiles_protect_role();
```

**Policy SQL de referencia (`categories`):**
```sql
alter table categories enable row level security;

create policy "categories_select_public"
on categories for select
using ( true );

-- Sin policy de insert/update/delete: ningún rol (`anon`/`authenticated`) puede escribir
-- categorías en v1. Gestión manual vía consola de Supabase/`service_role`.
```

### 5.4 Contrato de endpoints (resumen)

> Detalle ampliado (payloads de ejemplo, errores completos) en [`docs/contracts/endpoints.md`](docs/contracts/endpoints.md). Los IDs `EP-xx` son la clave de correlación usada en `docs/traceability.md`.

| ID | Endpoint | Método | Auth requerida | Respuesta éxito | Respuestas de error relevantes |
|---|---|---|---|---|---|
| EP-01 | `/api/courses` | GET | No | 200 `Course[]` (solo publicados si no autenticado o no dueño; admite `?category=`, `?page=`, `?limit=`) | — |
| EP-02 | `/api/courses` | POST | Sí (instructor) | 201 `Course` | 403 si rol != instructor, 400 validación |
| EP-03 | `/api/courses/:id` | GET | No | 200 `CourseWithInstructor` (incluye `average_rating`/`review_count`) | 404 si no publicado y no es el dueño |
| EP-04 | `/api/courses/:id` | PATCH | Sí (dueño) | 200 `Course` | 403 si `auth.uid() != instructor_id`, 404, **400 si publica sin lecciones o payload inválido** |
| EP-05 | `/api/courses/:id/lessons` | GET | No | 200 `Lesson[]` (**vacío `[]` si no inscrito**, nunca 403) | 404 si el curso no existe/no es visible |
| EP-06 | `/api/courses/:id/lessons` | POST | Sí (dueño) | 201 `Lesson` | 403 si no es dueño, 400 validación |
| EP-07 | `/api/courses/:id/enroll` | POST | Sí (estudiante) | 201 `Enrollment` | **409 si ya inscrito**, 403 si rol != estudiante, 404 si curso no publicado, 401 |
| EP-08 | `/api/enrollments` | GET | Sí | 200 `Enrollment[]` (**solo propias**; admite `?course_id=` para el instructor dueño, F5) | 401 |
| EP-09 | `/api/courses/:id/reviews` | GET | No | 200 `Review[]` (si curso publicado) | — |
| EP-10 | `/api/courses/:id/reviews` | POST | Sí (estudiante inscrito) | 201 `Review` | **403 si no inscrito o rol != estudiante**, 409 si ya dejó review |
| EP-11 | `/api/categories` | GET | No | 200 `Category[]` | — |
| EP-12 | `/api/courses/:id/lessons/:lessonId` | PATCH | Sí (dueño) | 200 `Lesson` | 403 si no es dueño, 404, 400 validación |
| EP-13 | `/api/courses/:id/lessons/:lessonId` | DELETE | Sí (dueño) | 204 (auto-despublica el curso si era la última lección de un curso publicado — `RLS-L5`) | 403 si no es dueño, 404 |
| EP-14 | `/api/courses/:id/reviews/:reviewId` | PATCH | Sí (autor) | 200 `Review` | 403 si no es autor, 404, 400 validación |
| EP-15 | `/api/courses/:id/reviews/:reviewId` | DELETE | Sí (autor) | 204 | 403 si no es autor, 404 |
| EP-16 | `/api/profiles` | POST | Sí (sesión, sin perfil aún) | 201 `Profile` | 409 si ya existe perfil para `auth.uid()`, 400 validación (`role` inválido) |
| EP-17 | `/api/profiles/me` | GET | Sí | 200 `Profile` | 404 si aún no creó su perfil |
| EP-18 | `/api/profiles/me` | PATCH | Sí | 200 `Profile` | 400 si intenta cambiar `role` (campo ignorado/rechazado) |

> Nota: `DELETE /api/courses/:id` (RLS-C5) queda **fuera de la API v1** por decisión validada — la regla vive solo en RLS/Postgres.

### 5.4bis Convenciones transversales de la API

**Paginación (EP-01, EP-05, EP-08, EP-09):** query params `?page=` (default `1`) y `?limit=` (default `20`, máximo `100`; valores fuera de rango se acotan, no dan error). La respuesta sigue siendo el array plano (`Course[]`, `Lesson[]`, etc.) más un header `X-Total-Count` con el total de filas sin paginar, para no romper el tipo de respuesta ya definido en `types.ts`.

**Orden por defecto (sin parámetro de ordenamiento en v1):**
- `EP-01` (`courses`): `created_at desc`.
- `EP-05` (`lessons`): `position asc, created_at asc` — el segundo criterio es el desempate cuando dos lecciones del mismo curso comparten `position` (no hay `unique constraint` sobre `position`, decisión validada; ver DDL de `lessons` en §5.2).
- `EP-08` (`enrollments`): `created_at desc`.
- `EP-09` (`reviews`): `created_at desc`.

**Efectos colaterales de escritura (decisión validada):** `EP-13` (`DELETE` de lección) auto-despublica el curso si la lección borrada era la última y el curso estaba `is_published = true` — ver `RLS-L5`. Esto se implementa como una función RPC de Postgres (`delete_lesson_and_sync_publish`, SQL de referencia en §5.3 bajo `lessons`), **no** como dos llamadas secuenciales de `supabase-js` (`.delete()` + `.update()`), porque esas dos llamadas son requests HTTP independientes contra PostgREST sin transacción compartida — dejarían una ventana de carrera real. El Route Handler de `EP-13` llama `supabase.rpc('delete_lesson_and_sync_publish', { p_lesson_id })` en vez de `supabase.from('lessons').delete()`. La respuesta sigue siendo `204` sin body; el frontend debe asumir que tras un `DELETE` exitoso el curso puede haber cambiado su estado de publicación y refrescar `GET /api/courses/:id` si lo necesita mostrar.

**Filtros:**
- `EP-01` admite `?category=<slug>` (filtra por `categories.slug`, join con `courses.category_id`).
- `EP-08` admite `?course_id=<uuid>`, solo tiene efecto si quien llama es el `instructor_id` de ese curso (F5); si el `course_id` pertenece a otro instructor, se ignora el filtro y se devuelve el comportamiento por defecto (solo las inscripciones propias, que para un instructor son 0 filas).

**Errores de validación (`400 Bad Request`):** nueva variante `"validation_error"` en `ApiError`. Se dispara en cualquier endpoint de escritura (`EP-02, EP-04, EP-06, EP-10, EP-12, EP-14, EP-16, EP-18`) cuando el body no cumple los límites de `§5.2` u otras reglas de forma: `title`/`full_name` vacíos o demasiado largos, `price < 0`, `rating` fuera de 1–5, `content_url` no es una URL válida (`http(s)://`), UUID malformado en un parámetro de ruta. Response: `{ "error": "validation_error", "message": "<detalle>" }`.

**Existencia vs. autorización (EP-05, y por extensión EP-06/EP-12/EP-13):** antes de aplicar la lógica de "200 + `[]` si no inscrito" (RLS-L2), el Route Handler primero verifica que el curso exista y sea visible para quien llama (mismo criterio que `RLS-C2`/EP-03): si `course_id` no existe, o no está publicado y quien pregunta no es el dueño, la respuesta es **404**. Solo si el curso existe/es visible se evalúa la inscripción, y ahí sí "no inscrito" → `200 []` en vez de un error. Esto resuelve la ambigüedad entre "curso inexistente" y "curso sin acceso": ambos casos previos a RLS-L2 se tratan igual que EP-03.

---

## 6. Requisitos no funcionales

- **RNF1 — Seguridad por defecto:** RLS debe estar `ENABLE`d en las 6 tablas antes de exponer cualquier endpoint. Ninguna tabla puede quedar accesible vía `service_role` desde el cliente (`service_role` solo en contexto de servidor de confianza, nunca expuesto al browser).
- **RNF2 — Defensa en profundidad:** las reglas de negocio con semántica HTTP específica (409 en duplicados, 200+vacío en lecciones no autorizadas) se implementan en el Route Handler **además** de la policy RLS subyacente; RLS es la garantía de que ningún bypass de la capa de aplicación filtra datos. Cuando una regla de negocio requiere que dos o más escrituras ocurran atómicamente (ej. `RLS-L5`: borrar lección + despublicar curso), se implementa como función RPC de Postgres invocada vía `supabase.rpc(...)` — nunca como llamadas secuenciales de `supabase-js` (`.delete()` + `.update()`), que son requests HTTP independientes sin transacción compartida contra PostgREST.
- **RNF3 — Testabilidad:** cada regla de la sección 5.3 debe tener al menos un test automatizado (unitario o de integración contra una instancia de Supabase local/test) que reproduzca el criterio verificable tal como está escrito. **Framework validado (decisión ver [`docs/adr/0001-estrategia-testing.md`](docs/adr/0001-estrategia-testing.md)):** Vitest híbrido — ejecuta literalmente los escenarios de `docs/gherkin/*.feature` vía una capa BDD sobre Vitest (`@amiceli/vitest-cucumber`), contra un stack de **Supabase CLI local** (nunca mocks de Postgres para una regla RLS). Los tests de componentes de frontend usan Vitest + Testing Library, sin Gherkin. CI queda fuera de alcance de v1 (decisión explícita). Ver [`tests/README.md`](tests/README.md) para la estructura prevista.
- **RNF4 — Rendimiento:** las queries de `courses` (listado público) deben tener índice en `is_published`; `enrollments` y `reviews` deben tener índice en `(student_id, course_id)` (ya cubierto por el `unique`) y en `course_id` para joins desde `lessons`/`reviews`.
- **RNF5 — Consistencia de datos:** la unicidad de `(student_id, course_id)` en `enrollments` y `reviews` se garantiza a nivel de constraint de base de datos, no solo en la capa de aplicación (evita condiciones de carrera en inscripciones concurrentes).
- **RNF6 — Disponibilidad del catálogo:** el listado de cursos publicados (`GET /api/courses`) no debe requerir sesión ni llamada autenticada a Supabase; debe funcionar con la `anon key` pública.
- **RNF7 — Auditabilidad:** todas las tablas registran `created_at`; `courses` registra además `updated_at` para poder auditar cambios de publicación.
- **RNF8 — Escalabilidad de contenido:** `lessons.position` permite reordenar sin necesidad de migraciones; el contenido audiovisual (`content_url`) se asume servido desde Supabase Storage o un CDN externo, fuera del alcance de este SPEC. **La subida de archivos (video/imagen de portada) y la generación de la URL resultante quedan explícitamente fuera de alcance de v1**: el instructor provee `content_url` como texto libre (ya validado como URL, §5.4bis); el flujo de upload a Supabase Storage se especificará en un documento aparte, igual que la integración de pagos (§1).
- **RNF9 — Precondición de perfil:** ningún endpoint que dependa de `profiles` (crear curso, inscribirse, dejar review, etc.) debe asumir que el perfil existe solo porque hay sesión (`auth.uid()` no nulo). Todos deben manejar el caso "autenticado sin perfil" devolviendo `403` o `404` según corresponda, nunca un 500 por violación de FK — ver F0/§4.0.
- **RNF10 — Único punto de entrada (decisión validada):** el frontend nunca instancia `supabase-js` contra Postgres directamente, ni para leer ni para escribir. Toda interacción de datos pasa por los Route Handlers (`app/api/*`), que usan un cliente Supabase scoped a la sesión del usuario (nunca `service_role` expuesto al navegador). Ver §5.1. Esto es lo que garantiza que se apliquen `RLS-C6`, `RLS-L5`, la validación de formato de `content_url`, la distinción 404/200 de `EP-05` y las convenciones de §5.4bis — ninguna de ellas vive en RLS.

---

## Checklist de validación del SPEC (antes de pasar a implementación)

- [x] Confirmar mecanismo de autenticación: **OAuth** (decisión validada, ver §2/F12).
- [x] Confirmar si el precio (`courses.price`) requiere integración de pagos en v1: **no** — `enrollments` se crea "gratis" (acceso manual) hasta que exista esa integración (decisión validada, ver §1/F8).
- [x] Confirmar si un instructor puede también ser estudiante de otros cursos: **no**, un rol por perfil, inmutable en v1 (decisión validada, ver §2, RLS-E2, RLS-R1).
- [x] Confirmar mecanismo de alta de `profiles`: **endpoint explícito `POST /api/profiles` (EP-16)**, no trigger (decisión validada, ver §2/§4.0).
- [x] Confirmar si publicar un curso sin lecciones está permitido: **no**, requiere ≥1 lección, `400` si se intenta sin ellas (decisión validada, ver RLS-C6).
- [x] Confirmar si despublicar revoca acceso de inscritos existentes: **no**, conservan acceso (decisión validada, ver nota bajo RLS-L1).
- [x] Confirmar si se exponen `DELETE /api/courses/:id` y `PATCH`/`DELETE /api/courses/:id/reviews/:reviewId` como endpoints v1: **reviews sí (EP-14/EP-15), borrado de curso no** (decisión validada, ver RLS-C5/RLS-R3).
- [x] Confirmar arquitectura de acceso a datos: **solo vía Route Handlers**, el frontend nunca usa `supabase-js` directo (decisión validada, ver RNF10/§5.1).
- [x] Confirmar comportamiento al borrar la última lección de un curso publicado (`EP-13`): **auto-despublica el curso**, implementado como función RPC de Postgres (`delete_lesson_and_sync_publish`) para atomicidad real, no como llamadas secuenciales de `supabase-js` (decisión validada, ver `RLS-L5`).
- [x] Confirmar manejo de `lessons.position` duplicado: **se permite, desempate por `created_at asc`**, sin `unique constraint` (decisión validada, ver DDL §5.2 y orden por defecto §5.4bis).
- [x] Confirmar paginación de `EP-05` (lecciones): **se pagina igual que `EP-01`/`EP-08`/`EP-09`** (`?page=`/`?limit=`, default 20) — decisión validada, ver §5.4bis.
- [ ] Validar que las policies SQL de referencia (§5.3), incluyendo las nuevas de `profiles`/`categories`, se ejecuten sin error contra una instancia Supabase de prueba antes de mover este SPEC a "Aprobado".
- [ ] (Backlog, fuera de v1) Evaluar un patrón de "preview gratuito" (primera lección visible sin inscripción) — no forma parte de este SPEC; RLS-L1/L2 lo prohíben tal como están hoy por diseño.
