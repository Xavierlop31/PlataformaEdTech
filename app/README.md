# app/ (placeholder)

Esta carpeta está vacía intencionalmente. Cuando arranque la fase de implementación (Next.js App Router), aquí vivirá una estructura equivalente a:

```
app/
├── (public)/
│   ├── page.tsx                         # catálogo — EP-01, filtro por categoría (EP-11)
│   └── courses/[id]/page.tsx            # detalle público — EP-03, EP-09
├── (auth)/
│   ├── enrollments/page.tsx             # "mis inscripciones" — EP-08
│   ├── profile/page.tsx                 # alta/edición de perfil — EP-16, EP-17, EP-18
│   └── instructor/courses/              # panel del instructor — EP-02, EP-04, EP-06, EP-12, EP-13
├── api/
│   ├── courses/route.ts                          # EP-01 (GET), EP-02 (POST)
│   ├── courses/[id]/route.ts                     # EP-03 (GET), EP-04 (PATCH)
│   ├── courses/[id]/lessons/route.ts             # EP-05 (GET), EP-06 (POST)
│   ├── courses/[id]/lessons/[lessonId]/route.ts  # EP-12 (PATCH), EP-13 (DELETE)
│   ├── courses/[id]/enroll/route.ts              # EP-07 (POST)
│   ├── courses/[id]/reviews/route.ts             # EP-09 (GET), EP-10 (POST)
│   ├── courses/[id]/reviews/[reviewId]/route.ts  # EP-14 (PATCH), EP-15 (DELETE)
│   ├── categories/route.ts                       # EP-11 (GET)
│   ├── profiles/route.ts                         # EP-16 (POST)
│   ├── profiles/me/route.ts                      # EP-17 (GET), EP-18 (PATCH)
│   └── enrollments/route.ts                      # EP-08 (GET, admite ?course_id=)
└── lib/
    └── supabase/                        # clients (server) — usan RLS, nunca service_role en el navegador
```

Cada ruta bajo `api/` debe implementar exactamente el contrato descrito en [`../docs/contracts/endpoints.md`](../docs/contracts/endpoints.md) (mismos códigos de éxito/error, mismos tipos de [`../docs/contracts/types.ts`](../docs/contracts/types.ts)) y apoyarse en las policies RLS de [`../Spec.md`](../Spec.md) §5.3 como única fuente de autorización a nivel de datos.

**Arquitectura de acceso (RNF10, decisión validada):** `app/api/*` es el **único** punto de entrada a los datos. Ningún componente de `(public)`/`(auth)` debe instanciar `supabase-js` contra Postgres directamente (ni para leer ni para escribir) — todos llaman a estas rutas. Esto es lo que hace cumplir reglas que no viven en RLS: `RLS-C6`/`RLS-L5` (invariantes de publicación), la validación de formato de `content_url`, la distinción 404 vs `200 []` de `EP-05`, y la paginación/orden por defecto de `docs/contracts/endpoints.md`.
