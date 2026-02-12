import { execFileSync } from "node:child_process";

/**
 * Walks up the process tree and returns the names of ancestor processes.
 *
 * Uses the Unix `ps` command to look up parent PIDs. Returns an empty array
 * on Windows or if the process tree cannot be read.
 *
 * @param maxDepth - Maximum number of ancestors to walk (default 10)
 * @returns Array of ancestor process names (nearest ancestor first)
 */
export function getAncestorProcessNames(maxDepth = 10): string[] {
  if (process.platform === "win32") {
    return [];
  }

  const names: string[] = [];
  let pid = process.ppid;

  for (let i = 0; i < maxDepth; i++) {
    if (pid <= 1) {
      break;
    }

    try {
      const output = execFileSync("ps", ["-o", "ppid=,comm=", "-p", String(pid)], {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 2000,
      }).trim();

      if (!output) {
        break;
      }

      // Format: "  <ppid> <comm>"
      const match = /^\s*(\d+)\s+(.+)$/.exec(output);
      if (!match) {
        break;
      }

      const ppidStr = match[1];
      const commStr = match[2];
      if (ppidStr === undefined || commStr === undefined) {
        break;
      }

      const parentPid = parseInt(ppidStr, 10);
      const comm = commStr.trim();

      names.push(comm);
      pid = parentPid;
    } catch {
      break;
    }
  }

  return names;
}
