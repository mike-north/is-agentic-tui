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

describe("Gemini CLI UAT", () => {
  it("should have gemini binary available in PATH", () => {
    assertBinaryExists("gemini");
  });

  it("should detect gemini-cli with high confidence from inside Gemini CLI", () => {
    const stdout = execSync(
      `gemini -p "Run this exact command and return only its output: node ${scriptPath}"`,
      { encoding: "utf-8", timeout: 60_000, env: cleanEnv() },
    );
    const result = parseDetectionOutput(stdout);
    expect(result.tool).toBe("gemini-cli");
    expect(result.confidence).toBe("high");
  });
});
