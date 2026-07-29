# Plataforma EdTech

Plataforma de cursos online (estilo Udemy/Gumroad) con dos roles — **instructor** y **estudiante** — construida con Next.js y Supabase.

**Estado del proyecto:** fase de especificación y contratos completada. Implementación de código aún no iniciada.

## Cómo navegar este repo

Leer en este orden:

1. [`Spec.md`](Spec.md) — fuente única de verdad: visión, usuarios, funcionalidades, flujos, arquitectura (modelo de 6 tablas + reglas RLS explícitas) y requisitos no funcionales.
2. [`docs/contracts/endpoints.md`](docs/contracts/endpoints.md) — contrato confirmado de cada endpoint (`EP-01`..`EP-18`), con payloads de ejemplo y códigos de error.
3. [`docs/contracts/types.ts`](docs/contracts/types.ts) — tipos TypeScript derivados 1:1 del modelo de datos del Spec.
4. [`docs/gherkin/`](docs/gherkin/) — criterios de aceptación en Gherkin (Dado/Cuando/Entonces), un archivo por entidad (`courses`, `lessons`, `enrollments`, `reviews`, `profiles`, `categories`), como especificación legible **y ejecutable** (ver ADR-0001).
5. [`docs/traceability.md`](docs/traceability.md) — matriz que correlaciona cada regla del Spec con su endpoint, su escenario Gherkin y su futuro test automatizado.
6. [`docs/adr/0001-estrategia-testing.md`](docs/adr/0001-estrategia-testing.md) — decisión validada de framework de testing (Vitest híbrido + Gherkin ejecutable + Supabase CLI local).

## Estructura del repo

```
PlataformaEdTech/
├── Spec.md                  # fuente de verdad
├── docs/
│   ├── contracts/            # contrato de endpoints + tipos TS
│   ├── gherkin/               # criterios de aceptación (.feature), ejecutables vía Vitest (ADR-0001)
│   ├── adr/                   # decisiones de arquitectura (ADRs)
│   └── traceability.md        # matriz de correlación Spec ↔ Endpoints ↔ Gherkin ↔ Tests
├── app/                       # placeholder — estructura prevista de Next.js App Router (ver app/README.md)
├── supabase/                  # placeholder — convención de migraciones futuras (ver supabase/README.md)
└── tests/                     # placeholder — estructura prevista de testing (ver tests/README.md y ADR-0001)
```

`app/`, `supabase/` y `tests/` están vacíos a propósito: documentan la forma que tendrá el proyecto en la fase de implementación, sin adelantar código todavía.

## Próxima fase (no iniciada)

- Inicializar el proyecto Next.js y el proyecto Supabase.
- Convertir el DDL y las policies de `Spec.md` §5.2/§5.3 en migraciones SQL reales (`supabase/migrations/`).
- Implementar cada ruta de `docs/contracts/endpoints.md` respetando los tipos de `docs/contracts/types.ts`.
- Configurar Vitest + `@amiceli/vitest-cucumber` + Supabase CLI local (ver `docs/adr/0001-estrategia-testing.md` y `tests/README.md`) y automatizar los escenarios de `docs/gherkin/` (actualizando `docs/traceability.md`).
