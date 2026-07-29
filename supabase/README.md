# supabase/ (placeholder)

Esta carpeta está vacía intencionalmente. Cuando arranque la fase de implementación, aquí vivirá:

```
supabase/
├── config.toml                              # config del proyecto Supabase local (supabase init)
└── migrations/
    ├── 20260101000001_create_profiles.sql          # incluye el trigger profiles_role_immutable (RLS-P2)
    ├── 20260101000002_create_categories.sql
    ├── 20260101000003_create_courses.sql
    ├── 20260101000004_create_lessons.sql           # incluye índice compuesto (course_id, position)
    ├── 20260101000005_create_enrollments.sql
    ├── 20260101000006_create_reviews.sql
    ├── 20260101000007_enable_rls_policies.sql      # profiles, categories, courses, lessons, enrollments, reviews
    └── 20260101000008_create_delete_lesson_rpc.sql # función delete_lesson_and_sync_publish (RLS-L5)
```

**Convención de nombres:** `<timestamp>_<verbo>_<tabla>.sql`, una migración por tabla en el orden de dependencias (perfiles y categorías primero, luego cursos, luego lecciones/inscripciones/reviews), y una migración final dedicada a `ENABLE ROW LEVEL SECURITY` + policies.

El DDL de las 6 tablas y el SQL de referencia de cada policy RLS **ya están definidos y validados** en [`../Spec.md`](../Spec.md) §5.2 y §5.3 — la implementación consiste en copiarlos a estos archivos de migración, no en diseñarlos de nuevo. Esto incluye la migración de `profiles` (`profiles_select_public`, `profiles_insert_self`, `profiles_update_self` + el trigger `profiles_role_immutable`) y la de `categories` (`categories_select_public`, sin policies de escritura).

**Reglas de negocio que NO viven acá (decisión validada, RNF10 de `Spec.md`):** `RLS-C6` (no publicar sin lecciones) y `RLS-L5` (auto-despublicar al borrar la última lección) son validaciones del Route Handler (`app/api/*`), no de Postgres — no hay policy ni trigger para ellas. La única fuente de verdad de escritura es la API, nunca `supabase-js` directo desde el navegador.

**Testing:** `supabase start` (Docker) es el prerrequisito para correr `tests/integration/*.steps.test.ts` — ver [`../docs/adr/0001-estrategia-testing.md`](../docs/adr/0001-estrategia-testing.md) y [`../tests/README.md`](../tests/README.md).
