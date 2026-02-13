---
"is-agentic-tui": minor
---

Add caching and `force` option for detection functions

Detection results are now memoized at module level. This improves performance for repeated calls, especially in the common case where code is not running in an agentic TUI.

**New features:**
- All detection functions (`isAgenticTui`, `whichAgenticTui`, `isSpecificAgenticTui`) now accept an optional `options` parameter
- Pass `{ force: true }` to bypass the cache and perform a fresh evaluation
- New `clearCache()` function exported for testing scenarios
- New `DetectionOptions` type exported

**Performance optimization:**
- Process tree walking (used for GitHub Copilot CLI and Kiro CLI detection) now only runs when `Q_TERM` environment variable is set
- This reduces latency for the common non-agentic-TUI case by avoiding expensive `ps` command spawning

**Example:**
```ts
import { whichAgenticTui } from 'is-agentic-tui';

// First call performs detection and caches result
const result = whichAgenticTui();

// Subsequent calls return cached result
const cached = whichAgenticTui();

// Force fresh evaluation
const fresh = whichAgenticTui({ force: true });
```
