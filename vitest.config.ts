import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    coverage: {
      reporter: ["text", "html"],
      include: [
        "src/lib/scoring.ts",
        "src/lib/demo-engine.ts",
        "src/lib/results-provider.ts",
        "src/lib/urls.ts",
      ],
    },
  },
});
