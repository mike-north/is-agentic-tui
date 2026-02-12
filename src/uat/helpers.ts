import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = resolve(__dirname, "../../dist");

/**
 * Asserts that a binary exists in PATH. Throws a descriptive error if missing.
 */
export function assertBinaryExists(name: string): void {
  try {
    execFileSync("which", [name], { stdio: "pipe" });
  } catch {
    throw new Error(
      `${name} binary not found in PATH. Install ${name} to run these tests.`,
    );
  }
}

/**
 * Writes the detection script to a temp file and returns the absolute path.
 * The caller is responsible for cleaning up via {@link cleanupDetectionScript}.
 */
export function writeDetectionScript(): { scriptPath: string; tmpDir: string } {
  const distIndex = resolve(DIST_DIR, "index.js");
  const tmpDir = mkdtempSync(join(tmpdir(), "is-agentic-tui-uat-"));
  const scriptPath = join(tmpDir, "detect.mjs");
  writeFileSync(
    scriptPath,
    `import { whichAgenticTui } from "${pathToFileURL(distIndex).href}";\nconsole.log(JSON.stringify(whichAgenticTui()));\n`,
  );
  return { scriptPath, tmpDir };
}

/**
 * Cleans up the temp directory created by {@link writeDetectionScript}.
 */
export function cleanupDetectionScript(tmpDir: string): void {
  rmSync(tmpDir, { recursive: true, force: true });
}

/**
 * All env vars used by detection logic. UATs strip these from the subprocess
 * environment so that a parent agentic TUI (e.g. running tests from inside
 * Claude Code) doesn't cause false positives.
 */
const ALL_DETECTION_ENV_VARS = [
  "CLAUDECODE",
  "CLAUDE_CODE_ENTRYPOINT",
  "CLAUDE_PATH",
  "CURSOR_AGENT",
  "CURSOR_INVOKED_AS",
  "GEMINI_CLI",
  "AIDER",
  "OR_APP_NAME",
  "OR_SITE_URL",
  "CODEX_SANDBOX",
  "CODEX_THREAD_ID",
  "CLINE_ACTIVE",
  "Q_TERM",
  "QTERM_SESSION_ID",
  "OPENCODE",
  "AGENT",
];

/**
 * Returns a copy of process.env with all detection env vars stripped.
 * The tool under test will set its own vars when it spawns a subprocess.
 */
export function cleanEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of ALL_DETECTION_ENV_VARS) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- stripping env vars by computed key
    delete env[key];
  }
  return env;
}

/**
 * Like {@link cleanEnv}, but preserves the specified keys.
 * Use for tools whose detection vars come from shell integration (not subprocess
 * injection), so stripping them would remove the signal we're testing for.
 */
export function cleanEnvExcept(keep: string[]): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const keepSet = new Set(keep);
  for (const key of ALL_DETECTION_ENV_VARS) {
    if (!keepSet.has(key)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- stripping env vars by computed key
      delete env[key];
    }
  }
  return env;
}

export interface DetectionOutput {
  tool: string | null;
  confidence: "high" | "medium";
  signals: string[];
}

/**
 * Parses the JSON detection result from stdout.
 * Scans all lines for the first valid JSON object.
 */
export function parseDetectionOutput(stdout: string): DetectionOutput {
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("{")) {
      try {
        return JSON.parse(trimmed) as DetectionOutput;
      } catch {
        // not valid JSON, keep scanning
      }
    }
  }
  throw new Error(`Could not find JSON detection result in stdout:\n${stdout}`);
}
