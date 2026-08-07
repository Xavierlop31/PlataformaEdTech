# supabase/ — implementado

```
supabase/
├── config.toml
├── seed.sql                                          # categorías de desarrollo (RLS-CAT1, gestión manual)
└── migrations/
    ├── 20260807000001_create_profiles.sql            # tabla + RLS + trigger profiles_role_immutable (RLS-P2)
    ├── 20260807000002_create_categories.sql          # tabla + RLS
    ├── 20260807000003_create_courses.sql             # tabla + índice is_published + RLS
    ├── 20260807000004_create_enrollments.sql         # tabla + índice + RLS (antes que lessons: su policy la referencia)
    ├── 20260807000005_create_lessons.sql             # tabla + índice compuesto (course_id, position) + RLS
    ├── 20260807000006_create_reviews.sql             # tabla + índice + RLS (con la enmienda de RLS-R2)
    └── 20260807000007_delete_lesson_and_sync_publish_rpc.sql   # función RPC de RLS-L5
```

**Desviación del orden documentado originalmente:** `enrollments` se creó **antes** que `lessons` (no como listaba la versión anterior de este README) porque la policy `lessons_select_enrolled_or_owner` hace `EXISTS (SELECT ... FROM enrollments ...)` — si `enrollments` no existe todavía, la migración de `lessons` falla. Cada migración incluye su propio `ENABLE ROW LEVEL SECURITY` + policies (no hay una migración separada "solo RLS" al final, a diferencia del plan original) para poder seguir esta dependencia sin duplicar pasos.

**`RLS-C6` (no publicar sin lecciones):** vive solo en el Route Handler (`app/api/courses/[id]/route.ts`), no en Postgres — no hay policy ni trigger para esto, tal como decidido en `Spec.md`.

**`RLS-L5` (auto-despublicar al borrar la última lección):** a diferencia de `RLS-C6`, **sí** vive en Postgres, como función RPC `delete_lesson_and_sync_publish` (`security invoker`, ejecuta `DELETE` + `count` + `UPDATE` condicional en una sola transacción real). `EP-13` la invoca vía `supabase.rpc(...)`, nunca `.from('lessons').delete()` directo — ver el comentario en la migración 7 y `Spec.md` §5.3.

**No ejecutado en este entorno:** no había Docker disponible para correr `supabase start`, así que estas migraciones **no se corrieron contra un Postgres real** — quedan escritas y revisadas manualmente contra `Spec.md` §5.2/§5.3, pero el checklist de `Spec.md` ("validar que las policies SQL se ejecuten sin error") sigue pendiente. Antes de usar en desarrollo: `npm run supabase:start` (requiere Docker Desktop) y completar `.env.local` con las claves que imprime.

**Testing:** ver [`../tests/README.md`](../tests/README.md) — misma limitación de Docker aplica a `tests/integration/*.steps.test.ts`.
