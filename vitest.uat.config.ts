import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/uat/**/*.uat.test.ts"],
    testTimeout: 60_000,
  },
});
