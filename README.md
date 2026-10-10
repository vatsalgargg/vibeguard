# Vibeguard

Vibeguard is an MCP server that provides project lifecycle instructions to AI coding clients. It initializes a project document and records review metadata, then returns security or database audit prompts for the client to follow.

## What the tools do

The server exposes four MCP tools:

- `initialize_project` creates `ARCHITECTURE.md` and `.vibecode-security/state.json`. It refuses to overwrite either existing project documents or lifecycle state.
- `security_review_change` returns a change review prompt and records advisory review metadata.
- `hard_sec_audit` returns a whole-project security audit prompt.
- `hard_db_audit` returns a database integrity audit prompt.

The audit tools return instructions to the MCP client. They do not scan files, run a scanner, or independently decide whether a release can proceed. `hard sec audit` and `hard db audit` are user phrases that the supplied agent rules map to MCP tool calls; they are not terminal commands or standalone CLI modes.

## Security and enforcement limits

MCP is a request and response protocol. The server cannot observe arbitrary filesystem edits, force a client to call a tool, or stop a client from ignoring its response. Client-supplied findings are unverified, and lifecycle statuses are advisory. A downstream repository needs CI checks, branch protection, or another release control to enforce a security decision.

The prompts are embedded in the public source and npm package, and are returned to the MCP client and model. They cannot be kept secret in this design. Vibeguard tells the reviewing model to treat repository content and supplied diffs as untrusted evidence, but prompt-injection defenses cannot guarantee that a model will never follow hostile content.

The server limits writes to existing project directories inside `VIBEGUARD_ALLOWED_ROOTS`. Set it to one or more absolute directories separated by the platform path delimiter (`;` on Windows, `:` on macOS/Linux). When unset, the server working directory is the only allowed root. The target project must be inside an allowed root and cannot be a filesystem root. Vibeguard rejects a symlink used for its state directory or state file and writes review state through an atomic replacement.

Example Windows MCP configuration:

```json
{
  "mcpServers": {
    "vibeguard": {
      "command": "npx",
      "args": ["-y", "@vatsalgarg/vibeguard@latest"],
      "env": {
        "VIBEGUARD_ALLOWED_ROOTS": "C:\\Users\\you\\Documents\\Projects"
      }
    }
  }
}
```

Initialization only creates new files. If a generated document or lifecycle state already exists, move or back it up yourself and choose a new project directory; Vibeguard will not replace it or clear its review history.

## Install

Configure an MCP client to launch the package with `npx`:

```powershell
npx -y @vatsalgarg/vibeguard@latest
```

This starts the MCP server over standard input/output. Configure it in Codex, Antigravity, or another MCP client; launching it by double-clicking or from a short-lived external terminal will close when that terminal exits.

Codex configuration example:

```toml
[mcp_servers.vibeguard]
command = "npx"
args = ["-y", "@vatsalgarg/vibeguard@latest"]
startup_timeout_sec = 20
tool_timeout_sec = 120

[mcp_servers.vibeguard.env]
VIBEGUARD_ALLOWED_ROOTS = 'C:\Users\you\Documents\Projects'
```

Add the relevant agent rules from `AGENTS.codex.md` or `AGENTS.antigravity.md`. Restart the MCP client after changing its configuration.

## Workflow

1. Call `initialize_project` for a new project before implementation.
2. Read the created `ARCHITECTURE.md`.
3. After meaningful code, configuration, dependency, infrastructure, authentication, API, or data-model changes, call `security_review_change` with the diff or a faithful summary.
4. Call `hard_sec_audit` only when the user explicitly says `hard sec audit`.
5. Call `hard_db_audit` only when the user explicitly says `hard db audit`.
6. Resolve Critical and High findings before reporting the change complete. Add a downstream CI/release gate if the project needs an enforceable block.

## Development and checks

Requires Node.js 18 or newer.

```powershell
npm ci
npm test
npm audit
```

GitHub Actions runs the storage safety tests on supported Node.js versions and checks the dependency audit.

## Publish

After CI passes, increment the package version and publish from the package owner account:

```powershell
npm version patch
npm publish --access public
npm view @vatsalgarg/vibeguard version dist-tags.latest
```

Publishing sends the prompts and server code as a public npm package. Use npm's secure local authentication or trusted publishing; never paste an npm token into chat or commit it.

## Repository

- GitHub: [vatsalgargg/vibeguard](https://github.com/vatsalgargg/vibeguard)
- npm: [@vatsalgarg/vibeguard](https://www.npmjs.com/package/@vatsalgarg/vibeguard)
