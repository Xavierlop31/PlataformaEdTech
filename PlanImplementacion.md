# Plan de Implementación — Apex Performance Learning (Plataforma EdTech)

**Estado:** Propuesta — pendiente de aprobación. No se ha escrito código de implementación todavía.
**Contrato de datos/API/RLS:** [`Spec.md`](Spec.md) v1.3.1 (fuente de verdad única — ver nota de reconciliación abajo).
**Diseño UI:** [`Technical_spec.md`](Technical_spec.md) (estética "Apex Performance Learning", inspirada en McLaren F1).
**Fecha:** 2026-08-07

---

## 0. Reconciliación Spec.md ↔ Technical_spec.md

`Technical_spec.md` trae un modelo de datos y una tabla de endpoints **simplificados** (le falta `categories` en detalle, no tiene `reviews`, no tiene los 18 endpoints, no tiene RLS-C6/L5/paginación/400/403-vs-404). Por instrucción explícita del usuario, **`Spec.md` manda en todo lo de datos/contrato/RLS**; de `Technical_spec.md` este plan solo toma:

- El nombre de producto: **Apex Performance Learning**.
- La guía de estilo completa (§3 de `Technical_spec.md`): paleta de colores, tipografía `Sora`.
- El stack (coincide con `Spec.md`: Next.js App Router + Supabase + Tailwind).

Ningún endpoint, tabla o regla de `Technical_spec.md` que contradiga a `Spec.md` se implementa — `Spec.md` es el contrato.

---

## 1. Las 6 claves del contrato (verificación de cobertura)

Cada tabla del modelo de `Spec.md` §5.2 tiene su endpoint y su componente correspondiente en este plan. Esta tabla es la referencia cruzada rápida; el detalle completo está en §3 y §4.

| Clave (tabla) | Endpoints (`Spec.md` §5.4) | Componentes principales (§4) |
|---|---|---|
| `profiles` | `EP-16`, `EP-17`, `EP-18` | `OnboardingForm`, `ProfileForm`, `RoleBadge` |
| `categories` | `EP-11` | `CategoryFilterBar`, `CategorySelect` |
| `courses` | `EP-01`, `EP-02`, `EP-03`, `EP-04` | `CourseCard`, `CourseGrid`, `CourseDetailHeader`, `CourseForm`, `InstructorCourseTable` |
| `lessons` | `EP-05`, `EP-06`, `EP-12`, `EP-13` | `LessonSidebar`, `LessonPlayer`, `LessonForm`, `LessonListEditor` |
| `enrollments` | `EP-07`, `EP-08` | `EnrollButton`, `MyEnrollmentsList`, `StudentRosterTable` |
| `reviews` | `EP-09`, `EP-10`, `EP-14`, `EP-15` | `ReviewList`, `ReviewForm`, `ReviewCard`, `RatingStars` |

---

## 2. Stack y convenciones

- **Next.js 14+ App Router**, Route Handlers como única capa de API (`RNF10` de `Spec.md` — el navegador nunca instancia `supabase-js` directo).
- **Supabase**: Postgres + Auth (OAuth Google) + RLS + `supabase-js` solo del lado servidor (`@supabase/ssr` para cookies de sesión).
- **Tailwind CSS**, tokens de diseño definidos en `tailwind.config.ts` a partir de `Technical_spec.md` §3 (ver §5 de este plan).
- **Validación**: `zod`, un schema por DTO de escritura (`docs/contracts/types.ts`), reutilizado en cada Route Handler para producir `400 validation_error` con los mismos límites de `Spec.md` §5.2.
- **Testing**: Vitest + `@amiceli/vitest-cucumber` contra Supabase CLI local, según `docs/adr/0001-estrategia-testing.md` (fase 8 de este plan).

---

## 3. Plan de Endpoints (18 Route Handlers)

Todos los códigos de éxito/error, query params y reglas asociadas son los ya confirmados en [`docs/contracts/endpoints.md`](docs/contracts/endpoints.md); esta tabla solo mapea cada uno a su archivo de implementación.

| ID | Método y ruta | Archivo (`app/api/...`) | Lógica no trivial a implementar |
|---|---|---|---|
| EP-01 | `GET /api/courses` | `courses/route.ts` | Filtro `?category=`, paginación, `X-Total-Count`, mezcla publicados + propios si hay sesión de instructor. |
| EP-02 | `POST /api/courses` | `courses/route.ts` | Valida rol `instructor` vía `profiles`, zod para `CreateCourseInput`. |
| EP-03 | `GET /api/courses/[id]/route.ts` | `courses/[id]/route.ts` | Agrega `average_rating`/`review_count` (subquery o vista). |
| EP-04 | `PATCH /api/courses/[id]/route.ts` | `courses/[id]/route.ts` | Patrón "SELECT visibilidad → 403/404" (`Spec.md` §5.4bis); `RLS-C6` (0 lecciones) antes de aceptar `is_published:true`. |
| EP-05 | `GET /api/courses/[id]/lessons/route.ts` | `courses/[id]/lessons/route.ts` | Paso 1 existencia/visibilidad (404) → paso 2 `200` con `[]` o datos (`RLS-L2`). Orden `position asc, created_at asc`. |
| EP-06 | `POST /api/courses/[id]/lessons/route.ts` | `courses/[id]/lessons/route.ts` | Mismo patrón 403/404 que EP-04 sobre el curso padre. |
| EP-07 | `POST /api/courses/[id]/enroll/route.ts` | `courses/[id]/enroll/route.ts` | Captura `23505` → `409`; 403 si `role='instructor'`. |
| EP-08 | `GET /api/enrollments/route.ts` | `enrollments/route.ts` | `?course_id=` opcional (rol instructor dueño). |
| EP-09 | `GET /api/courses/[id]/reviews/route.ts` | `courses/[id]/reviews/route.ts` | Chequeo explícito de `is_published` en app (no delega 100% en RLS — ver nota bajo `EP-09` en `endpoints.md`). |
| EP-10 | `POST /api/courses/[id]/reviews/route.ts` | `courses/[id]/reviews/route.ts` | 403 si no inscrito o rol≠estudiante; 409 si repetida. |
| EP-11 | `GET /api/categories/route.ts` | `categories/route.ts` | Lectura simple, sin paginación. |
| EP-12 | `PATCH /api/courses/[id]/lessons/[lessonId]/route.ts` | `courses/[id]/lessons/[lessonId]/route.ts` | Patrón 403/404 con policy `lessons_select_enrolled_or_owner`. |
| EP-13 | `DELETE /api/courses/[id]/lessons/[lessonId]/route.ts` | `courses/[id]/lessons/[lessonId]/route.ts` | Invoca RPC `delete_lesson_and_sync_publish` (nunca `.delete()` directo — `RLS-L5`). |
| EP-14 | `PATCH /api/courses/[id]/reviews/[reviewId]/route.ts` | `courses/[id]/reviews/[reviewId]/route.ts` | Patrón 403/404 con `reviews_select_public` (ya con la enmienda `or auth.uid()=student_id`). |
| EP-15 | `DELETE /api/courses/[id]/reviews/[reviewId]/route.ts` | `courses/[id]/reviews/[reviewId]/route.ts` | Igual patrón que EP-14. |
| EP-16 | `POST /api/profiles/route.ts` | `profiles/route.ts` | Captura `23505` → `409 already_has_profile`. |
| EP-17 | `GET /api/profiles/me/route.ts` | `profiles/me/route.ts` | `404` si no hay perfil aún (estado válido, `RNF9`). |
| EP-18 | `PATCH /api/profiles/me/route.ts` | `profiles/me/route.ts` | Rechaza/ignora `role` en el body. |

**Helpers compartidos (`app/lib/`):**
- `lib/supabase/server.ts` — cliente Supabase scoped a la sesión (Route Handlers), y `lib/supabase/middleware.ts` para refresco de sesión.
- `lib/http.ts` — `jsonError(status, code, message?)` uniforme con la forma `ApiError` de `docs/contracts/types.ts`.
- `lib/validation/*.ts` — un schema `zod` por DTO (`CreateCourseInput`, `UpdateCourseInput`, `CreateLessonInput`, `UpdateLessonInput`, `CreateReviewInput`, `UpdateReviewInput`, `CreateProfileInput`, `UpdateProfileInput`), con los límites exactos de `Spec.md` §5.2.
- `lib/visibility.ts` — implementa una vez el patrón "SELECT de visibilidad antes de escribir" (`Spec.md` §5.4bis) para reutilizar en `EP-04/06/12/13/14/15`.

---

## 4. Plan de Componentes (Next.js App Router)

```
app/
├── layout.tsx                 # <html>, fuente Sora, ThemeProvider (Anthracite Carbon por defecto)
├── globals.css                # tokens Tailwind de Technical_spec.md §3
│
├── (public)/
│   ├── page.tsx                          # Catálogo — EP-01, EP-11
│   └── courses/[id]/page.tsx             # Detalle público — EP-03, EP-09
│
├── (auth)/
│   ├── layout.tsx                        # Guard: exige sesión; si no hay profile → redirige a /onboarding (F0/RNF9)
│   ├── onboarding/page.tsx               # Elección de rol — EP-16
│   ├── profile/page.tsx                  # Ver/editar perfil — EP-17, EP-18
│   ├── enrollments/page.tsx              # "Mi aprendizaje" — EP-08
│   ├── courses/[id]/learn/page.tsx       # Reproductor de curso (solo inscritos) — EP-05
│   └── instructor/
│       ├── layout.tsx                    # Guard adicional: exige role='instructor'
│       ├── courses/page.tsx              # Dashboard — EP-01 (propios) filtrados
│       ├── courses/new/page.tsx          # Crear curso — EP-02
│       └── courses/[id]/
│           ├── edit/page.tsx             # Editar curso + publicar/despublicar — EP-04
│           ├── lessons/page.tsx          # CRUD de lecciones — EP-06, EP-12, EP-13
│           └── students/page.tsx         # Roster de inscritos — EP-08 (?course_id=)
│
├── api/                                   # (18 Route Handlers — ver §3)
│
├── components/
│   ├── ui/                               # Design system (§5)
│   │   ├── Button.tsx, Card.tsx, Badge.tsx, Input.tsx, Textarea.tsx, Select.tsx
│   │   ├── ProgressBar.tsx               # "Speedline Blue" — progreso de curso/lecciones
│   │   ├── RatingStars.tsx, Pagination.tsx, EmptyState.tsx, Spinner.tsx, Toast.tsx
│   ├── layout/
│   │   ├── Navbar.tsx                    # links según rol/sesión, logo "Apex Performance Learning"
│   │   └── Footer.tsx
│   ├── courses/
│   │   ├── CourseCard.tsx, CourseGrid.tsx, CategoryFilterBar.tsx
│   │   ├── CourseDetailHeader.tsx        # título, precio, instructor, average_rating
│   │   ├── CourseForm.tsx                # crea/edita (EP-02/EP-04), incluye toggle publicar (bloqueado si 0 lecciones)
│   │   └── InstructorCourseTable.tsx
│   ├── lessons/
│   │   ├── LessonSidebar.tsx             # lista ordenada, usada en el reproductor
│   │   ├── LessonPlayer.tsx              # reproduce content_url
│   │   ├── LessonForm.tsx                # crea/edita (EP-06/EP-12)
│   │   └── LessonListEditor.tsx          # drag-order → PATCH position, borrar → EP-13
│   ├── enrollments/
│   │   ├── EnrollButton.tsx              # POST EP-07, maneja 409/403 con mensajes claros
│   │   ├── MyEnrollmentsList.tsx
│   │   └── StudentRosterTable.tsx
│   ├── reviews/
│   │   ├── ReviewList.tsx, ReviewCard.tsx
│   │   └── ReviewForm.tsx                # crea (EP-10) o edita la propia (EP-14), con borrar (EP-15)
│   └── profile/
│       ├── OnboardingForm.tsx            # radio instructor/estudiante — EP-16
│       ├── ProfileForm.tsx               # EP-18 (role deshabilitado, solo lectura)
│       └── RoleBadge.tsx
│
├── lib/                                  # ver §3 "Helpers compartidos"
└── middleware.ts                         # refresco de sesión Supabase en cada request
```

---

## 5. Diseño UI (`Technical_spec.md` §3 → `tailwind.config.ts`)

| Token | Valor | Uso |
|---|---|---|
| `papaya` (primario) | `#ff8700` | CTAs (`EnrollButton`, "Publicar curso"), acentos críticos, foco de inputs. |
| `carbon` (fondo) | `#131313` | Fondo base, modo oscuro por defecto (sin toggle claro en v1). |
| `speedline` (progreso) | *(a definir tono exacto — ver nota abajo)* | `ProgressBar`, estados "completado". |
| `surface` | `#393939` | `Card`, bordes de `Input`/`Select`. |
| Tipografía | `Sora` (Google Fonts, `next/font`) | Toda la UI; pesos audaces (`font-bold`/`font-extrabold`) en `CourseDetailHeader`, hero del catálogo. |

> **Nota:** `Technical_spec.md` no da el valor hex exacto de "Speedline Blue". Antes de implementar `ProgressBar`/estados de completado, propongo usar `#0090FF` (azul técnico de alto contraste sobre `#131313`, coherente con la estética) y ajustarlo si el usuario prefiere otro tono — no bloquea el resto del plan.

---

## 6. Supabase (schema + RLS + RPC)

Siguiendo `supabase/README.md`, migraciones en orden de dependencias, copiando literalmente el DDL/SQL ya validado en `Spec.md` §5.2/§5.3:

1. `..._create_profiles.sql` (incluye trigger `profiles_role_immutable`)
2. `..._create_categories.sql`
3. `..._create_courses.sql`
4. `..._create_lessons.sql` (incluye índice `(course_id, position)`)
5. `..._create_enrollments.sql`
6. `..._create_reviews.sql`
7. `..._enable_rls_policies.sql` (las 6 tablas)
8. `..._create_delete_lesson_and_sync_publish_rpc.sql` (`RLS-L5`)
9. `..._seed_categories.sql` (datos manuales de categorías — gestión admin, `RLS-CAT1`)

---

## 7. Fases de implementación (orden propuesto)

| Fase | Contenido | Depende de |
|---|---|---|
| 0 | Scaffold Next.js + Tailwind + Supabase CLI (`supabase init`), variables de entorno, fuente `Sora`, tokens de diseño. | — |
| 1 | Migraciones (§6) + validar policies contra Supabase local (cierra el pendiente del checklist de `Spec.md`). | Fase 0 |
| 2 | Auth OAuth Google + `middleware.ts` + `EP-16/17/18` + `OnboardingForm`/`ProfileForm` + guard `(auth)/layout.tsx`. | Fase 1 |
| 3 | Catálogo público: `EP-01`, `EP-03`, `EP-11` + `CourseCard`/`CourseGrid`/`CategoryFilterBar`/`CourseDetailHeader`. | Fase 1 |
| 4 | Gestión de instructor: `EP-02`, `EP-04`, `EP-06`, `EP-12`, `EP-13` + `CourseForm`/`LessonListEditor` + guard de rol. | Fase 2, 3 |
| 5 | Inscripciones y reproductor: `EP-07`, `EP-08`, `EP-05` + `EnrollButton`/`LessonPlayer`/`LessonSidebar`/`MyEnrollmentsList`/`StudentRosterTable`. | Fase 4 |
| 6 | Reviews: `EP-09`, `EP-10`, `EP-14`, `EP-15` + `ReviewList`/`ReviewForm`/`RatingStars`. | Fase 5 |
| 7 | Pulido de diseño (design system completo, responsive, estados vacíos/carga/error). | Fases 3–6 |
| 8 | Testing: implementar `tests/integration/*.steps.test.ts` (Vitest + `@amiceli/vitest-cucumber`, `ADR-0001`), actualizar `docs/traceability.md` a `Implementado`. | Fases 1–6 |

---

## 8. Fuera de alcance de este plan (ya excluido en `Spec.md`)

`DELETE /api/courses/:id`, subida de archivos a Storage, integración de pagos, preview gratuito sin inscripción — ver `Spec.md` §5.4bis y `endpoints.md`, "Convenciones transversales".

---

## Siguiente paso

Este documento es **solo el plan**. No se ejecuta nada (sin `supabase init`, sin `create-next-app`, sin código) hasta que se apruebe explícitamente.
