# Detailed Instructions

This document describes how the UADO CLI integrates with your development workflow. It outlines the cooldown engine, queue logging format, and tips for customizing prompts.  
For a quick overview see the README.

## Cooldown and Prompt Flow
UADO monitors file changes and editor diagnostics to decide when a prompt can safely run without causing recursive fix loops. The `cooldown-engine` module emits events that the orchestrator listens to before executing prompts.

## Logging Format
Paste operations are written to `.uado/paste.log.json` and batched queue entries are stored in `.uado/queue.log.json`. Each log record includes timestamps, file paths, and a content hash for later replay.

## Tips
- Use `uado prompt --simulate-queue` to quickly generate log entries.
- Run `uado test run` to execute the included CLI regression tests.

