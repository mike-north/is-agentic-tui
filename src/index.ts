/**
 * Detects whether code is running inside an agentic TUI application.
 */

export type AgenticTui =
  | "claude-code"
  | "cursor-agent"
  | "gemini-cli"
  | "aider"
  | "codex"
  | "cline"
  | "kiro-cli"
  | "opencode"
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
    signals.push(
      `CLAUDE_CODE_ENTRYPOINT=${process.env["CLAUDE_CODE_ENTRYPOINT"]}`,
    );
  }

  if (process.env["CLAUDE_PATH"]?.includes("claude-code")) {
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
 * Aider sets OR_APP_NAME=Aider and OR_SITE_URL=https://aider.chat when using
 * OpenRouter as a provider. The AIDER=1 environment variable is a potential
 * future signal but not currently set by Aider.
 */
function detectAider(): DetectionResult | null {
  const signals: string[] = [];

  // Check for AIDER environment variable (future signal, not currently set)
  if (process.env["AIDER"] === "1") {
    signals.push("AIDER=1");
    return {
      tool: "aider",
      confidence: "high",
      signals,
    };
  }

  // Aider sets OR_APP_NAME=Aider when using OpenRouter as a provider.
  // OR_SITE_URL=https://aider.chat is also present but OR_APP_NAME alone
  // is sufficient for detection.
  if (process.env["OR_APP_NAME"] === "Aider") {
    signals.push("OR_APP_NAME=Aider");
    if (process.env["OR_SITE_URL"] === "https://aider.chat") {
      signals.push("OR_SITE_URL=https://aider.chat");
    }
    return {
      tool: "aider",
      confidence: "high",
      signals,
    };
  }

  return null;
}

/**
 * Detects Codex (OpenAI).
 *
 * Codex sets CODEX_SANDBOX when running in its sandbox environment
 * (e.g. "seatbelt"). CODEX_THREAD_ID is also present as a UUID.
 */
function detectCodex(): DetectionResult | null {
  // Primary signal: CODEX_SANDBOX exists
  if (process.env["CODEX_SANDBOX"] !== undefined) {
    return {
      tool: "codex",
      confidence: "high",
      signals: [`CODEX_SANDBOX=${process.env["CODEX_SANDBOX"]}`],
    };
  }

  // Secondary signal: CODEX_THREAD_ID exists
  if (process.env["CODEX_THREAD_ID"] !== undefined) {
    return {
      tool: "codex",
      confidence: "medium",
      signals: [`CODEX_THREAD_ID=${process.env["CODEX_THREAD_ID"]}`],
    };
  }

  return null;
}

/**
 * Detects Cline (VS Code extension).
 *
 * Cline sets CLINE_ACTIVE=true when running commands.
 * Verified from Cline's upstream source: src/integrations/terminal/TerminalRegistry.ts
 * (in the cline/cline GitHub repository)
 */
function detectCline(): DetectionResult | null {
  if (process.env["CLINE_ACTIVE"] === "true") {
    return {
      tool: "cline",
      confidence: "high",
      signals: ["CLINE_ACTIVE=true"],
    };
  }

  return null;
}

/**
 * Detects Kiro CLI (formerly Amazon Q Developer CLI).
 *
 * Kiro CLI sets Q_TERM to a version string (e.g. "1.24.1").
 * QTERM_SESSION_ID is also present as a UUID.
 */
function detectKiroCli(): DetectionResult | null {
  // Primary signal: Q_TERM exists
  if (process.env["Q_TERM"] !== undefined) {
    return {
      tool: "kiro-cli",
      confidence: "high",
      signals: [`Q_TERM=${process.env["Q_TERM"]}`],
    };
  }

  // Secondary signal: QTERM_SESSION_ID exists
  if (process.env["QTERM_SESSION_ID"] !== undefined) {
    return {
      tool: "kiro-cli",
      confidence: "medium",
      signals: [`QTERM_SESSION_ID=${process.env["QTERM_SESSION_ID"]}`],
    };
  }

  return null;
}

/**
 * Detects OpenCode.
 *
 * Note: Detection signals for OpenCode need to be empirically verified.
 * Based on anomalyco fork PR #1780 which sets OPENCODE=1.
 */
function detectOpencode(): DetectionResult | null {
  if (process.env["OPENCODE"] === "1") {
    return {
      tool: "opencode",
      confidence: "high",
      signals: ["OPENCODE=1"],
    };
  }

  return null;
}

// All detector functions
const detectors: (() => DetectionResult | null)[] = [
  detectClaudeCode,
  detectCursorAgent,
  detectGeminiCli,
  detectAider,
  detectCodex,
  detectCline,
  detectKiroCli,
  detectOpencode,
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
