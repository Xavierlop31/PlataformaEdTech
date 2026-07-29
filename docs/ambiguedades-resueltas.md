# Registro de Ambigüedades — Revisión del Implementador Escéptico

Historial de todas las ambigüedades y decisiones faltantes detectadas durante la revisión de `Spec.md` desde la perspectiva de "implementador escéptico", a lo largo de 5 rondas. Todas quedaron resueltas hacia `Spec.md` v1.3.1. Este documento es un **registro histórico** (qué se preguntó, qué se decidió) — la fuente de verdad vigente sigue siendo `Spec.md`; si algo aquí contradice al Spec actual, gana el Spec.

Convención: cada ítem indica dónde vive su resolución (sección/ID de `Spec.md`, `docs/contracts/endpoints.md`, `docs/traceability.md` o un `.feature`).

---

## Ronda 1 — Primera lectura completa (23 hallazgos)

### A. Alta de usuarios / `profiles` (bloqueante)
| # | Ambigüedad | Resolución |
|---|---|---|
| 1 | No existía endpoint ni flujo para crear la fila en `profiles`. | Alta explícita vía `POST /api/profiles` (`EP-16`), no trigger. Ver `Spec.md` §2, §4.0, `RLS-P3`. |
| 2 | ¿El usuario elige su rol en el signup o se asigna después? | Se elige en el propio formulario de signup, enviado en el body de `EP-16`. |
| 3 | ¿El rol es mutable? | No, inmutable en v1 — trigger `profiles_role_immutable` lo bloquea incluso ante `UPDATE` directo. Ver `RLS-P2`. |
| 4 | Mecanismo de autenticación sin confirmar. | OAuth vía Google, único proveedor v1. Ver `Spec.md` §2. |

### B. Policies RLS faltantes por escribir
| # | Ambigüedad | Resolución |
|---|---|---|
| 5 | `profiles`/`categories` no tenían SQL de policy de referencia (solo prosa). | SQL completo agregado en `Spec.md` §5.3, incluyendo el trigger de inmutabilidad de `role`. |

### C. Endpoints que el contrato daba por hecho pero no definía
| # | Ambigüedad | Resolución |
|---|---|---|
| 6 | No existía `GET /api/categories`. | `EP-11` agregado. |
| 7 | F3 prometía editar/eliminar lecciones pero solo existía `POST`. | `EP-12` (`PATCH`) y `EP-13` (`DELETE`) agregados. |
| 8 | ¿`DELETE` de curso y `PATCH`/`DELETE` de review se exponen en v1? | Reviews sí (`EP-14`/`EP-15`); borrado de curso no, decisión explícita — vive solo en RLS (`RLS-C5`). |
| 9 | F5 ("ver inscritos de mi curso") no tenía parámetro definido. | `EP-08` admite `?course_id=` para el instructor dueño. |
| 10 | No había contrato para subir archivos (video/imagen). | Declarado explícitamente fuera de alcance v1 (`RNF8`); `content_url` es texto libre validado como URL. |

### D. Estados de error no cubiertos
| # | Ambigüedad | Resolución |
|---|---|---|
| 11 | Ningún endpoint definía `400 Bad Request`. | Nueva variante `validation_error` en `ApiError`, con reglas de validación por endpoint en `§5.4bis`. |
| 12 | Cruce de roles no resuelto (¿un instructor puede inscribirse/reseñar?). | No — `RLS-E2`/`RLS-R1` verifican `profiles.role = 'estudiante'` además de la propiedad de la fila. |
| 13 | `EP-05` con `course_id` inexistente: ¿`200 []` o `404`? | `404` — el handler verifica existencia/visibilidad del curso *antes* de evaluar inscripción (§5.4bis, "Existencia vs. autorización"). |

### E. Límites no especificados
| # | Ambigüedad | Resolución |
|---|---|---|
| 14 | Sin paginación en ningún listado. | `?page=`/`?limit=` + header `X-Total-Count` en `EP-01`, `EP-05`, `EP-08`, `EP-09` (§5.4bis). |
| 15 | Sin orden de lectura definido. | Orden por defecto documentado por endpoint en §5.4bis. |
| 16 | Sin longitud máxima en campos de texto. | `CHECK (char_length(...) <= N)` en el DDL de las 6 tablas (§5.2), validado también en el Route Handler. |
| 17 | F6 mencionaba filtro por categoría sin parámetro. | `EP-01` admite `?category=<slug>`. |

### F. Reglas de negocio ambiguas
| # | Ambigüedad | Resolución |
|---|---|---|
| 18 | ¿Gate de pago en la inscripción? | No en v1 — `price` es informativo; `enrollments` se crea sin verificar pago. |
| 19 | ¿Se puede publicar un curso con 0 lecciones? | No — `RLS-C6`, `400 validation_error` si se intenta. |
| 20 | ¿Despublicar revoca acceso de inscritos? | No — documentado explícitamente bajo `RLS-L1`. |
| 21 | ¿Preview gratuito de una lección sin inscripción? | Fuera de alcance v1, backlog explícito (última línea del checklist de `Spec.md`). |

### G. Inconsistencia contrato vs. tipos
| # | Ambigüedad | Resolución |
|---|---|---|
| 22 | `EP-03` prometía "reviews agregadas" pero `CourseWithInstructor` no tenía ese campo. | Se agregaron `average_rating` y `review_count` al tipo. |

### H. Cobertura Gherkin incompleta
| # | Ambigüedad | Resolución |
|---|---|---|
| 23 | Sin escenarios para los errores 400/401/404 ya documentados. | Escenarios agregados en los `.feature` correspondientes (ver `docs/traceability.md`). |

---

## Ronda 2 — Tras aplicar la Ronda 1 (7 hallazgos)

| # | Ambigüedad | Resolución |
|---|---|---|
| 1 | **(Bloqueante)** ¿Todas las escrituras pasan por los Route Handlers, o el frontend puede usar `supabase-js` directo? | **`RNF10`** nueva: único punto de entrada es `app/api/*`; el frontend nunca instancia `supabase-js` contra Postgres. |
| 2 | **(Bloqueante, gap introducido por `EP-13`)** Borrar la última lección de un curso publicado no revisaba el invariante "curso publicado con 0 lecciones". | **`RLS-L5`** nueva: auto-despublica el curso en la misma operación que el borrado. |
| 3 | **(Bloqueante)** Sin definición de qué pasa con `position` duplicado entre lecciones del mismo curso. | Se permite; desempate de lectura por `created_at asc` (documentado en DDL, `§5.4bis` y Gherkin). |
| 4 | ¿`EP-05` (lecciones) se pagina igual que el resto, rompiendo la UX del reproductor? | Sí, decisión validada — el frontend sube `?limit=` hasta el máximo (100) si necesita la lista completa. |
| 5 | ¿Qué proveedor(es) OAuth exactamente? | Google, único proveedor v1. |
| 6 | `app/README.md`/`supabase/README.md` desactualizados (solo `EP-01`..`EP-08`). | Reescritos, cubren `EP-01`..`EP-18`. |
| 7 | `PlanArquitectura.md` contradecía la decisión de testing de `ADR-0001`. | Se le agregó un aviso explícito marcándolo como superado/no-fuente-de-verdad. |

---

## Ronda 3 — Tras aplicar la Ronda 2 (1 hallazgo)

| # | Ambigüedad | Resolución |
|---|---|---|
| 1 | `RLS-L5` decía "en la misma transacción", pero dos llamadas secuenciales de `supabase-js` (`.delete()` + `.update()`) no comparten transacción real contra PostgREST. | Se implementa como función RPC de Postgres `delete_lesson_and_sync_publish` (`security invoker`, `BEGIN`/`COMMIT` real), invocada vía `supabase.rpc(...)`. SQL de referencia en `Spec.md` §5.3 bajo `lessons`. |

---

## Ronda 4 — Tras aplicar la Ronda 3 (1 hallazgo)

| # | Ambigüedad | Resolución |
|---|---|---|
| 1 | La función RPC de `RLS-L5` solo puede lanzar **un** error genérico cuando una escritura afecta 0 filas por RLS — pero `EP-04`, `EP-06`, `EP-12`, `EP-13`, `EP-14`, `EP-15` prometían distinguir `403` (no sos el dueño) de `404` (no existe), algo mecánicamente imposible a partir de "0 filas afectadas". | Patrón **"`SELECT` de visibilidad antes de escribir"** (mismo cliente scoped a la sesión, sin `service_role`): 0 filas visibles → `404`; visible pero la escritura falla → `403`. Documentado con tabla por endpoint en `Spec.md` §5.4bis, "Distinguir 403 de 404". Requirió además ampliar `reviews_select_public` (`RLS-R2`) con `or auth.uid() = student_id` para que el autor de una review siempre pueda verla. |

---

## Ronda 5 — Tras aplicar la Ronda 4 (2 hallazgos menores, sin impacto de seguridad)

| # | Ambigüedad | Resolución |
|---|---|---|
| 1 | La enmienda a `RLS-R2` (ronda 4) tenía un efecto secundario: el autor de una review en un curso ya despublicado vería su propia fila en el listado "público" `EP-09`, rompiendo la promesa de "solo cursos publicados". | `EP-09` documentado como **estrictamente binario**: el Route Handler chequea `courses.is_published` explícitamente en la capa de aplicación (no delega en RLS) y devuelve `[]` para cualquiera, incluido el autor, si el curso no está publicado. |
| 2 | Un paso de Gherkin ("`GET` de esa review, lectura propia") no correspondía a ningún `EP-xx` HTTP real. | Comentario inline agregado en `docs/gherkin/reviews.feature` aclarando que ese paso verifica la policy `RLS-R2` directamente contra Supabase CLI local, no una llamada HTTP. |

---

## Estado final

Sin bloqueantes pendientes. Único punto abierto (no es una ambigüedad, es una tarea de ejecución): validar las policies SQL de referencia (§5.3) contra una instancia real de Supabase antes de mover `Spec.md` a "Aprobado" — ver checklist al final de `Spec.md`.
