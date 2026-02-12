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

describe("Aider UAT", () => {
  it("should have aider binary available in PATH", () => {
    assertBinaryExists("aider");
  });

  it("should detect aider with high confidence from inside Aider", () => {
    // Aider's /run command executes shell commands directly in aider's subprocess
    // environment (which has OR_APP_NAME=Aider, OR_SITE_URL set by OpenRouter integration).
    // Using --message with a natural language prompt doesn't work because the LLM
    // may refuse to run shell commands.
    const stdout = execSync(
      `aider --message "/run node \\"${scriptPath}\\"" --yes --no-gitignore`,
      { encoding: "utf-8", timeout: 60_000, env: cleanEnv() },
    );
    const result = parseDetectionOutput(stdout);
    expect(result.tool).toBe("aider");
    expect(result.confidence).toBe("high");
  });
});
