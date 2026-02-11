import { describe } from "vitest";

// Cline is a VS Code extension only — it has no standalone CLI binary.
// These UAT tests cannot be run outside of VS Code.
// Detection is verified via unit tests with mocked env vars instead.
describe.skip("Cline UAT (IDE-only, no standalone CLI)", () => {
  // Intentionally empty — skipped because Cline requires VS Code
});
