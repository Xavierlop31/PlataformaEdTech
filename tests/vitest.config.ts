import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const alias = { "@": root };

/**
 * Dos entornos (ADR-0001), como `test.projects` (Vitest 3):
 * - integration (node): tests/integration/*.steps.test.ts contra Supabase CLI
 *   local + servidor Next.js real (nunca mocks de Postgres para una regla RLS).
 * - components (jsdom): tests/components/*.test.tsx (Testing Library, sin Gherkin).
 */
export default defineConfig({
  test: {
    root,
    projects: [
      {
        resolve: { alias },
        test: {
          name: "integration",
          root,
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "components",
          root,
          environment: "jsdom",
          include: ["tests/components/**/*.test.tsx"],
          setupFiles: ["tests/setup/testing-library.ts"],
        },
      },
    ],
  },
});
