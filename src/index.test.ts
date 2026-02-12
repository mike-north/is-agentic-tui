import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  isAgenticTui,
  whichAgenticTui,
  isSpecificAgenticTui,
} from "./index.js";
import * as processModule from "./process.js";

describe("isAgenticTui", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Mock process tree walking to prevent real ancestors from triggering detection
    vi.spyOn(processModule, "getAncestorProcessNames").mockReturnValue([]);

    // Create a fresh copy of process.env for each test
    process.env = { ...originalEnv };
    // Clear all agentic TUI signals to prevent real env from leaking
    delete process.env["CLAUDECODE"];
    delete process.env["CLAUDE_CODE_ENTRYPOINT"];
    delete process.env["CLAUDE_PATH"];
    delete process.env["CURSOR_AGENT"];
    delete process.env["CURSOR_INVOKED_AS"];
    delete process.env["GEMINI_CLI"];
    delete process.env["AIDER"];
    delete process.env["CODEX_SANDBOX"];
    delete process.env["CODEX_THREAD_ID"];
    delete process.env["CLINE_ACTIVE"];
    delete process.env["Q_TERM"];
    delete process.env["QTERM_SESSION_ID"];
    delete process.env["OPENCODE"];
    delete process.env["OR_APP_NAME"];
    delete process.env["OR_SITE_URL"];
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("when running outside any agentic TUI", () => {
    beforeEach(() => {
      // Clear any agentic TUI signals
      delete process.env["CLAUDECODE"];
      delete process.env["CLAUDE_CODE_ENTRYPOINT"];
      delete process.env["CLAUDE_PATH"];
      delete process.env["CURSOR_AGENT"];
      delete process.env["CURSOR_INVOKED_AS"];
      delete process.env["GEMINI_CLI"];
      delete process.env["AIDER"];
      delete process.env["CODEX_SANDBOX"];
      delete process.env["CODEX_THREAD_ID"];
      delete process.env["CLINE_ACTIVE"];
      delete process.env["Q_TERM"];
      delete process.env["QTERM_SESSION_ID"];
      delete process.env["OPENCODE"];
      delete process.env["OR_APP_NAME"];
      delete process.env["OR_SITE_URL"];
    });

    it("should return false", () => {
      expect(isAgenticTui()).toBe(false);
    });

    it("whichAgenticTui should return null", () => {
      expect(whichAgenticTui()).toBeNull();
    });

    it("isSpecificAgenticTui should return false for any tool", () => {
      expect(isSpecificAgenticTui("claude-code")).toBe(false);
      expect(isSpecificAgenticTui("cursor-agent")).toBe(false);
      expect(isSpecificAgenticTui("gemini-cli")).toBe(false);
      expect(isSpecificAgenticTui("aider")).toBe(false);
      expect(isSpecificAgenticTui("codex")).toBe(false);
      expect(isSpecificAgenticTui("cline")).toBe(false);
      expect(isSpecificAgenticTui("kiro-cli")).toBe(false);
      expect(isSpecificAgenticTui("opencode")).toBe(false);
      expect(isSpecificAgenticTui("github-copilot-cli")).toBe(false);
    });
  });

  describe("Claude Code detection", () => {
    describe("with CLAUDECODE=1 (high confidence)", () => {
      beforeEach(() => {
        process.env["CLAUDECODE"] = "1";
      });

      it("isAgenticTui should return true", () => {
        expect(isAgenticTui()).toBe(true);
      });

      it("whichAgenticTui should return claude-code with high confidence", () => {
        const result = whichAgenticTui();
        expect(result).not.toBeNull();
        expect(result?.tool).toBe("claude-code");
        expect(result?.confidence).toBe("high");
        expect(result?.signals).toContain("CLAUDECODE=1");
      });

      it("isSpecificAgenticTui('claude-code') should return true", () => {
        expect(isSpecificAgenticTui("claude-code")).toBe(true);
      });

      it("isSpecificAgenticTui with other tools should return false", () => {
        expect(isSpecificAgenticTui("cursor-agent")).toBe(false);
        expect(isSpecificAgenticTui("gemini-cli")).toBe(false);
        expect(isSpecificAgenticTui("aider")).toBe(false);
      });
    });

    describe("with CLAUDECODE set to non-1 value", () => {
      beforeEach(() => {
        process.env["CLAUDECODE"] = "true";
      });

      it("should not detect with high confidence", () => {
        const result = whichAgenticTui();
        // Should not match - we require exactly "1"
        expect(result?.confidence).not.toBe("high");
      });
    });

    describe("with only CLAUDE_CODE_ENTRYPOINT (medium confidence)", () => {
      beforeEach(() => {
        delete process.env["CLAUDECODE"];
        process.env["CLAUDE_CODE_ENTRYPOINT"] = "cli";
      });

      it("isAgenticTui should return true", () => {
        expect(isAgenticTui()).toBe(true);
      });

      it("whichAgenticTui should return claude-code with medium confidence", () => {
        const result = whichAgenticTui();
        expect(result).not.toBeNull();
        expect(result?.tool).toBe("claude-code");
        expect(result?.confidence).toBe("medium");
      });
    });

    describe("with only CLAUDE_PATH containing claude-code (medium confidence)", () => {
      beforeEach(() => {
        delete process.env["CLAUDECODE"];
        delete process.env["CLAUDE_CODE_ENTRYPOINT"];
        process.env["CLAUDE_PATH"] = "/path/to/claude-code-2.1.0";
      });

      it("isAgenticTui should return true", () => {
        expect(isAgenticTui()).toBe(true);
      });

      it("whichAgenticTui should return claude-code with medium confidence", () => {
        const result = whichAgenticTui();
        expect(result).not.toBeNull();
        expect(result?.tool).toBe("claude-code");
        expect(result?.confidence).toBe("medium");
        expect(result?.signals.some((s) => s.includes("CLAUDE_PATH"))).toBe(
          true,
        );
      });
    });
  });

  describe("Cursor Agent detection", () => {
    beforeEach(() => {
      // Clear Claude signals and other Cursor signals
      delete process.env["CLAUDECODE"];
      delete process.env["CLAUDE_CODE_ENTRYPOINT"];
      delete process.env["CLAUDE_PATH"];
      delete process.env["CURSOR_AGENT"];
      delete process.env["CURSOR_INVOKED_AS"];
    });

    describe("with CURSOR_AGENT=1 (high confidence)", () => {
      beforeEach(() => {
        process.env["CURSOR_AGENT"] = "1";
      });

      it("isAgenticTui should return true", () => {
        expect(isAgenticTui()).toBe(true);
      });

      it("whichAgenticTui should return cursor-agent with high confidence", () => {
        const result = whichAgenticTui();
        expect(result).not.toBeNull();
        expect(result?.tool).toBe("cursor-agent");
        expect(result?.confidence).toBe("high");
      });
    });

    describe("with CURSOR_INVOKED_AS=cursor-agent (medium confidence)", () => {
      beforeEach(() => {
        process.env["CURSOR_INVOKED_AS"] = "cursor-agent";
      });

      it("isAgenticTui should return true", () => {
        expect(isAgenticTui()).toBe(true);
      });

      it("whichAgenticTui should return cursor-agent with medium confidence", () => {
        const result = whichAgenticTui();
        expect(result).not.toBeNull();
        expect(result?.tool).toBe("cursor-agent");
        expect(result?.confidence).toBe("medium");
        expect(result?.signals).toContain("CURSOR_INVOKED_AS=cursor-agent");
      });
    });
  });

  describe("Gemini CLI detection", () => {
    beforeEach(() => {
      delete process.env["CLAUDECODE"];
      delete process.env["CURSOR_AGENT"];
      delete process.env["GEMINI_CLI"];
    });

    describe("with GEMINI_CLI=1 (high confidence)", () => {
      beforeEach(() => {
        process.env["GEMINI_CLI"] = "1";
      });

      it("isAgenticTui should return true", () => {
        expect(isAgenticTui()).toBe(true);
      });

      it("whichAgenticTui should return gemini-cli with high confidence", () => {
        const result = whichAgenticTui();
        expect(result).not.toBeNull();
        expect(result?.tool).toBe("gemini-cli");
        expect(result?.confidence).toBe("high");
        expect(result?.signals).toContain("GEMINI_CLI=1");
      });

      it("isSpecificAgenticTui('gemini-cli') should return true", () => {
        expect(isSpecificAgenticTui("gemini-cli")).toBe(true);
      });
    });

    describe("with GEMINI_CLI set to non-1 value", () => {
      beforeEach(() => {
        process.env["GEMINI_CLI"] = "true";
      });

      it("should not detect", () => {
        expect(whichAgenticTui()?.tool).not.toBe("gemini-cli");
      });
    });
  });

  describe("Aider detection", () => {
    beforeEach(() => {
      // Clear other signals
      delete process.env["CLAUDECODE"];
      delete process.env["CURSOR_AGENT"];
      delete process.env["GEMINI_CLI"];
      delete process.env["AIDER"];
    });

    describe("with AIDER=1", () => {
      beforeEach(() => {
        process.env["AIDER"] = "1";
      });

      it("isAgenticTui should return true", () => {
        expect(isAgenticTui()).toBe(true);
      });

      it("whichAgenticTui should return aider with high confidence", () => {
        const result = whichAgenticTui();
        expect(result).not.toBeNull();
        expect(result?.tool).toBe("aider");
        expect(result?.confidence).toBe("high");
      });
    });

    describe("with OR_APP_NAME=Aider (OpenRouter signal, high confidence)", () => {
      beforeEach(() => {
        process.env["OR_APP_NAME"] = "Aider";
        process.env["OR_SITE_URL"] = "https://aider.chat";
      });

      it("isAgenticTui should return true", () => {
        expect(isAgenticTui()).toBe(true);
      });

      it("whichAgenticTui should return aider with high confidence", () => {
        const result = whichAgenticTui();
        expect(result).not.toBeNull();
        expect(result?.tool).toBe("aider");
        expect(result?.confidence).toBe("high");
        expect(result?.signals).toContain("OR_APP_NAME=Aider");
        expect(result?.signals).toContain("OR_SITE_URL=https://aider.chat");
      });
    });

    describe("with only OR_APP_NAME=Aider (no OR_SITE_URL)", () => {
      beforeEach(() => {
        process.env["OR_APP_NAME"] = "Aider";
      });

      it("whichAgenticTui should still detect aider", () => {
        const result = whichAgenticTui();
        expect(result?.tool).toBe("aider");
        expect(result?.confidence).toBe("high");
        expect(result?.signals).toContain("OR_APP_NAME=Aider");
        expect(result?.signals).not.toContain("OR_SITE_URL=https://aider.chat");
      });
    });

    describe("with OR_APP_NAME set to something other than Aider", () => {
      beforeEach(() => {
        process.env["OR_APP_NAME"] = "SomeOtherApp";
      });

      it("should not detect aider", () => {
        expect(whichAgenticTui()?.tool).not.toBe("aider");
      });
    });
  });

  describe("Codex detection", () => {
    beforeEach(() => {
      delete process.env["CLAUDECODE"];
      delete process.env["CURSOR_AGENT"];
      delete process.env["CODEX_SANDBOX"];
      delete process.env["CODEX_THREAD_ID"];
    });

    describe("with CODEX_SANDBOX (high confidence)", () => {
      beforeEach(() => {
        process.env["CODEX_SANDBOX"] = "seatbelt";
      });

      it("isAgenticTui should return true", () => {
        expect(isAgenticTui()).toBe(true);
      });

      it("whichAgenticTui should return codex with high confidence", () => {
        const result = whichAgenticTui();
        expect(result).not.toBeNull();
        expect(result?.tool).toBe("codex");
        expect(result?.confidence).toBe("high");
        expect(result?.signals).toContain("CODEX_SANDBOX=seatbelt");
      });

      it("isSpecificAgenticTui('codex') should return true", () => {
        expect(isSpecificAgenticTui("codex")).toBe(true);
      });
    });

    describe("with only CODEX_THREAD_ID (medium confidence)", () => {
      beforeEach(() => {
        process.env["CODEX_THREAD_ID"] = "abc-123-def";
      });

      it("isAgenticTui should return true", () => {
        expect(isAgenticTui()).toBe(true);
      });

      it("whichAgenticTui should return codex with medium confidence", () => {
        const result = whichAgenticTui();
        expect(result).not.toBeNull();
        expect(result?.tool).toBe("codex");
        expect(result?.confidence).toBe("medium");
      });
    });
  });

  describe("Cline detection", () => {
    beforeEach(() => {
      delete process.env["CLAUDECODE"];
      delete process.env["CURSOR_AGENT"];
      delete process.env["CLINE_ACTIVE"];
    });

    describe("with CLINE_ACTIVE=true (high confidence)", () => {
      beforeEach(() => {
        process.env["CLINE_ACTIVE"] = "true";
      });

      it("isAgenticTui should return true", () => {
        expect(isAgenticTui()).toBe(true);
      });

      it("whichAgenticTui should return cline with high confidence", () => {
        const result = whichAgenticTui();
        expect(result).not.toBeNull();
        expect(result?.tool).toBe("cline");
        expect(result?.confidence).toBe("high");
        expect(result?.signals).toContain("CLINE_ACTIVE=true");
      });

      it("isSpecificAgenticTui('cline') should return true", () => {
        expect(isSpecificAgenticTui("cline")).toBe(true);
      });
    });

    describe("with CLINE_ACTIVE set to non-true value", () => {
      beforeEach(() => {
        process.env["CLINE_ACTIVE"] = "1";
      });

      it("should not detect", () => {
        expect(whichAgenticTui()?.tool).not.toBe("cline");
      });
    });
  });

  describe("Kiro CLI detection", () => {
    beforeEach(() => {
      delete process.env["CLAUDECODE"];
      delete process.env["CURSOR_AGENT"];
      delete process.env["Q_TERM"];
      delete process.env["QTERM_SESSION_ID"];
    });

    describe("with Q_TERM and kiro-cli ancestor (high confidence)", () => {
      beforeEach(() => {
        process.env["Q_TERM"] = "1.24.1";
        vi.spyOn(processModule, "getAncestorProcessNames").mockReturnValue([
          "node",
          "kiro-cli",
          "zsh",
        ]);
      });

      it("isAgenticTui should return true", () => {
        expect(isAgenticTui()).toBe(true);
      });

      it("whichAgenticTui should return kiro-cli with high confidence", () => {
        const result = whichAgenticTui();
        expect(result).not.toBeNull();
        expect(result?.tool).toBe("kiro-cli");
        expect(result?.confidence).toBe("high");
        expect(result?.signals).toContain("Q_TERM=1.24.1");
        expect(result?.signals).toContain("ancestor process: kiro-cli");
      });

      it("isSpecificAgenticTui('kiro-cli') should return true", () => {
        expect(isSpecificAgenticTui("kiro-cli")).toBe(true);
      });
    });

    describe("with Q_TERM and q ancestor (high confidence)", () => {
      beforeEach(() => {
        process.env["Q_TERM"] = "1.24.1";
        vi.spyOn(processModule, "getAncestorProcessNames").mockReturnValue([
          "node",
          "q",
          "zsh",
        ]);
      });

      it("whichAgenticTui should return kiro-cli with high confidence", () => {
        const result = whichAgenticTui();
        expect(result?.tool).toBe("kiro-cli");
        expect(result?.confidence).toBe("high");
        expect(result?.signals).toContain("ancestor process: q");
      });
    });

    describe("with Q_TERM but no recognized ancestor (medium confidence)", () => {
      beforeEach(() => {
        process.env["Q_TERM"] = "1.24.1";
        // Process tree returns no matching ancestor (e.g. Windows or unknown tool)
      });

      it("whichAgenticTui should return kiro-cli with medium confidence", () => {
        const result = whichAgenticTui();
        expect(result).not.toBeNull();
        expect(result?.tool).toBe("kiro-cli");
        expect(result?.confidence).toBe("medium");
        expect(result?.signals).toContain("Q_TERM=1.24.1");
      });
    });

    describe("with only QTERM_SESSION_ID (medium confidence)", () => {
      beforeEach(() => {
        process.env["QTERM_SESSION_ID"] = "session-uuid-123";
      });

      it("isAgenticTui should return true", () => {
        expect(isAgenticTui()).toBe(true);
      });

      it("whichAgenticTui should return kiro-cli with medium confidence", () => {
        const result = whichAgenticTui();
        expect(result).not.toBeNull();
        expect(result?.tool).toBe("kiro-cli");
        expect(result?.confidence).toBe("medium");
      });
    });
  });

  describe("OpenCode detection", () => {
    beforeEach(() => {
      delete process.env["CLAUDECODE"];
      delete process.env["CURSOR_AGENT"];
      delete process.env["OPENCODE"];
    });

    describe("with OPENCODE=1 (high confidence)", () => {
      beforeEach(() => {
        process.env["OPENCODE"] = "1";
      });

      it("isAgenticTui should return true", () => {
        expect(isAgenticTui()).toBe(true);
      });

      it("whichAgenticTui should return opencode with high confidence", () => {
        const result = whichAgenticTui();
        expect(result).not.toBeNull();
        expect(result?.tool).toBe("opencode");
        expect(result?.confidence).toBe("high");
        expect(result?.signals).toContain("OPENCODE=1");
      });

      it("isSpecificAgenticTui('opencode') should return true", () => {
        expect(isSpecificAgenticTui("opencode")).toBe(true);
      });
    });

    describe("with OPENCODE set to non-1 value", () => {
      beforeEach(() => {
        process.env["OPENCODE"] = "true";
      });

      it("should not detect", () => {
        expect(whichAgenticTui()?.tool).not.toBe("opencode");
      });
    });
  });

  describe("GitHub Copilot CLI detection", () => {
    beforeEach(() => {
      delete process.env["CLAUDECODE"];
      delete process.env["CURSOR_AGENT"];
    });

    describe("with copilot ancestor process (medium confidence)", () => {
      beforeEach(() => {
        vi.spyOn(processModule, "getAncestorProcessNames").mockReturnValue([
          "node",
          "copilot",
          "zsh",
        ]);
      });

      it("isAgenticTui should return true", () => {
        expect(isAgenticTui()).toBe(true);
      });

      it("whichAgenticTui should return github-copilot-cli with medium confidence", () => {
        const result = whichAgenticTui();
        expect(result).not.toBeNull();
        expect(result?.tool).toBe("github-copilot-cli");
        expect(result?.confidence).toBe("medium");
        expect(result?.signals).toContain("ancestor process: copilot");
      });

      it("isSpecificAgenticTui('github-copilot-cli') should return true", () => {
        expect(isSpecificAgenticTui("github-copilot-cli")).toBe(true);
      });
    });

    describe("with copilot ancestor and Q_TERM (high confidence)", () => {
      beforeEach(() => {
        vi.spyOn(processModule, "getAncestorProcessNames").mockReturnValue([
          "node",
          "copilot",
          "zsh",
        ]);
        process.env["Q_TERM"] = "1.0.0";
      });

      it("whichAgenticTui should return github-copilot-cli with high confidence", () => {
        const result = whichAgenticTui();
        expect(result).not.toBeNull();
        expect(result?.tool).toBe("github-copilot-cli");
        expect(result?.confidence).toBe("high");
        expect(result?.signals).toContain("ancestor process: copilot");
        expect(result?.signals).toContain("Q_TERM=1.0.0");
      });

      it("should not misidentify as kiro-cli despite Q_TERM being set", () => {
        expect(isSpecificAgenticTui("kiro-cli")).toBe(false);
      });
    });

    describe("with full path copilot ancestor", () => {
      beforeEach(() => {
        vi.spyOn(processModule, "getAncestorProcessNames").mockReturnValue([
          "node",
          "/usr/local/bin/copilot",
          "zsh",
        ]);
      });

      it("whichAgenticTui should detect copilot from full path", () => {
        const result = whichAgenticTui();
        expect(result?.tool).toBe("github-copilot-cli");
        expect(result?.signals).toContain(
          "ancestor process: /usr/local/bin/copilot",
        );
      });
    });

    describe("without copilot ancestor process", () => {
      beforeEach(() => {
        vi.spyOn(processModule, "getAncestorProcessNames").mockReturnValue([
          "node",
          "zsh",
        ]);
      });

      it("should not detect github-copilot-cli", () => {
        const result = whichAgenticTui();
        expect(result?.tool).not.toBe("github-copilot-cli");
      });
    });

    describe("when process tree walking returns empty", () => {
      beforeEach(() => {
        vi.spyOn(processModule, "getAncestorProcessNames").mockReturnValue([]);
      });

      it("should not detect github-copilot-cli", () => {
        const result = whichAgenticTui();
        expect(result?.tool).not.toBe("github-copilot-cli");
      });
    });

    describe("with process name similar to but not matching copilot", () => {
      beforeEach(() => {
        vi.spyOn(processModule, "getAncestorProcessNames").mockReturnValue([
          "copilot-wrapper",
          "not-copilot",
          "mycopilot",
        ]);
      });

      it("should not detect github-copilot-cli", () => {
        expect(whichAgenticTui()?.tool).not.toBe("github-copilot-cli");
      });
    });
  });

  describe("priority handling", () => {
    describe("when multiple tools are detected", () => {
      beforeEach(() => {
        // Set high-confidence signal for Claude
        process.env["CLAUDECODE"] = "1";
        // Also set signal for Cursor
        process.env["CURSOR_AGENT"] = "1";
      });

      it("should return the first high-confidence match", () => {
        const result = whichAgenticTui();
        // Claude detector runs first in the array
        expect(result?.tool).toBe("claude-code");
        expect(result?.confidence).toBe("high");
      });
    });

    describe("when only medium-confidence matches exist", () => {
      beforeEach(() => {
        delete process.env["CLAUDECODE"];
        process.env["CLAUDE_CODE_ENTRYPOINT"] = "cli";
        process.env["CURSOR_INVOKED_AS"] = "cursor-agent";
      });

      it("should return the first medium-confidence match", () => {
        const result = whichAgenticTui();
        // Claude detector runs first
        expect(result?.tool).toBe("claude-code");
        expect(result?.confidence).toBe("medium");
      });
    });
  });
});
