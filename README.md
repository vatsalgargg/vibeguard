# Vibeguard

Ship vibe-coded projects with architecture first and security every time.

`Vibeguard` is an MCP server for AI coding workflows. It initializes project architecture before implementation starts, then injects a security review gate after each meaningful change.

It is built for tools like Codex and Antigravity that support MCP servers.

## What it does

- Creates `ARCHITECTURE.md` at project start
- Stores lifecycle state in `.vibecode-security/state.json`
- Forces security review prompts after code, config, auth, API, schema, infra, or dependency changes
- Applies project-wide checks for secrets, input validation, IDOR/ownership enforcement, deployment hardening, and authentication security
- Provides a `hard_sec_audit` command for full project release-blocking security audits
- Ships with ready-to-paste agent rules for Codex and Antigravity

## Why it exists

Most vibe-coded projects move straight from prompt to code. That is where messy architecture, missing documentation, leaked secrets, weak auth, and broken access control show up later.

Vibeguard changes that flow:

1. Initialize the project first
2. Generate the architecture first
3. Build the code
4. Run security review before claiming the change is done

## How it works

Vibeguard exposes three MCP tools:

1. `initialize_project`
2. `security_review_change`
3. `hard_sec_audit`

Typical lifecycle:

1. User says: `build a SaaS dashboard`
2. Agent calls `initialize_project`
3. Vibeguard creates `ARCHITECTURE.md`
4. Agent writes code
5. After changes, agent calls `security_review_change`
6. Vibeguard returns a security gate prompt and records review state
7. User can explicitly say `hard sec audit` to trigger a stricter full-project audit

## Important limitation

Vibeguard is not a filesystem watcher.

It does not silently intercept every edit made by every AI editor. MCP is client-to-server RPC. Your client or agent must be configured to call `initialize_project` and `security_review_change` at the right times.

That means:

- the MCP server provides the workflow
- the client or agent provides the enforcement

If you claim "automatic security on every change" without client-side rules or hooks, that is misleading.

## Install

Run directly with `npx`:

```powershell
npx -y @vatsalgarg/vibeguard
```

Or install globally:

```powershell
npm install -g @vatsalgarg/vibeguard
vibeguard
```

## MCP config

Recommended portable config:

```json
{
  "mcpServers": {
    "vibeguard": {
      "command": "npx",
      "args": ["-y", "@vatsalgarg/vibeguard"]
    }
  }
}
```

If installed globally:

```json
{
  "mcpServers": {
    "vibeguard": {
      "command": "vibeguard"
    }
  }
}
```

## Codex setup

Add `vibeguard` to Codex MCP config, then paste the Codex agent rules from:

- `AGENTS.codex.md`

Codex local config example:

```toml
[mcp_servers.vibeguard]
command = "npx"
args = ["-y", "@vatsalgarg/vibeguard"]
startup_timeout_sec = 20
tool_timeout_sec = 120
```

## Antigravity setup

Add `vibeguard` to Antigravity `mcp_config.json`, then paste the Antigravity agent rules from:

- `AGENTS.antigravity.md`

Antigravity config example:

```json
{
  "mcpServers": {
    "vibeguard": {
      "command": "npx",
      "args": ["-y", "@vatsalgarg/vibeguard"]
    }
  }
}
```

## Included security directives

Every `security_review_change` response includes these review requirements:

1. Secure deployment and monitoring
2. Secret and credential scanning
3. Input validation and sanitization
4. Ownership checks and IDOR prevention
5. Authentication hardening

## Hard Sec Audit

Use `hard_sec_audit` when you want the agent to audit the whole project, not just the latest change.

Exact trigger phrase:

- `hard sec audit`

Do not call `hard_sec_audit` for inferred, similar, or automatic security requests.
- `audit the whole project`

The hard sec audit uses the same security directives, but asks the agent to trace data flow, verify auth and ownership controls, inspect secrets and deployment posture, look for compound failures, and return a release-blocking `BLOCK` or `PASS` verdict.

## Trigger rules

The included trigger spec treats these as project-start signals:

- `build`
- `create`
- `make`
- `scaffold`
- `start`
- `generate`
- `initialize`

When combined with requests like:

- `website`
- `app`
- `tool`
- `dashboard`
- `SaaS`
- `API`
- `backend`
- `frontend`
- `fullstack app`
- `mobile app`
- `bot`
- `automation`
- `extension`

That trigger behavior is documented in:

- `TRIGGER_SPEC.md`

## Included files

- `AGENTS.codex.md`
- `AGENTS.antigravity.md`
- `TRIGGER_SPEC.md`

## Tool sequence

1. `initialize_project({ projectPath, projectName, description, stack })`
2. Build or modify the project
3. `security_review_change({ projectPath, changeSummary, diff, projectContext })`
4. `hard_sec_audit({ projectPath, projectContext, focus, files, diff })`
5. Fix Critical and High findings before completion

## Local development

```powershell
git clone https://github.com/vatsalgargg/vibeguard.git
cd vibeguard
npm install
npm start
```

For local development MCP config:

```json
{
  "mcpServers": {
    "vibeguard": {
      "command": "node",
      "args": ["C:/path/to/vibeguard/src/index.js"]
    }
  }
}
```

## Publish to npm

Login:

```powershell
npm login
```

Publish the first version:

```powershell
npm publish
```

Publish an update later:

```powershell
npm version patch
npm publish
```

## Repository

- GitHub: [vatsalgargg/vibeguard](https://github.com/vatsalgargg/vibeguard)
