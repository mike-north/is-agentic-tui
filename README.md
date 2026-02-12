# is-agentic-tui

Detect if your code is running inside an agentic TUI (Text User Interface) application like Claude Code, Cursor Agent, Gemini CLI, or Aider.

## Installation

```bash
npm install is-agentic-tui
# or
pnpm add is-agentic-tui
# or
yarn add is-agentic-tui
```

## Usage

### Check if running in any agentic TUI

```ts
import { isAgenticTui } from "is-agentic-tui";

if (isAgenticTui()) {
  console.log("Running inside an agentic TUI");
}
```

### Identify which agentic TUI

```ts
import { whichAgenticTui } from "is-agentic-tui";

const result = whichAgenticTui();
if (result) {
  console.log(`Running in ${result.tool}`);
  console.log(`Confidence: ${result.confidence}`);
  console.log(`Detected via: ${result.signals.join(", ")}`);
}
```

### Check for a specific tool

```ts
import { isSpecificAgenticTui } from "is-agentic-tui";

if (isSpecificAgenticTui("claude-code")) {
  console.log("Running inside Claude Code");
}
```

## Supported Tools

| Tool | Environment Variable | Confidence |
|------|---------------------|------------|
| Claude Code | `CLAUDECODE=1` | High |
| Claude Code | `CLAUDE_CODE_ENTRYPOINT` | Medium |
| Cursor Agent | `CURSOR_AGENT=1` | High |
| Cursor Agent | `CURSOR_INVOKED_AS=cursor-agent` | Medium |
| Gemini CLI | `GEMINI_CLI=1` | High |
| Aider | `AIDER=1` | High* |

*Aider detection is currently unverified and may need adjustment based on actual Aider behavior.

## API

### `isAgenticTui(): boolean`

Returns `true` if running inside any detected agentic TUI.

### `whichAgenticTui(): DetectionResult | null`

Returns detailed detection information, or `null` if not in an agentic TUI.

```ts
interface DetectionResult {
  tool: "claude-code" | "cursor-agent" | "gemini-cli" | "aider" | "unknown";
  confidence: "high" | "medium";
  signals: string[];
}
```

### `isSpecificAgenticTui(tool: AgenticTui): boolean`

Returns `true` if running inside the specified tool.

## Confidence Levels

- **High**: Definitive signal detected (e.g., `CLAUDECODE=1`)
- **Medium**: Probable signal detected, but less certain (e.g., `CLAUDE_CODE_ENTRYPOINT` without `CLAUDECODE=1`)

When multiple tools could match, high-confidence matches take priority.

## Use Cases

- **Adjust output formatting**: Simplify or enrich output for AI consumption
- **Skip interactive prompts**: Auto-accept defaults when an agent is driving
- **Enable verbose logging**: Help agents understand what's happening
- **Disable animations**: Remove spinners and progress bars that don't render well
- **Modify error messages**: Provide more structured errors for agent parsing

## License

ISC
