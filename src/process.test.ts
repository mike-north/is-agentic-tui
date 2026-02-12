import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getAncestorProcessNames } from "./process.js";
import { execFileSync } from "node:child_process";
import type { ExecFileSyncOptions } from "node:child_process";

// Mock the child_process module
vi.mock("node:child_process", () => ({
  execFileSync: vi.fn(),
}));

describe("getAncestorProcessNames", () => {
  const mockExecFileSync = vi.mocked(execFileSync);

  const originalPlatform = process.platform;

  beforeEach(() => {
    // Reset mocks
    mockExecFileSync.mockReset();
    // Default to Unix platform
    Object.defineProperty(process, "platform", {
      value: "linux",
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore original values
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      configurable: true,
    });
  });

  describe("Windows platform", () => {
    beforeEach(() => {
      Object.defineProperty(process, "platform", {
        value: "win32",
        configurable: true,
      });
    });

    it("should return empty array on Windows", () => {
      const result = getAncestorProcessNames();
      expect(result).toEqual([]);
      // Should not attempt to call ps on Windows
      expect(mockExecFileSync).not.toHaveBeenCalled();
    });
  });

  describe("normal operation", () => {
    it("should walk up ancestor chain and return process names", () => {
      // Simulate process tree: current <- 500 (bash) <- 100 (zsh) <- 1 (init)
      mockExecFileSync
        .mockReturnValueOnce("  500 bash\n") // Parent of current is 500 (bash)
        .mockReturnValueOnce("  100 zsh\n") // Parent of 500 is 100 (zsh)
        .mockReturnValueOnce("  1 init\n"); // Parent of 100 is 1 (init)

      const result = getAncestorProcessNames();

      expect(result).toEqual(["bash", "zsh", "init"]);
      expect(mockExecFileSync).toHaveBeenCalledTimes(3);

      // Verify the ps command calls (using process.ppid which is the actual ppid)
      expect(mockExecFileSync).toHaveBeenNthCalledWith(
        1,
        "ps",
        ["-o", "ppid=,comm=", "-p", String(process.ppid)],
        expect.objectContaining({
          encoding: "utf-8",
          timeout: 2000,
        }),
      );
      expect(mockExecFileSync).toHaveBeenNthCalledWith(
        2,
        "ps",
        ["-o", "ppid=,comm=", "-p", "500"],
        expect.any(Object),
      );
      expect(mockExecFileSync).toHaveBeenNthCalledWith(
        3,
        "ps",
        ["-o", "ppid=,comm=", "-p", "100"],
        expect.any(Object),
      );
    });

    it("should handle process names with paths", () => {
      mockExecFileSync
        .mockReturnValueOnce("  500 /usr/local/bin/node\n")
        .mockReturnValueOnce("  1 /usr/bin/bash\n");

      const result = getAncestorProcessNames();

      expect(result).toEqual(["/usr/local/bin/node", "/usr/bin/bash"]);
    });

    it("should handle leading/trailing whitespace in ps output", () => {
      mockExecFileSync.mockReturnValueOnce("    500    bash    \n");

      const result = getAncestorProcessNames();

      expect(result).toEqual(["bash"]);
    });

    it("should handle process names with spaces", () => {
      mockExecFileSync.mockReturnValueOnce("  500 Google Chrome Helper\n");

      const result = getAncestorProcessNames();

      expect(result).toEqual(["Google Chrome Helper"]);
    });
  });

  describe("maxDepth parameter", () => {
    it("should respect maxDepth limit", () => {
      // Simulate a long chain
      mockExecFileSync
        .mockReturnValueOnce("  900 bash\n")
        .mockReturnValueOnce("  800 zsh\n")
        .mockReturnValueOnce("  700 fish\n")
        .mockReturnValueOnce("  600 sh\n")
        .mockReturnValueOnce("  500 tmux\n");

      const result = getAncestorProcessNames(3);

      expect(result).toEqual(["bash", "zsh", "fish"]);
      expect(mockExecFileSync).toHaveBeenCalledTimes(3);
    });

    it("should handle maxDepth of 1", () => {
      mockExecFileSync.mockReturnValueOnce("  500 bash\n");

      const result = getAncestorProcessNames(1);

      expect(result).toEqual(["bash"]);
      expect(mockExecFileSync).toHaveBeenCalledTimes(1);
    });

    it("should return empty array when maxDepth is 0", () => {
      const result = getAncestorProcessNames(0);

      expect(result).toEqual([]);
      expect(mockExecFileSync).not.toHaveBeenCalled();
    });

    it("should use default maxDepth of 10", () => {
      // Create a chain of 15 processes
      for (let i = 0; i < 15; i++) {
        mockExecFileSync.mockReturnValueOnce(`  ${String(900 - i * 10)} proc${String(i)}\n`);
      }

      const result = getAncestorProcessNames();

      // Should stop at 10
      expect(result).toHaveLength(10);
      expect(mockExecFileSync).toHaveBeenCalledTimes(10);
    });
  });

  describe("PID boundary", () => {
    it("should stop when reaching PID 1", () => {
      mockExecFileSync
        .mockReturnValueOnce("  500 bash\n")
        .mockReturnValueOnce("  1 init\n");

      const result = getAncestorProcessNames();

      expect(result).toEqual(["bash", "init"]);
      // Should stop after getting init (PID 1), not try to query PID 1's parent
      expect(mockExecFileSync).toHaveBeenCalledTimes(2);
    });

    it("should stop when reaching PID 0", () => {
      mockExecFileSync.mockReturnValueOnce("  0 kernel\n");

      const result = getAncestorProcessNames();

      expect(result).toEqual(["kernel"]);
      expect(mockExecFileSync).toHaveBeenCalledTimes(1);
    });

    it("should stop when parent PID is less than current (orphaned process)", () => {
      // Mock ps to return ppid 1 for the current process
      mockExecFileSync.mockReturnValueOnce("  1 init\n");

      const result = getAncestorProcessNames();

      // Should get init and then stop because ppid 1 is <= 1
      expect(result).toEqual(["init"]);
      expect(mockExecFileSync).toHaveBeenCalledTimes(1);
    });
  });

  describe("ps command failure", () => {
    it("should return partial results when ps fails mid-chain", () => {
      mockExecFileSync
        .mockReturnValueOnce("  500 bash\n")
        .mockReturnValueOnce("  100 zsh\n")
        .mockImplementationOnce(() => {
          throw new Error("ps command failed");
        });

      const result = getAncestorProcessNames();

      // Should return what was collected before the error
      expect(result).toEqual(["bash", "zsh"]);
      expect(mockExecFileSync).toHaveBeenCalledTimes(3);
    });

    it("should return empty array when first ps call fails", () => {
      mockExecFileSync.mockImplementationOnce(() => {
        throw new Error("ps command failed");
      });

      const result = getAncestorProcessNames();

      expect(result).toEqual([]);
      expect(mockExecFileSync).toHaveBeenCalledTimes(1);
    });

    it("should handle ENOENT error (ps not found)", () => {
      const error = new Error("Command not found");
      (error as NodeJS.ErrnoException).code = "ENOENT";
      mockExecFileSync.mockImplementationOnce(() => {
        throw error;
      });

      const result = getAncestorProcessNames();

      expect(result).toEqual([]);
    });
  });

  describe("ps timeout", () => {
    it("should return partial results when ps times out", () => {
      mockExecFileSync
        .mockReturnValueOnce("  500 bash\n")
        .mockImplementationOnce(() => {
          const error = new Error("Command timed out");
          (error as NodeJS.ErrnoException).code = "ETIMEDOUT";
          throw error;
        });

      const result = getAncestorProcessNames();

      expect(result).toEqual(["bash"]);
      expect(mockExecFileSync).toHaveBeenCalledTimes(2);
    });

    it("should use 2000ms timeout in ps options", () => {
      mockExecFileSync.mockReturnValueOnce("  500 bash\n");

      getAncestorProcessNames();

      expect(mockExecFileSync).toHaveBeenCalledWith(
        "ps",
        expect.any(Array),
        expect.objectContaining({
          timeout: 2000,
        }) as ExecFileSyncOptions,
      );
    });
  });

  describe("empty ps output", () => {
    it("should stop walking when ps returns empty string", () => {
      mockExecFileSync
        .mockReturnValueOnce("  500 bash\n")
        .mockReturnValueOnce("");

      const result = getAncestorProcessNames();

      expect(result).toEqual(["bash"]);
      expect(mockExecFileSync).toHaveBeenCalledTimes(2);
    });

    it("should stop walking when ps returns only whitespace", () => {
      mockExecFileSync
        .mockReturnValueOnce("  500 bash\n")
        .mockReturnValueOnce("   \n  \t  ");

      const result = getAncestorProcessNames();

      expect(result).toEqual(["bash"]);
      expect(mockExecFileSync).toHaveBeenCalledTimes(2);
    });
  });

  describe("malformed ps output", () => {
    it("should stop walking when regex does not match (missing ppid)", () => {
      mockExecFileSync
        .mockReturnValueOnce("  500 bash\n")
        .mockReturnValueOnce("bash"); // Missing ppid

      const result = getAncestorProcessNames();

      expect(result).toEqual(["bash"]);
      expect(mockExecFileSync).toHaveBeenCalledTimes(2);
    });

    it("should stop walking when regex does not match (missing comm)", () => {
      mockExecFileSync
        .mockReturnValueOnce("  500 bash\n")
        .mockReturnValueOnce("  100"); // Missing comm

      const result = getAncestorProcessNames();

      expect(result).toEqual(["bash"]);
      expect(mockExecFileSync).toHaveBeenCalledTimes(2);
    });

    it("should stop walking when ppid is not a number", () => {
      mockExecFileSync
        .mockReturnValueOnce("  500 bash\n")
        .mockReturnValueOnce("  invalid bash\n");

      const result = getAncestorProcessNames();

      // The regex won't match "  invalid bash\n" because \d+ requires digits
      expect(result).toEqual(["bash"]);
      expect(mockExecFileSync).toHaveBeenCalledTimes(2);
    });

    it("should handle output with unusual formatting", () => {
      mockExecFileSync.mockReturnValueOnce("500bash"); // No whitespace

      const result = getAncestorProcessNames();

      // Won't match the regex pattern /^\s*(\d+)\s+(.+)$/
      expect(result).toEqual([]);
    });
  });

  describe("edge cases", () => {
    it("should stop when reaching PID 1 boundary", () => {
      // When ps returns ppid 1, the loop should stop after recording that process
      mockExecFileSync.mockReturnValueOnce("  1 init\n");

      const result = getAncestorProcessNames();

      // Should record init but not try to query its parent (since ppid <= 1)
      expect(result).toEqual(["init"]);
      expect(mockExecFileSync).toHaveBeenCalledTimes(1);
    });

    it("should stop when reaching PID 0 boundary", () => {
      // When ps returns ppid 0, the loop should stop after recording that process
      mockExecFileSync.mockReturnValueOnce("  0 kernel\n");

      const result = getAncestorProcessNames();

      expect(result).toEqual(["kernel"]);
      expect(mockExecFileSync).toHaveBeenCalledTimes(1);
    });

    it("should handle negative maxDepth gracefully", () => {
      const result = getAncestorProcessNames(-1);

      expect(result).toEqual([]);
      expect(mockExecFileSync).not.toHaveBeenCalled();
    });

    it("should handle large ppid values in ps output", () => {
      // Test that we can parse large ppid values from ps output
      mockExecFileSync
        .mockReturnValueOnce("  2147483647 bash\n")
        .mockReturnValueOnce("  1 init\n");

      const result = getAncestorProcessNames();

      expect(result).toEqual(["bash", "init"]);
      // Verify we queried with the large ppid
      expect(mockExecFileSync).toHaveBeenNthCalledWith(
        2,
        "ps",
        ["-o", "ppid=,comm=", "-p", "2147483647"],
        expect.any(Object),
      );
    });

    it("should pass correct encoding to execFileSync", () => {
      mockExecFileSync.mockReturnValueOnce("  500 bash\n");

      getAncestorProcessNames();

      expect(mockExecFileSync).toHaveBeenCalledWith(
        "ps",
        expect.any(Array),
        expect.objectContaining({
          encoding: "utf-8",
        }) as ExecFileSyncOptions,
      );
    });

    it("should pass correct stdio configuration", () => {
      mockExecFileSync.mockReturnValueOnce("  500 bash\n");

      getAncestorProcessNames();

      expect(mockExecFileSync).toHaveBeenCalledWith(
        "ps",
        expect.any(Array),
        expect.objectContaining({
          stdio: ["pipe", "pipe", "pipe"],
        }) as ExecFileSyncOptions,
      );
    });
  });

  describe("macOS platform", () => {
    beforeEach(() => {
      Object.defineProperty(process, "platform", {
        value: "darwin",
        configurable: true,
      });
    });

    it("should work on macOS", () => {
      mockExecFileSync.mockReturnValueOnce("  500 bash\n");

      const result = getAncestorProcessNames();

      expect(result).toEqual(["bash"]);
      expect(mockExecFileSync).toHaveBeenCalled();
    });
  });

  describe("Linux platform", () => {
    beforeEach(() => {
      Object.defineProperty(process, "platform", {
        value: "linux",
        configurable: true,
      });
    });

    it("should work on Linux", () => {
      mockExecFileSync.mockReturnValueOnce("  500 systemd\n");

      const result = getAncestorProcessNames();

      expect(result).toEqual(["systemd"]);
      expect(mockExecFileSync).toHaveBeenCalled();
    });
  });
});
