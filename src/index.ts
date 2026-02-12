import { getAncestorProcessNames } from "./process.js";

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
  | "github-copilot-cli"
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
 *
 * **Q_TERM is not unique to Kiro.** GitHub Copilot CLI (and potentially
 * future tools) also sets Q_TERM. To avoid false positives, when Q_TERM is
 * present we verify that a `kiro-cli` (or `q`) ancestor exists in the
 * process tree. If the ancestor check fails (e.g. on Windows, or if the
 * process tree is unreadable) we fall back to medium confidence on the env
 * var alone — this preserves detection on platforms where `ps` isn't
 * available.
 *
 * If `detectGitHubCopilotCli` already matched (it runs earlier in the
 * detector array), this function won't affect the result because
 * `whichAgenticTui()` returns the first high-confidence match. But this
 * ancestor check is still valuable as a defense-in-depth guard against
 * future Q_TERM-setting tools that may be inserted after Copilot in the
 * detector array.
 */
function detectKiroCli(): DetectionResult | null {
  const qTerm = process.env["Q_TERM"];
  if (qTerm !== undefined) {
    const signals = [`Q_TERM=${qTerm}`];

    // Verify via process tree to disambiguate from other Q_TERM-setting tools.
    const ancestors = getAncestorProcessNames();
    const kiroAncestor = ancestors.find(
      (name) =>
        name === "kiro-cli" ||
        name.endsWith("/kiro-cli") ||
        name === "q" ||
        name.endsWith("/q"),
    );

    if (kiroAncestor) {
      signals.push(`ancestor process: ${kiroAncestor}`);
      return { tool: "kiro-cli", confidence: "high", signals };
    }

    // No ancestor found — could be a platform where ps isn't available,
    // or the process tree is unreadable. Fall back to medium confidence
    // on the env var alone.
    return { tool: "kiro-cli", confidence: "medium", signals };
  }

  // Secondary signal: QTERM_SESSION_ID exists
  const sessionId = process.env["QTERM_SESSION_ID"];
  if (sessionId !== undefined) {
    return {
      tool: "kiro-cli",
      confidence: "medium",
      signals: [`QTERM_SESSION_ID=${sessionId}`],
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

/**
 * Detects GitHub Copilot CLI.
 *
 * Copilot CLI does not set any unique environment variables in subprocesses.
 * Detection relies on walking the process tree to find a `copilot` ancestor.
 *
 * **Q_TERM disambiguation:** Copilot CLI sets Q_TERM in its subprocess
 * environment — the same variable that Kiro CLI sets. Q_TERM alone cannot
 * distinguish between the two tools. The `copilot` ancestor process name is
 * the only differentiator we have today. When both signals are present
 * (ancestor process + Q_TERM) we return high confidence; with only the
 * ancestor process we return medium.
 *
 * **IMPORTANT — detector ordering:** This detector MUST run before
 * `detectKiroCli` in the `detectors` array. Because `whichAgenticTui()`
 * picks the first high-confidence match, running Copilot first ensures that
 * a `copilot` ancestor + Q_TERM is attributed to Copilot (high), not Kiro.
 * If a *third* tool starts setting Q_TERM and has its own distinct ancestor
 * process name, it should follow the same pattern: add a process-tree
 * detector before Kiro, and treat Q_TERM as a corroborating (not primary)
 * signal.
 */
function detectGitHubCopilotCli(): DetectionResult | null {
  const ancestors = getAncestorProcessNames();
  const copilotAncestor = ancestors.find(
    (name) => name === "copilot" || name.endsWith("/copilot"),
  );

  if (copilotAncestor) {
    const signals = [`ancestor process: ${copilotAncestor}`];

    // Q_TERM is shared with Kiro CLI (and potentially future tools).
    // It corroborates the process-tree signal but must not be used as
    // the sole discriminator — see the JSDoc above for ordering rules.
    const qTerm = process.env["Q_TERM"];
    if (qTerm !== undefined) {
      signals.push(`Q_TERM=${qTerm}`);
    }

    return {
      tool: "github-copilot-cli",
      confidence: qTerm !== undefined ? "high" : "medium",
      signals,
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
  // ⚠️ ORDER MATTERS: Copilot CLI must run before Kiro CLI.
  // Both tools set Q_TERM. Copilot is disambiguated by its ancestor process
  // name ("copilot"). If Copilot matched, Kiro won't run (first high-confidence
  // match wins). If no copilot ancestor is found, Kiro's Q_TERM check proceeds
  // as normal. See detectGitHubCopilotCli JSDoc for the full rationale.
  detectGitHubCopilotCli,
  detectKiroCli,
  detectOpencode,
];

// Runtime guard: Copilot must precede Kiro (both use Q_TERM; see detector JSDoc).
// Only enforced when both detectors are present — removing one is safe.
const copilotIdx = detectors.indexOf(detectGitHubCopilotCli);
const kiroIdx = detectors.indexOf(detectKiroCli);
if (copilotIdx !== -1 && kiroIdx !== -1 && copilotIdx >= kiroIdx) {
  throw new Error(
    "detectGitHubCopilotCli must appear before detectKiroCli in the detectors array. " +
    "Both tools set Q_TERM; see the JSDoc on each detector for details.",
  );
}

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
