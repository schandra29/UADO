# Security Manifest

UADO embraces a **local-first philosophy**. Everything it does happens on your machine so you remain in complete control.

## ❌ UADO never does
- Telemetry collection
- API calls
- Prompt uploads
- Shell command execution

## ✅ UADO does
- Watch your files locally via [chokidar](https://github.com/paulmillr/chokidar)
- Spawn `tsserver` for LSP signals
- Buffer AI prompts in memory only
- Log locally to your console

## Auditing the CLI
Review this repository or run the CLI while monitoring your network traffic. You should observe no outbound requests. Verbose logging can help trace every action.

For any questions or security concerns, reach out to the maintainer at <security@example.com>.

