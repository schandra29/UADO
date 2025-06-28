# UADO

**Universal AI Development Orchestrator** – a CLI tool that synchronizes AI coding agents with your editor's compile and lint cycle.

## Features
- Prompt handling with cooldown prediction
- Paste and queue logging to `.uado/`
- Lint and TypeScript review logs in `.uado/review.log.json`
- `history` command for browsing past prompts
- `replay` command for restoring queued files
- Built‑in test framework
- `--simulate-queue` option for prompt testing
- Styled CLI output with optional emoji icons
- Pattern-aware prompt injection from `.uado/patterns.json`
- Automatic pattern logging when prompts succeed
- `star` command to bookmark past prompts
- `starred` list with `suggest` and `diff`
- Interactive `guide` command for beginner workflows
- Beginner guardrails for common project pitfalls
- Progressive difficulty levels with `uado level` and `--difficulty`

## Installation
```bash
npm install -g uado
```

## CLI Usage
```bash
# Quick workflow
uado guide utility            # learn the basics
uado prompt --tag demo "Make a button"
# review snapshot under .uado/snapshots/
uado replay 1                 # restore the first queue entry
uado star 1                   # bookmark entry #1
uado starred                  # list saved examples
uado suggest "new prompt"     # show similar stars
uado diff 1                   # diff latest with star #1

# Other commands
uado prompt --simulate-queue "test"
uado prompt --difficulty intermediate "Add docs"
uado dashboard
uado history
uado level advanced
uado test run
uado status
uado config
uado version
```

Add `--no-emoji` to disable icons if your terminal does not display them correctly. `--dry-run` and `--no-emoji` are internal flags for debugging and may change without notice.

## Configuration
Create a `.uadorc.json` in your project root to tweak cooldown behavior and set execution mode:
```json
{
  "cooldownDurationMs": 90000,
  "stabilityWindowMs": 5000,
  "cooldownAfterWrite": true,
  "writeCooldownMs": 60000,
  "logLevel": "info",
  "mode": "manual"
}
```
- `cooldownDurationMs` – maximum time to stay in cooldown after a file change
- `stabilityWindowMs` – how long to wait for file stability after the LSP signals readiness
- `cooldownAfterWrite` – enable a delay after writing files
- `writeCooldownMs` – how long to wait when `cooldownAfterWrite` is enabled (default 60000). After each write UADO displays a cooldown banner so lint and TypeScript can stabilize.
- `logLevel` – `info`, `debug`, or `silent`
- `mode` – `manual` for copy/paste mode (used by default if no config file is found)
- `enablePatternInjection` – set to `true` to inject examples from `.uado/patterns.json` and automatically log successful prompts

## Pattern-Aware Prompt Injection
Store successful examples in `.uado/patterns.json`:
```json
[
  {
    "prompt": "Create a header component",
    "file": "src/Header.tsx",
    "outputSnippet": "<header>...</header>",
    "difficulty": "beginner"
  }
]
```
Enable the feature in `.uadorc.json` by setting `"enablePatternInjection": true`.
When enabled, `uado prompt` will prepend the most similar examples to your prompt.
Use `uado patterns suggest "your prompt"` to view the top matches without generating code.

When pattern injection is enabled, every successful manual paste automatically adds an entry to `.uado/patterns.json`. Use `--tag <label>` with `uado prompt` to categorize the pattern. Each entry stores the difficulty level so suggestions match your experience. Over time this file will grow with examples grouped by tag, improving future suggestions.

To review what a stored pattern does, run:

```bash
uado patterns explain react-component
```

Sample output:

```text
[react-component] (beginner)
Prompt: Create a header component
Snippet: <header>...</header>
Explanation: This pattern builds a React component based on the prompt "Create a header component".
```

## Guardrails
UADO warns about common project pitfalls before writing generated code:

- Warns if `package.json` is missing or malformed.
- Alerts when new packages are detected but `node_modules` is absent.
- Detects unresolved Git merge conflicts.
- Warns when Git has untracked or unstaged files.

Pass `--no-guardrails` to bypass these checks if needed.

## Power User Tips
- Use `--dry-run` with `prompt` or `replay` to preview file writes without touching disk (internal flag).
- Guardrails can be disabled with `--no-guardrails` when you know it's safe.
- Generated snapshots live under `.uado/snapshots/` and include the prompt hash in their name.
- Starred examples are stored in `.uado/starred.json` and follow `prompt.schema.json`.

## Project Structure
```
cli/       # command implementations
core/      # cooldown engine and watchers
utils/     # helper utilities
types/     # ambient TypeScript types
```

More details can be found in [detailed_instructions.md](./detailed_instructions.md).

### In your own code
Use the orchestrator programmatically:
```ts
import { createCooldownEngine } from 'uado/dist/core/cooldown-engine';
import { createOrchestrator } from 'uado/dist/core/orchestrator';

const cooldown = createCooldownEngine();
const orchestrator = createOrchestrator({ cooldownEmitter: cooldown });

await orchestrator.wrapPrompt(() => yourFunc());
```

## Contributing
- **Build**: `npm run build`
- **Link locally**: `npm link` (after building)
- **Run in dev mode**: `node dist/index.js` or use the linked `uado` command

## 🔐 Security & Privacy
UADO is fully local-first. It does **not** send prompts, logs, or metadata to any external server.
All orchestration happens on your machine using local file watchers and diagnostic signals.
See [`SECURITY.md`](./SECURITY.md) for more details.
