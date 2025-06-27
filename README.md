# UADO

**Universal AI Development Orchestrator** – a CLI tool that syncs AI coding agents with your editor's compile and lint cycle, preventing recursive prompt loops.

## Installation

```bash
npm install -g uado
```

## Usage

### CLI

Run a prompt through the orchestrator or open the live dashboard:

```bash
uado prompt "your prompt"
uado dashboard
```

### Configuration

Create a `.uadorc.json` in your project root to tweak cooldown behavior:

```json
{
  "cooldownDurationMs": 90000,
  "stabilityWindowMs": 5000,
  "logLevel": "info"
}
```

- `cooldownDurationMs` – maximum time to stay in cooldown after a file change
- `stabilityWindowMs` – how long to wait for file stability after the LSP signals readiness
- `logLevel` – `info`, `debug`, or `silent`

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

