# tests/ (placeholder)

Esta carpeta está vacía intencionalmente. Cuando arranque la fase de implementación, aquí vivirá la estructura de testing decidida en [`../docs/adr/0001-estrategia-testing.md`](../docs/adr/0001-estrategia-testing.md): **Vitest** como único runner (backend + frontend), ejecutando literalmente los escenarios de [`../docs/gherkin/`](../docs/gherkin/) vía una capa BDD sobre Vitest (`@amiceli/vitest-cucumber` o equivalente), contra un **Supabase CLI local** real para las reglas RLS.

```
tests/
├── vitest.config.ts                      # dos entornos: node (integration) y jsdom (components)
├── setup/
│   └── supabase-test-client.ts           # helpers: usuarios de prueba (instructor/estudiante) vía Admin API,
│                                          # clientes autenticados por rol para que auth.uid() sea real en cada test
├── integration/                          # backend — un archivo por .feature, contra Supabase CLI local
│   ├── courses.steps.test.ts             # implementa docs/gherkin/courses.feature (RLS-C1..C6)
│   ├── lessons.steps.test.ts             # implementa docs/gherkin/lessons.feature (RLS-L1..L4)
│   ├── enrollments.steps.test.ts         # implementa docs/gherkin/enrollments.feature (RLS-E1..E4)
│   ├── reviews.steps.test.ts             # implementa docs/gherkin/reviews.feature (RLS-R1..R4)
│   ├── profiles.steps.test.ts            # implementa docs/gherkin/profiles.feature (RLS-P1..P3)
│   └── categories.steps.test.ts          # implementa docs/gherkin/categories.feature (RLS-CAT1)
└── components/                           # frontend — Vitest + Testing Library, sin Gherkin
    └── <Componente>.test.tsx             # unit tests de UI, no criterios de negocio
```

**Convención:** cada `*.steps.test.ts` en `tests/integration/` carga el `.feature` correspondiente (`loadFeature('../../docs/gherkin/<nombre>.feature')`) e implementa **todos** sus escenarios en un único `describeFeature`, por eso [`../docs/traceability.md`](../docs/traceability.md) enlaza el mismo archivo de test para varias reglas `RLS-xx` de una misma tabla — un test real cubre varios criterios verificables del Spec a la vez.

**Prerrequisito para correr `tests/integration/`:** `supabase start` (Supabase CLI, stack local de Postgres + PostgREST + GoTrue vía Docker) — ver `../supabase/README.md`. Nunca se mockea Postgres para una regla `RLS-xx`: el objetivo es ejercer la policy real.

**Fuera de alcance de esta carpeta (por ahora):** CI (GitHub Actions) y tests E2E de navegador — ver Action Items de la ADR.
