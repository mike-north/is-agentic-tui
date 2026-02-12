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

describe("OpenCode UAT", () => {
  it("should have opencode binary available in PATH", () => {
    assertBinaryExists("opencode");
  });

  it("should detect opencode with high confidence from inside OpenCode", () => {
    const stdout = execSync(
      `opencode run "Run this exact command and return only its output: node \\"${scriptPath}\\""`,
      { encoding: "utf-8", timeout: 60_000, env: cleanEnv() },
    );
    const result = parseDetectionOutput(stdout);
    expect(result.tool).toBe("opencode");
    expect(result.confidence).toBe("high");
  });
});
