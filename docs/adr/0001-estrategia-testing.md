# ADR-0001: Estrategia de testing (BDD/TDD)

**Status:** Accepted
**Date:** 2026-07-29
**Deciders:** JavierL (product owner / arquitecto), a validar por el Implementador al arrancar la fase de código

## Context

El proyecto está en fase de especificación (ver `README.md`): `Spec.md`, `docs/contracts/`, `docs/gherkin/*.feature` y `docs/traceability.md` ya existen, pero **no hay código todavía** (`app/` y `supabase/` son placeholders). `docs/traceability.md` prevé un archivo de test "futuro" por cada regla `RLS-xx`, pero hasta ahora sin comprometerse a un framework concreto — la columna decía "test futuro (placeholder)" sin más.

Restricciones relevantes:
- Las reglas de negocio críticas viven en RLS de Postgres (RLS-C1..RLS-CAT1 en `Spec.md` §5.3). No se pueden validar con mocks: hay que ejecutar la query contra un Postgres real con distintos `auth.uid()`/roles para que la policy se evalúe de verdad.
- Ya existe una inversión completa en Gherkin: 6 archivos `.feature` (`courses`, `lessons`, `enrollments`, `reviews`, `profiles`, `categories`) con escenarios Dado/Cuando/Entonces que ya fueron revisados y correlacionados 1:1 con `RLS-xx`/`EP-xx` en `docs/traceability.md`.
- Stack: Next.js App Router + Supabase (Postgres + Auth + RLS + Storage).
- Alcance de esta fase de testing (decisión validada con el product owner): **backend (RLS + Route Handlers) + componentes de frontend**. Sin E2E de navegador todavía.
- CI: **fuera de alcance por ahora** — se documenta la decisión de framework, pero no se configura pipeline.

## Decision

Adoptamos un enfoque **híbrido**: **Vitest** como único test runner (backend y frontend), reutilizando los `.feature` ya escritos vía una capa BDD sobre Vitest (`@amiceli/vitest-cucumber` o equivalente) en vez de descartarlos o duplicar su redacción como comentarios sueltos.

- **Test runner único:** Vitest para todo el repo (un solo `vitest.config.ts`, un solo `npm test`, watch mode y coverage compartidos entre backend y frontend).
- **BDD real, no solo documentación:** los archivos de `docs/gherkin/*.feature` se cargan y ejecutan literalmente. Cada regla `RLS-xx` sigue trazada a un escenario Gherkin concreto (ya lo estaba) y ahora también a un test que **ejecuta ese mismo escenario**, no una reinterpretación libre.
- **Entorno de integración para RLS:** Supabase CLI local (`supabase start`, stack real de Postgres + PostgREST + GoTrue vía Docker). Nunca mocks de Postgres para ejercer una regla `RLS-xx` — solo así el criterio verificable de `Spec.md` §5.3 se prueba tal como está escrito.
- **Componentes de frontend:** Vitest + Testing Library (`@testing-library/react`), como unit tests de UI normales — **sin** Gherkin, porque no son criterios de negocio sino comportamiento de componentes.
- **CI:** no se configura en esta fase (decisión explícita, ver Action Items).

## Options Considered

### Option A: Cucumber.js puro (BDD "de libro")

| Dimensión | Evaluación |
|---|---|
| Complejidad | Media-alta (dos ecosistemas de test si además se quiere Testing Library para frontend) |
| Costo | Bajo (gratis, open source) |
| Escalabilidad | Buena para BDD puro; paralelismo/watch mode peor que Vitest |
| Familiaridad del equipo | Depende — curva de aprendizaje de `World`/step definitions de Cucumber |

**Pros:** correspondencia 1:1 exacta con Gherkin; mejor para reportes legibles por no técnicos (HTML report de Cucumber).
**Cons:** correr specs de componentes React en Cucumber es incómodo; requiere un segundo runner (Vitest/Jest) para frontend de todas formas; setup y mantenimiento más pesados.

### Option B: TDD puro con Vitest (sin ejecutar Gherkin)

| Dimensión | Evaluación |
|---|---|
| Complejidad | Baja |
| Costo | Bajo |
| Escalabilidad | Muy buena (Vitest es rápido, watch mode nativo) |
| Familiaridad del equipo | Alta (Vitest/Jest son el default en el ecosistema Next.js) |

**Pros:** un solo ecosistema simple para backend y frontend; nada nuevo que aprender.
**Cons:** pierde la trazabilidad literal con los `.feature` ya escritos y validados — quedarían como documentación paralela que puede desincronizarse silenciosamente del código de test real (nadie obliga a que el test "hable" con el escenario).

### Option C (elegida): Híbrido — Vitest + `@amiceli/vitest-cucumber`

| Dimensión | Evaluación |
|---|---|
| Complejidad | Media (una API adicional sobre Vitest: `loadFeature`/`describeFeature`) |
| Costo | Bajo |
| Escalabilidad | Buena — hereda velocidad/watch mode de Vitest |
| Familiaridad del equipo | Media — Vitest ya conocido, la capa BDD es una librería de nicho a aprender |

**Pros:** reutiliza el trabajo de Gherkin ya hecho sin descartarlo ni duplicarlo; un solo test runner (Vitest) para backend y frontend; watch mode/coverage/paralelismo de Vitest; step definitions en TypeScript con inferencia de tipos.
**Cons:** dependencia de una librería más pequeña y menos documentada que `cucumber-js` oficial; no unifica el 100% del repo bajo BDD (los tests de componentes de frontend siguen siendo TDD plano, no Gherkin — ver "Consequences").

## Trade-off Analysis

El eje central es "pureza BDD" (Option A) vs. "unificación y velocidad de ecosistema" (Option B). Como de todas formas hace falta un runner rápido para tests de componentes de frontend (Testing Library corre naturalmente sobre Vitest/Jest, no sobre Cucumber), forzar Cucumber.js como runner único habría significado o bien correr dos frameworks de test en paralelo, o forzar los tests de UI dentro de step definitions de Cucumber (mal ajuste). La Option C evita ese dilema sin sacrificar la inversión ya hecha en Gherkin: los `.feature` se siguen ejecutando literalmente, solo que el motor por debajo es Vitest.

## Consequences

- **Más fácil:** escribir un nuevo test de regla RLS es implementar los pasos que falten sobre un `.feature` que ya existe y ya fue validado con el product owner — no hay que redactar de nuevo el escenario. Los tests de componentes de frontend usan el patrón estándar Vitest + Testing Library, sin fricción de onboarding.
- **Más difícil:** el equipo debe aprender la API de `@amiceli/vitest-cucumber` (`loadFeature`, `describeFeature`, binding de steps), que tiene menos documentación y comunidad que `cucumber-js`.
- **A revisar más adelante:** si el equipo crece o se necesita un reporte Gherkin más rico para stakeholders no técnicos (HTML report tipo Cucumber), reevaluar migrar la capa BDD a `cucumber-js` puro — los `.feature` no cambiarían, solo el runner.
- **CI:** queda pendiente como decisión explícita, no bloqueante para arrancar la implementación (ver Action Items).

## Action Items

1. [ ] Al inicializar el proyecto Next.js, agregar como `devDependencies`: `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@amiceli/vitest-cucumber`, `@supabase/supabase-js`.
2. [ ] `supabase init` + documentar `supabase start` como prerequisito de `npm test` (actualizar `supabase/README.md`).
3. [ ] Crear `vitest.config.ts` con dos entornos: `node` (integración backend contra Supabase CLI local) y `jsdom` (componentes de frontend).
4. [ ] Crear un archivo `tests/integration/<feature>.steps.test.ts` por cada `.feature` de `docs/gherkin/` (ver `tests/README.md`), implementando sus Given/When/Then contra el stack local.
5. [ ] Crear `tests/setup/supabase-test-client.ts`: helpers para crear usuarios de prueba (instructor/estudiante) vía Admin API y obtener clientes autenticados por rol, de forma que `auth.uid()` sea real en cada test (no simulado).
6. [ ] Al implementar cada test, actualizar `docs/traceability.md` (columna "Estado": `Especificado` → `Implementado`).
7. [ ] (Diferido, fuera de alcance de esta ADR) Configurar CI en GitHub Actions que levante Supabase CLI local y corra `npm test` en cada PR — reevaluar cuando arranque la implementación.
