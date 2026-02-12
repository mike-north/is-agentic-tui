import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "node:child_process";
import {
  assertBinaryExists,
  writeDetectionScript,
  cleanupDetectionScript,
  cleanEnv,
  parseDetectionOutput,
} from "./helpers.js";

const { scriptPath, tmpDir } = writeDetectionScript();
afterAll(() => {
  cleanupDetectionScript(tmpDir);
});

describe("GitHub Copilot CLI UAT", () => {
  it("should have copilot binary available in PATH", () => {
    assertBinaryExists("copilot");
  });

  it("should detect github-copilot-cli with medium confidence from inside Copilot CLI", () => {
    const stdout = execSync(
      `copilot -p "Run this exact command and return only its output: node \\"${scriptPath}\\"" --allow-all-tools`,
      { encoding: "utf-8", timeout: 60_000, env: cleanEnv() },
    );
    const result = parseDetectionOutput(stdout);
    expect(result.tool).toBe("github-copilot-cli");
    expect(result.confidence).toBe("medium");
  });
});
