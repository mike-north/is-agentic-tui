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

describe("Codex UAT", () => {
  it("should have codex binary available in PATH", () => {
    assertBinaryExists("codex");
  });

  it("should detect codex with high confidence from inside Codex", () => {
    const stdout = execSync(
      `codex exec --full-auto "Run this exact command and return only its output: node ${scriptPath}"`,
      { encoding: "utf-8", timeout: 60_000, env: cleanEnv() },
    );
    const result = parseDetectionOutput(stdout);
    expect(result.tool).toBe("codex");
    expect(result.confidence).toBe("high");
  });
});
