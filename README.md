# Vibeguard

An MCP server that forces a project bootstrap and supplies a security gate prompt after each reported change.

## What it actually guarantees

It creates `PRD.md`, `ARCHITECTURE.md`, `RULES.md`, `PHASES.md`, and `DESIGN.md` when `initialize_project` is called. It refuses a review unless the project was initialized, and records each review in `.vibecode-security/state.json`.

It **cannot** silently watch every filesystem edit made by every AI editor. MCP is client-to-server RPC, not a universal write hook. Your agent must be instructed to call `initialize_project` before work and `security_review_change` after each change; for hard enforcement, add the same call to your editor/agent's post-edit or pre-commit hook.

Ready-to-use trigger and agent templates are included:

- `TRIGGER_SPEC.md`
- `AGENTS.codex.md`
- `AGENTS.antigravity.md`

## Included security directives

Every `security_review_change` response now includes the five supplied directives: secure deployment and monitoring, project-wide secret scanning, input validation/sanitization, API/database ownership enforcement against IDOR, and authentication hardening.

## Install and run

```powershell
cd C:\path\to\vibeguard
npm install
npm start
```

Add this to the MCP client configuration (adjust the absolute path):

```json
{
  "mcpServers": {
    "vibecode-security": {
      "command": "node",
      "args": ["C:/path/to/vibeguard/src/index.js"]
    }
  }
}
```

Then load the `vibecode-security://lifecycle` resource into the coding agent's permanent instructions, or paste its content into the agent rule set. That step is what makes the tools run in the intended order.

For faster setup, you can also paste one of the included agent templates into your client's `AGENTS.md` or system instruction area.

## Tool sequence

1. `initialize_project({ projectPath, projectName, description, stack })`
2. Build or modify code.
3. `security_review_change({ projectPath, changeSummary, diff, projectContext })`
4. Address Critical/High findings before proceeding.
