# Vibeguard — Architecture

## Product intent

An stdio MCP server that supplies project lifecycle, security review, and database audit instructions to AI coding clients. It also keeps advisory review metadata in each initialized project.

## Stack

- Node.js 18 or newer; JavaScript ES modules
- `@modelcontextprotocol/sdk` 1.x
- Zod 4 for MCP argument validation
- Node filesystem APIs for project documents and lifecycle state

## Boundaries and data flow

1. The MCP client sends tool arguments over stdio.
2. The server validates argument shape and resolves the requested project path.
3. The server returns prompt text to the client and creates or updates files under the project directory.
4. The client model inspects project content and decides what response or remediation to produce.

The server does not read project source files, run security scanners, watch file changes, or enforce the client's release decision. Prompts are part of the public package and are visible to the client and model.

## Filesystem boundary

- `projectPath` must be an absolute path to an existing directory within `VIBEGUARD_ALLOWED_ROOTS`; if unset, the process working directory is the only allowed root.
- Filesystem root paths are rejected.
- `.vibecode-security` and `state.json` must not be symlinks.
- Initialization creates files exclusively and preserves existing documents and review history.
- Review state is replaced atomically; in-process concurrent appends are serialized.
- The same OS user can still edit the project and its state. Downstream CI and branch protection enforce release policy.

## Data classification

Project names, summaries, findings, and optional notes may be recorded in `.vibecode-security/state.json`. Do not put secrets or full source diffs in findings or notes. Prompt inputs are sent back to the MCP client as tool output.

## Security architecture

- Validate tool argument sizes with Zod.
- Constrain project paths to canonical allowed roots.
- Reject state symlinks and refuse initialization overwrites.
- Keep status `PENDING_AGENT_REVIEW` unless the client supplies an open Critical/High finding, in which case record `BLOCK`; neither status proves an audit was performed.
- Treat repository content and supplied context as untrusted evidence in returned prompts.
