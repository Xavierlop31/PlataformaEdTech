# tests/ — implementado (no ejecutado end-to-end en este entorno)

Estructura real, siguiendo [`../docs/adr/0001-estrategia-testing.md`](../docs/adr/0001-estrategia-testing.md): **Vitest 3** como único runner (backend + frontend), vía `test.projects` (dos proyectos: `integration` en `node`, `components` en `jsdom`), ejecutando literalmente los escenarios de [`../docs/gherkin/`](../docs/gherkin/) con `@amiceli/vitest-cucumber`.

```
tests/
├── vitest.config.ts                      # test.projects: integration (node) + components (jsdom)
├── setup/
│   ├── testing-library.ts                # jest-dom matchers para el proyecto components
│   └── supabase-test-client.ts           # createTestUser, createAuthUserWithoutProfile, userClient,
│                                          # adminClient, apiFetch — auth.uid() real por test, sin mocks
├── integration/                          # 6 archivos, 1 por .feature, 247 pasos en total
│   ├── courses.steps.test.ts             # RLS-C1..C6 (13 escenarios)
│   ├── lessons.steps.test.ts             # RLS-L1..L5 (13 escenarios)
│   ├── enrollments.steps.test.ts         # RLS-E1..E4 (7 escenarios)
│   ├── reviews.steps.test.ts             # RLS-R1..R4 (9 escenarios)
│   ├── profiles.steps.test.ts            # RLS-P1..P3 (7 escenarios)
│   └── categories.steps.test.ts          # RLS-CAT1 (2 escenarios)
└── components/
    └── Button.test.tsx                   # ejemplo Testing Library — patrón para el resto de app/components/ui/
```

## Estado real (importante)

**Docker no estaba disponible en este entorno de implementación** — no se pudo correr `supabase start` ni un servidor Next real, así que la suite de `integration/` **no corrió contra un backend real**. Sí se verificó exhaustivamente que la estructura es correcta:

- `npx vitest run --project components` → **pasa** (no depende de Docker).
- `npx vitest run --project integration` → los 247 pasos se **parsean y matchean correctamente** contra los 6 `.feature`; las únicas fallas son por prerequisitos de entorno ausentes (`SUPABASE_SERVICE_ROLE_KEY`, conexión a `127.0.0.1:54321`/`:3000`) — exactamente el resultado esperado sin Docker, sin ningún error estructural.

En el camino se encontraron y corrigieron 4 bugs reales de la suite (no del código de la app):
1. `vitest@2.x` no es compatible como peer de `@amiceli/vitest-cucumber@^5` (requiere `vitest@^3`) — se subió la versión.
2. `loadFeature` necesita `{ language: "es" }` explícito para reconocer los pasos en español.
3. Los 6 `.feature` mezclaban palabras clave estructurales en inglés (`Feature:`/`Scenario:`) con pasos en español — Gherkin no permite mezclar dialectos; se tradujeron a `Característica:`/`Escenario:` y se agregó `# language: es` como primera línea.
4. `@amiceli/vitest-cucumber` no permite registrar dos pasos con texto **idéntico** dentro del mismo escenario (a diferencia del Cucumber estándar) — dos escenarios de `lessons.feature` repetían literalmente "Entonces la respuesta es 404/403" para un PATCH y un DELETE; se desambiguó el segundo a "también es 404/403" en el `.feature` y en el test.

## Para ejecutar de verdad

1. Docker Desktop corriendo.
2. `npm run supabase:start` → copiar `anon key`/`service_role key` a `.env.local` (`SUPABASE_SERVICE_ROLE_KEY` además de las `NEXT_PUBLIC_*`).
3. `npm run build && npm run start` (o `npm run dev`) en otra terminal — la suite pega por HTTP real a `http://127.0.0.1:3000` (`TEST_APP_URL` si es otro puerto).
4. `npm test` (alias de `vitest run --config tests/vitest.config.ts`).

**Fuera de alcance:** CI (GitHub Actions) y tests E2E de navegador — ver Action Items de la ADR.
