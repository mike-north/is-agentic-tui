/**
 * Detects whether code is running inside an agentic TUI application.
 */

export type AgenticTui =
  | "claude-code"
  | "cursor-agent"
  | "gemini-cli"
  | "aider"
  | "unknown";

/**
 * Detection result with confidence level.
 */
export interface DetectionResult {
  /** The detected agentic TUI, or null if not detected */
  tool: AgenticTui | null;
  /** Confidence level: "high" means definitive signal, "medium" means probable */
  confidence: "high" | "medium";
  /** The signals that triggered detection */
  signals: string[];
}

/**
 * Detects Claude Code by checking for the CLAUDECODE environment variable.
 *
 * Claude Code sets CLAUDECODE=1 when running commands.
 */
function detectClaudeCode(): DetectionResult | null {
  const signals: string[] = [];

  // Primary signal: CLAUDECODE=1
  if (process.env["CLAUDECODE"] === "1") {
    signals.push("CLAUDECODE=1");
    return {
      tool: "claude-code",
      confidence: "high",
      signals,
    };
  }

  // Secondary signals (less reliable, but still indicative)
  if (process.env["CLAUDE_CODE_ENTRYPOINT"] !== undefined) {
    signals.push(`CLAUDE_CODE_ENTRYPOINT=${process.env["CLAUDE_CODE_ENTRYPOINT"]}`);
  }

  const claudePath = process.env["CLAUDE_PATH"];
  if (claudePath !== undefined && claudePath.includes("claude-code")) {
    signals.push(`CLAUDE_PATH contains "claude-code"`);
  }

  if (signals.length > 0) {
    return {
      tool: "claude-code",
      confidence: "medium",
      signals,
    };
  }

  return null;
}

/**
 * Detects Cursor Agent.
 *
 * Cursor Agent sets CURSOR_AGENT=1 and CURSOR_INVOKED_AS=cursor-agent
 * when running commands.
 */
function detectCursorAgent(): DetectionResult | null {
  const signals: string[] = [];

  // Primary signal: CURSOR_AGENT=1
  if (process.env["CURSOR_AGENT"] === "1") {
    signals.push("CURSOR_AGENT=1");
    return {
      tool: "cursor-agent",
      confidence: "high",
      signals,
    };
  }

  // Secondary signal: CURSOR_INVOKED_AS=cursor-agent
  if (process.env["CURSOR_INVOKED_AS"] === "cursor-agent") {
    signals.push("CURSOR_INVOKED_AS=cursor-agent");
    return {
      tool: "cursor-agent",
      confidence: "medium",
      signals,
    };
  }

  return null;
}

/**
 * Detects Gemini CLI.
 *
 * Gemini CLI sets GEMINI_CLI=1 when spawning shell commands.
 * Verified from source: packages/core/src/services/shellExecutionService.ts
 */
function detectGeminiCli(): DetectionResult | null {
  const signals: string[] = [];

  // Primary signal: GEMINI_CLI=1
  if (process.env["GEMINI_CLI"] === "1") {
    signals.push("GEMINI_CLI=1");
    return {
      tool: "gemini-cli",
      confidence: "high",
      signals,
    };
  }

  return null;
}

/**
 * Detects Aider.
 *
 * Note: Detection signals for Aider need to be empirically verified.
 * This is a placeholder.
 */
function detectAider(): DetectionResult | null {
  const signals: string[] = [];

  // Check for AIDER environment variable (hypothetical)
  if (process.env["AIDER"] === "1") {
    signals.push("AIDER=1");
    return {
      tool: "aider",
      confidence: "high",
      signals,
    };
  }

  return null;
}

// All detector functions
const detectors: Array<() => DetectionResult | null> = [
  detectClaudeCode,
  detectCursorAgent,
  detectGeminiCli,
  detectAider,
];

/**
 * Checks if code is running inside any agentic TUI application.
 *
 * @returns true if running inside an agentic TUI, false otherwise
 *
 * @example
 * ```ts
 * import { isAgenticTui } from 'is-agentic-tui';
 *
 * if (isAgenticTui()) {
 *   console.log('Running inside an agentic TUI');
 * }
 * ```
 */
export function isAgenticTui(): boolean {
  return detectors.some((detect) => detect() !== null);
}

/**
 * Identifies which agentic TUI application is running, if any.
 *
 * @returns Detection result with tool name and confidence, or null if not in an agentic TUI
 *
 * @example
 * ```ts
 * import { whichAgenticTui } from 'is-agentic-tui';
 *
 * const result = whichAgenticTui();
 * if (result) {
 *   console.log(`Running in ${result.tool} (confidence: ${result.confidence})`);
 *   console.log(`Detected via: ${result.signals.join(', ')}`);
 * }
 * ```
 */
export function whichAgenticTui(): DetectionResult | null {
  // Return the first high-confidence match
  for (const detect of detectors) {
    const result = detect();
    if (result?.confidence === "high") {
      return result;
    }
  }

  // Fall back to first medium-confidence match
  for (const detect of detectors) {
    const result = detect();
    if (result !== null) {
      return result;
    }
  }

  return null;
}

/**
 * Checks if code is running inside a specific agentic TUI.
 *
 * @param tool - The tool to check for
 * @returns true if running inside the specified tool, false otherwise
 *
 * @example
 * ```ts
 * import { isSpecificAgenticTui } from 'is-agentic-tui';
 *
 * if (isSpecificAgenticTui('claude-code')) {
 *   console.log('Running inside Claude Code');
 * }
 * ```
 */
export function isSpecificAgenticTui(tool: AgenticTui): boolean {
  const result = whichAgenticTui();
  return result?.tool === tool;
}
