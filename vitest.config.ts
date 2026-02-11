import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["src/uat/**", "node_modules/**"],
  },
});
