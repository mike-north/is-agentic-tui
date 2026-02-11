# UAT Tool Versions

Tracks the versions of agentic TUI tools that UATs have been verified against.
The version range (first → latest) shows the window where we know detection works.
When a tool changes its env var behavior, this helps identify the breaking version boundary.

## Verified Tools

| Tool        | Binary     | First Verified | Latest Verified | Env Vars Detected                                     | Status                                 |
| ----------- | ---------- | -------------- | --------------- | ----------------------------------------------------- | -------------------------------------- |
| Claude Code | `claude`   | 2.1.39         | 2.1.39          | `CLAUDECODE=1`                                        | passing                                |
| OpenCode    | `opencode` | 1.1.59         | 1.1.59          | `OPENCODE=1`                                          | passing                                |
| Codex       | `codex`    | 0.98.0         | 0.98.0          | `CODEX_SANDBOX`, `CODEX_THREAD_ID`                    | passing                                |
| Gemini CLI  | `gemini`   | 0.26.0         | 0.26.0          | `GEMINI_CLI=1`                                        | binary found, transient 429 rate limit |
| Aider       | `aider`    | 0.86.1         | 0.86.1          | `OR_APP_NAME=Aider`, `OR_SITE_URL=https://aider.chat` | passing                                |

## Shell-Integration Detection (not subprocess-injected)

| Tool     | Binary     | First Verified | Latest Verified | Env Vars Detected            | Notes                                                                                                                |
| -------- | ---------- | -------------- | --------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Kiro CLI | `kiro-cli` | 1.25.1         | 1.25.1          | `Q_TERM`, `QTERM_SESSION_ID` | passing — vars come from shell integration, not subprocess injection. UAT uses `cleanEnvExcept()` to preserve these. |

## IDE-Only (No CLI, Cannot UAT)

| Tool         | Env Vars Expected                     | Notes                                                                 |
| ------------ | ------------------------------------- | --------------------------------------------------------------------- |
| Cline        | `CLINE_ACTIVE=true`                   | VS Code extension only. Verified via unit tests with mocked env vars. |
| Cursor Agent | `CURSOR_AGENT=1`, `CURSOR_INVOKED_AS` | IDE only. Verified via unit tests with mocked env vars.               |
