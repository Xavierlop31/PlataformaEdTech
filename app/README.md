# app/ — implementado

Estructura real (Next.js App Router, Next.js 16 + React 19 + Tailwind v4):

```
app/
├── layout.tsx                            # fuente Sora, Navbar/Footer, tokens de Technical_spec.md
├── globals.css                           # design tokens (papaya/carbon/surface/speedline)
├── login/page.tsx                        # OAuth Google (client) → /auth/callback
├── onboarding/page.tsx                   # elección de rol — EP-16 (fuera de (auth) para evitar loop de redirect)
├── auth/
│   ├── callback/route.ts                 # exchangeCodeForSession + redirect a /onboarding si falta perfil
│   └── signout/route.ts
│
├── (public)/
│   ├── page.tsx                          # catálogo — EP-01, filtro por categoría (EP-11)
│   └── courses/[id]/page.tsx             # detalle público + reviews — EP-03, EP-09, EP-10, EP-14, EP-15
│
├── (auth)/layout.tsx                     # guard: sesión + perfil (RNF9/F0), si no → /login o /onboarding
├── (auth)/
│   ├── profile/page.tsx                  # EP-17, EP-18
│   ├── enrollments/page.tsx              # "mi aprendizaje" — EP-08
│   ├── courses/[id]/learn/page.tsx       # reproductor — EP-05
│   └── instructor/layout.tsx             # guard adicional: role='instructor'
│       └── instructor/courses/
│           ├── page.tsx                  # dashboard — EP-01?mine=true (ver nota abajo)
│           ├── new/page.tsx              # EP-02
│           └── [id]/edit|lessons|students/page.tsx   # EP-04, EP-06/12/13, EP-08?course_id=
│
├── api/                                   # 18 endpoints en 10 route.ts (ver tabla en PlanImplementacion.md §3)
├── components/                            # ui/, layout/, courses/, lessons/, enrollments/, reviews/, profile/
└── lib/
    ├── supabase/{server,client,middleware}.ts
    ├── validation/schemas.ts              # zod, límites exactos de Spec.md §5.2
    ├── visibility.ts                      # patrón "SELECT visibilidad antes de escribir" (403 vs 404)
    ├── profile.ts, http.ts, fetchApi.ts, cn.ts
```

**Arquitectura de acceso (RNF10):** cumplida. Los Server Components de dominio (catálogo, detalle, dashboard) llaman a `app/api/*` vía `lib/fetchApi.ts` (reenvía la cookie de sesión), nunca a `supabase-js` directo para las 6 tablas. Excepción pragmática documentada: checks de sesión/perfil para guards de layout y Navbar (`lib/profile.ts`) leen `profiles` directo — no es dato de negocio gateado por las reglas que RNF10 protege (`RLS-C6`, `RLS-L5`, validación de `content_url`, 404/200 de `EP-05`).

**Desviación de implementación señalada (no en `Spec.md`):** `GET /api/courses` acepta `?mine=true` (requiere sesión) para que el dashboard de instructor liste solo sus propios cursos, publicados o no, sin mezclarse con el catálogo público de terceros. Es aditiva y no cambia ningún caso ya documentado — evaluar si se formaliza en `Spec.md`/`endpoints.md`.

**RPC de Postgres usada:** `EP-13` invoca `delete_lesson_and_sync_publish` (nunca `.from('lessons').delete()` directo) para la atomicidad de `RLS-L5`.
