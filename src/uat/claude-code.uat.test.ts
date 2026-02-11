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

describe("Claude Code UAT", () => {
  it("should have claude binary available in PATH", () => {
    assertBinaryExists("claude");
  });

  it("should detect claude-code with high confidence from inside Claude Code", () => {
    const stdout = execSync(
      `claude -p "Run this exact command and return only its output: node ${scriptPath}" --allowedTools Bash`,
      { encoding: "utf-8", timeout: 60_000, env: cleanEnv() },
    );
    const result = parseDetectionOutput(stdout);
    expect(result.tool).toBe("claude-code");
    expect(result.confidence).toBe("high");
  });
});
