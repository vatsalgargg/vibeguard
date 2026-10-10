# Vibeguard

Vibeguard is a Model Context Protocol (MCP) server for AI coding clients. It creates a small project architecture document, records review metadata, and supplies prompts for security and database audits.

## What it can and cannot enforce

Vibeguard returns instructions to the MCP client and model. It does not scan a repository, run a security scanner, watch for file changes, or independently approve a release. A client can skip a tool call or ignore its response. Use CI checks and protected branches when a release must be blocked by policy.

The prompt text is included in this public repository and npm package, and is sent to the MCP client. It is not secret. Project files, diffs, context, and findings are treated as untrusted evidence in the returned prompts, but prompt-injection defenses cannot guarantee model behavior.

The server restricts project writes to existing directories within `VIBEGUARD_ALLOWED_ROOTS`. If unset, only the server's working directory is allowed. It rejects filesystem roots and symlinks for its state directory and state file. Initialization refuses to overwrite existing files; review history is stored in `.vibecode-security/state.json` using atomic file replacement.

## Install and configure

Vibeguard runs over standard input/output and must be started by an MCP client. There is no terminal command such as `vibeguard hard sec audit`; the phrases `hard sec audit` and `hard db audit` are client-side triggers for MCP tool calls.

Node.js 18 or newer is required. To try the latest published release from a terminal:

```powershell
npx -y @vatsalgarg/vibeguard@latest
```

That command starts the MCP server and waits for an MCP client on standard input/output. Do not double-click it or launch it from a terminal window that closes immediately.

### Codex configuration

Add this to your Codex MCP configuration and replace the example path with a directory that contains your projects:

```toml
[mcp_servers.vibeguard]
command = "npx"
args = ["-y", "@vatsalgarg/vibeguard@latest"]
startup_timeout_sec = 20
tool_timeout_sec = 120

[mcp_servers.vibeguard.env]
VIBEGUARD_ALLOWED_ROOTS = 'C:\Users\you\Documents\Projects'
```

On Windows, separate multiple allowed roots with `;`. On macOS and Linux, use `:`. Restart the MCP client after changing the configuration and confirm that it lists the Vibeguard tools.

Add the client-specific workflow rules from [`AGENTS.codex.md`](AGENTS.codex.md) or [`AGENTS.antigravity.md`](AGENTS.antigravity.md). [`TRIGGER_SPEC.md`](TRIGGER_SPEC.md) documents the phrases that should trigger tool calls.

## MCP tools

All four tools require `projectPath`, an absolute path inside an allowed root.

| Tool | Required arguments | Optional arguments | Purpose |
| --- | --- | --- | --- |
| `initialize_project` | `projectPath`, `projectName`, `description` | `stack` | Creates `ARCHITECTURE.md` and `.vibecode-security/state.json` in an existing project. Call before creating a new project. |
| `security_review_change` | `projectPath`, `changeSummary` | `diff`, `projectContext`, `findings` | Returns change-review instructions and records the supplied review metadata. |
| `hard_sec_audit` | `projectPath` | `projectContext`, `focus`, `files`, `diff`, `findings` | Returns whole-project security audit instructions when explicitly requested. |
| `hard_db_audit` | `projectPath` | `projectContext`, `focus`, `files`, `diff`, `findings` | Returns database integrity audit instructions when explicitly requested. |

The audit and review tool names are MCP tool names, not shell commands. A client may map the exact user phrases `hard sec audit` and `hard db audit` to their matching tools. `initialize_project` and `security_review_change` are called by the client according to the supplied workflow rules.

For `security_review_change`, `diff` is limited to 200,000 characters and `projectContext` to 40,000. Audit context, `files`, and `focus` are also bounded. Optional `findings` entries use:

```json
{
  "severity": "critical | high | medium | low",
  "title": "Short finding title",
  "status": "open | fixed | accepted_risk",
  "note": "Optional explanation"
}
```

Finding severity and status are client-supplied and unverified. The server records metadata, not proof that a scan or remediation happened. It reports `BLOCK` only when submitted findings include an open Critical or High issue; otherwise the lifecycle status remains `PENDING_AGENT_REVIEW`, not an independent `PASS`.

The server also exposes the read-only resource `vibecode-security://lifecycle` with general workflow instructions.

## Recommended workflow

1. For a new project, call `initialize_project` with its absolute path, name, description, and stack before writing product code.
2. Read the generated `ARCHITECTURE.md` and follow the project's workflow rules.
3. After meaningful code, configuration, dependency, infrastructure, authentication, API, schema, or data-model changes, call `security_review_change` with the diff or a faithful summary.
4. Call `hard_sec_audit` only when the user explicitly requests `hard sec audit`.
5. Call `hard_db_audit` only when the user explicitly requests `hard db audit`.
6. Resolve verified Critical and High findings before reporting the work complete. Add downstream CI or branch protection for an enforceable release gate.

If an initialization file already exists, Vibeguard stops instead of replacing it or clearing review history. Back up or move existing files yourself before choosing how to initialize that project.

## Development and release checks

```powershell
npm ci
npm test
npm audit
npm view @vatsalgarg/vibeguard version dist-tags.latest
```

GitHub Actions tests supported Node.js releases on Ubuntu and Windows and runs `npm audit`. Before publishing, require the CI checks to pass, update the package version, and publish from the package owner's npm account:

```powershell
npm version patch
npm publish --access public
npm view @vatsalgarg/vibeguard version dist-tags.latest
```

Publishing makes the server source and prompts public. Use secure local npm authentication or trusted publishing. Never paste an npm token into chat or commit it.

## Links

- GitHub: [vatsalgargg/vibeguard](https://github.com/vatsalgargg/vibeguard)
- npm: [@vatsalgarg/vibeguard](https://www.npmjs.com/package/@vatsalgarg/vibeguard)
