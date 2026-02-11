import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isAgenticTui, whichAgenticTui, isSpecificAgenticTui } from "./index.js";

describe("isAgenticTui", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Create a fresh copy of process.env for each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
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
        expect(result?.signals.some((s) => s.includes("CLAUDE_PATH"))).toBe(true);
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
