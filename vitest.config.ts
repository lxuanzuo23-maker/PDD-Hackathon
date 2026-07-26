import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      // Mirrors the "@/*" -> "src/*" path mapping in tsconfig.json. Without
      // this, any test whose import chain reaches a module using the alias
      // (e.g. traits.ts -> "@/lib/llm") fails to resolve under vitest even
      // though tsc and Next both handle it.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
