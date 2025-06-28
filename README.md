# UADO

**Universal AI Development Orchestrator** – a CLI tool that synchronizes AI coding agents with your editor's compile and lint cycle.

## Features
- Prompt handling with cooldown prediction
- Paste and queue logging to `.uado/`
- `history` command for browsing past prompts
- `replay` command for restoring queued files
- Built‑in test framework
- `--simulate-queue` option for prompt testing
- Styled CLI output with optional emoji icons
- Pattern-aware prompt injection from `.uado/patterns.json`
- Automatic pattern logging when prompts succeed
- Interactive `guide` command for beginner workflows

## Installation
```bash
npm install -g uado
```

## CLI Usage
```bash
# Send a prompt
uado prompt "your prompt"
# Tag the example for future suggestions
uado prompt --tag react-component "your prompt"

# Generate fake log entries
uado prompt --simulate-queue "test"

# View live system dashboard
uado dashboard

# Show paste history
uado history

# Start an interactive guide
uado guide utility
# Supported scenarios: `utility`, `debug`, `refactor`

# Replay a queue entry
uado replay <index>

# Run regression tests
uado test run
```

Add `--no-emoji` to disable icons if your terminal does not display them correctly.

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
- `writeCooldownMs` – how long to wait when `cooldownAfterWrite` is enabled (default 60000)
- `logLevel` – `info`, `debug`, or `silent`
- `mode` – `manual` for copy/paste mode (used by default if no config file is found)
- `enablePatternInjection` – set to `true` to inject examples from `.uado/patterns.json` and automatically log successful prompts

## Pattern-Aware Prompt Injection
Store successful examples in `.uado/patterns.json`:
```json
[
  { "prompt": "Create a header component", "file": "src/Header.tsx", "outputSnippet": "<header>...</header>" }
]
```
Enable the feature in `.uadorc.json` by setting `"enablePatternInjection": true`.
When enabled, `uado prompt` will prepend the most similar examples to your prompt.
Use `uado patterns suggest "your prompt"` to view the top matches without generating code.

When pattern injection is enabled, every successful manual paste automatically adds an entry to `.uado/patterns.json`. Use `--tag <label>` with `uado prompt` to categorize the pattern. Over time this file will grow with examples grouped by tag, improving future suggestions.

To review what a stored pattern does, run:

```bash
uado patterns explain react-component
```

Sample output:

```text
[react-component]
Prompt: Create a header component
Snippet: <header>...</header>
Explanation: This pattern builds a React component based on the prompt "Create a header component".
```

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
