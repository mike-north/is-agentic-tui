import { describe } from "vitest";

// Cursor Agent is an IDE-only tool — it has no standalone CLI binary.
// These UAT tests cannot be run outside of Cursor.
// Detection is verified via unit tests with mocked env vars instead.
describe.skip("Cursor Agent UAT (IDE-only, no standalone CLI)", () => {
  // Intentionally empty — skipped because Cursor Agent requires Cursor IDE
});
