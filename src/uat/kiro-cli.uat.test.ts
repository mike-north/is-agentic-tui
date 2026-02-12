import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "node:child_process";
import {
  assertBinaryExists,
  writeDetectionScript,
  cleanupDetectionScript,
  cleanEnvExcept,
  parseDetectionOutput,
} from "./helpers.js";

const { scriptPath, tmpDir } = writeDetectionScript();
afterAll(() => {
  cleanupDetectionScript(tmpDir);
});

describe("Kiro CLI UAT", () => {
  it("should have kiro-cli binary available in PATH", () => {
    assertBinaryExists("kiro-cli");
  });

  // Kiro CLI detection relies on Q_TERM/QTERM_SESSION_ID set by kiro-cli's
  // shell integration (the terminal wrapper), not by `kiro-cli chat` when
  // spawning subprocesses. Unlike other tools that inject env vars into their
  // child processes, kiro-cli's vars are inherited from the parent shell.
  //
  // This test must be run from inside a kiro-cli terminal session to pass.
  // We strip all detection vars EXCEPT kiro-cli's own — those come from the
  // shell integration and are the signal we're testing for.
  it("should detect kiro-cli with high confidence from inside a kiro-cli terminal", () => {
    const stdout = execSync(`node "${scriptPath}"`, {
      encoding: "utf-8",
      timeout: 60_000,
      env: cleanEnvExcept(["Q_TERM", "QTERM_SESSION_ID"]),
    });
    const result = parseDetectionOutput(stdout);
    expect(result.tool).toBe("kiro-cli");
    expect(result.confidence).toBe("high");
  });
});
