# Apex Performance Learning — Plataforma EdTech

Plataforma de cursos online (estilo Udemy/Gumroad) con dos roles — **instructor** y **estudiante** — construida con Next.js 16 + React 19 + Supabase + Tailwind v4.

**Estado del proyecto:** implementación completa según [`PlanImplementacion.md`](PlanImplementacion.md) — `npm run build` y `npm run lint` pasan limpios. Pendiente: validar migraciones/policies y correr la suite de integración contra Supabase real (requiere Docker, no disponible en el entorno donde se implementó — ver `supabase/README.md` y `tests/README.md`).

## Cómo navegar este repo

1. [`Spec.md`](Spec.md) — fuente única de verdad del contrato: visión, usuarios, funcionalidades, flujos, arquitectura (modelo de 6 tablas + reglas RLS explícitas) y requisitos no funcionales.
2. [`Technical_spec.md`](Technical_spec.md) — nombre de producto y guía de estilo UI (colores, tipografía) usada para el diseño.
3. [`PlanImplementacion.md`](PlanImplementacion.md) — plan de componentes y endpoints aprobado, base de la implementación real en `app/`.
4. [`docs/contracts/endpoints.md`](docs/contracts/endpoints.md) y [`docs/contracts/types.ts`](docs/contracts/types.ts) — contrato de cada endpoint y tipos compartidos (importados directo por `app/` vía `@/docs/contracts/types`).
5. [`docs/gherkin/`](docs/gherkin/) — criterios de aceptación, ejecutables vía Vitest + `@amiceli/vitest-cucumber` (ver `tests/`).
6. [`docs/traceability.md`](docs/traceability.md) — matriz Spec ↔ Endpoint ↔ Gherkin ↔ Test, con estado real de implementación.
7. [`docs/adr/0001-estrategia-testing.md`](docs/adr/0001-estrategia-testing.md) — decisión de framework de testing.
8. [`docs/ambiguedades-resueltas.md`](docs/ambiguedades-resueltas.md) — historial de ambigüedades del Spec y su resolución.

## Estructura del repo

```
PlataformaEdTech/
├── Spec.md, Technical_spec.md, PlanImplementacion.md
├── app/                       # Next.js App Router — código real (ver app/README.md)
├── supabase/                  # migraciones + RLS + RPC (ver supabase/README.md)
├── tests/                     # Vitest + Gherkin ejecutable (ver tests/README.md)
└── docs/
    ├── contracts/              # contrato de endpoints + tipos TS (consumidos por app/)
    ├── gherkin/                # criterios de aceptación (.feature), ejecutables
    ├── adr/                    # decisiones de arquitectura
    ├── traceability.md         # matriz de correlación Spec ↔ Endpoints ↔ Gherkin ↔ Tests
    └── ambiguedades-resueltas.md
```

## Levantar el proyecto localmente

```bash
npm install
npm run supabase:start        # requiere Docker Desktop — imprime las claves locales
# completar .env.local con esas claves (ver .env.local.example)
npm run dev
```

Para tests: `npm test` (además de lo anterior). Ver `tests/README.md` para el estado real de la suite (escrita y verificada estructuralmente; no corrida end-to-end en el entorno de implementación por falta de Docker).

## Desviaciones de implementación señaladas (no estaban en `Spec.md`)

- `GET /api/courses` acepta `?mine=true` (dashboard de instructor) — ver nota en `app/README.md`.
