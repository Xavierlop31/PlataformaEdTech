> **Superado — no es fuente de verdad.** Este archivo es un volcado de planificación de una sesión anterior (no generado por esta revisión). Los números de IDs y el alcance que menciona (RLS-C1..C5, EP-01..EP-10, "sin framework de testing") están desactualizados: hoy el Spec llega a RLS-C6/RLS-L5/RLS-P3/RLS-CAT1, EP-01..EP-18, y sí existe una decisión de testing validada. Para el estado real del proyecto usar siempre [`README.md`](README.md), [`Spec.md`](Spec.md) y [`docs/adr/0001-estrategia-testing.md`](docs/adr/0001-estrategia-testing.md). Se conserva este archivo sin borrar por si su contenido histórico es de interés; avisar si se prefiere eliminarlo.

Plan: Estructura del repo — Spec, Contratos y Gherkin correlacionados
Contexto
El repo PlataformaEdTech (destino: https://github.com/Xavierlop31/PlataformaEdTech.git) hoy solo contiene .env, .gitignore y el Spec.md ya validado (6 secciones, modelo de 6 tablas, reglas RLS explícitas con IDs verificables: RLS-C1..C5, RLS-L1..L4, RLS-E1..E4, RLS-R1..R4, RLS-P1..P2, RLS-CAT1).

El pedido de esta fase es organizacional, no de implementación: dejar en el repo, además del Spec, el contrato de endpoints confirmado + tipos de datos derivados, y los criterios de aceptación en Gherkin — todo correlacionado entre sí mediante IDs consistentes, de modo que cuando arranque la implementación (Next.js + Supabase) cada pieza de código pueda trazarse hasta la regla del Spec que la originó.

Decisiones ya confirmadas con el usuario:

Contrato de endpoints en Markdown + types.ts (no OpenAPI por ahora).
Gherkin como documentación pura (.feature sin runner todavía).
Correlación vía matriz de trazabilidad centralizada (traceability.md), no solo tags cruzados.
Estructura de carpetas propuesta
PlataformaEdTech/
├── .env
├── .gitignore
├── README.md                          # nuevo: mapa del repo, orden de lectura, estado del proyecto
├── Spec.md                             # existente, se le agrega una columna "ID" a la tabla de endpoints (§5.4)
├── docs/
│   ├── contracts/
│   │   ├── endpoints.md               # contrato confirmado: cada endpoint con ID (EP-xx), payloads de ejemplo, códigos de error
│   │   └── types.ts                   # tipos TS derivados 1:1 del modelo de Spec.md §5.2 (entidades + DTOs de request/response)
│   ├── gherkin/
│   │   ├── courses.feature            # @RLS-C1..C5
│   │   ├── lessons.feature            # @RLS-L1..L4
│   │   ├── enrollments.feature        # @RLS-E1..E4
│   │   └── reviews.feature            # @RLS-R1..R4
│   └── traceability.md                # matriz: Regla Spec ↔ Endpoint ↔ Escenario Gherkin ↔ Test futuro (placeholder) ↔ Estado
├── supabase/
│   └── README.md                      # placeholder: convención de nombres de migraciones futuras (una por tabla), sin SQL real todavía
└── app/                                # placeholder (solo README): estructura prevista de Next.js App Router para la fase de implementación
    └── README.md
Por qué esta forma:

Spec.md se queda en la raíz (ya está ahí y es la fuente única de verdad); todo lo derivado vive en docs/ para no mezclar "la ley" con "los contratos derivados de la ley".
docs/contracts y docs/gherkin son hermanos porque ambos derivan directamente del Spec y se referencian mutuamente vía IDs, no uno dentro del otro.
supabase/ y app/ se crean vacíos (solo con un README de intención) para que la forma del proyecto ya sea visible en GitHub sin escribir código de implementación — cumple "que quede claro para cuando pasemos a esa fase" sin adelantar esa fase.
Esquema de IDs para correlación
Reglas de negocio / RLS: IDs ya existentes en Spec.md (RLS-C1, RLS-L2, etc.) y funcionalidades (F1..F13). No se inventan nuevos.
Endpoints: se agregan IDs nuevos EP-01..EP-10 (uno por fila de la tabla §5.4 de Spec.md), reutilizados en docs/contracts/endpoints.md.
Escenarios Gherkin: cada Scenario lleva tags con los IDs que verifica, ej. @RLS-L2 @EP-05.
Traceability.md: una fila por regla verificable del Spec, con columnas Regla (Spec ID) | Endpoint (EP ID) | Escenario Gherkin (archivo + nombre) | Test futuro (ruta prevista, aún no existe) | Estado.
Esto permite, dado un ID de Spec.md, saltar directo al endpoint que lo implementa y al escenario que lo verifica, y viceversa.

Archivos a crear/editar
Spec.md (edición menor): agregar columna ID (EP-01…EP-10) a la tabla de endpoints en §5.4, sin cambiar su contenido ya validado.
docs/contracts/endpoints.md: contrato confirmado — por cada EP-xx: método, path, auth requerida, request body de ejemplo, response 2xx de ejemplo, y cada código de error relevante (401/403/404/409) con su regla RLS-xx asociada.
docs/contracts/types.ts: interfaces TS para Profile, Category, Course, Lesson, Enrollment, Review (fiel a §5.2), más DTOs de entrada/salida (CreateCourseInput, EnrollResponse, ApiError, etc.). Solo tipos — sin lógica ni imports de Supabase todavía.
docs/gherkin/courses.feature, lessons.feature, enrollments.feature, reviews.feature: un escenario Gherkin (Dado/Cuando/Entonces) por cada regla verificable de Spec.md §5.3, con tags @RLS-xx y @EP-xx.
docs/traceability.md: matriz completa cruzando los 4 puntos anteriores.
README.md (raíz): explica el propósito del repo, enlaza a Spec.md como fuente de verdad, describe el orden de lectura (Spec.md → docs/contracts → docs/gherkin → docs/traceability.md), y aclara que app/ y supabase/ son placeholders para la fase de implementación (Next.js + Supabase), aún no iniciada.
app/README.md y supabase/README.md: notas cortas de intención (qué convención de carpetas/migraciones se usará), sin código.
Fuera de alcance de esta fase (explícito)
No se inicializa git ni se hace push al remoto — eso queda como paso manual posterior a pedido explícito del usuario.
No se escribe código Next.js ni migraciones SQL reales (aunque el DDL ya existe en Spec.md §5.2, listo para copiarse a supabase/migrations/*.sql cuando arranque la implementación).
No se instala ningún framework de testing/BDD (Cucumber, Playwright-BDD) — los .feature quedan como especificación legible, no ejecutable. **[Superado por ADR-0001: sí se decidió framework — Vitest + `@amiceli/vitest-cucumber`, ejecutando estos mismos `.feature` contra Supabase CLI local. Ver `docs/adr/0001-estrategia-testing.md`.]**
Verificación
Revisión manual cruzada: cada RLS-xx/F-xx de Spec.md aparece exactamente una vez en traceability.md, y cada fila de traceability.md apunta a un EP-xx real en endpoints.md y a un escenario existente en algún .feature.
Los tipos en types.ts deben mapear 1:1 con las columnas de las 6 tablas en Spec.md §5.2 (sin campos inventados ni faltantes).
Los escenarios Gherkin deben poder leerse por una persona no técnica y coincidir palabra por palabra con el "criterio verificable" correspondiente en Spec.md §5.3.