# Vibeguard AGENTS Template For Codex

Use the `vibeguard` MCP server on every new project and on every meaningful implementation change.

Project-start trigger rule:
- If the user asks to build, create, make, scaffold, start, generate, or initialize a website, app, tool, dashboard, SaaS, API, backend, frontend, fullstack app, mobile app, bot, script, automation, extension, or project, call `initialize_project` before writing product code.

Initialization rule:
- Call `initialize_project` with `projectPath`, `projectName`, `description`, and `stack` before creating implementation files for a new project.
- After `initialize_project`, read and follow `ARCHITECTURE.md`.

Security review rule:
- After every code, config, auth, API, schema, infrastructure, data-model, or dependency change, call `security_review_change`.
- Pass the exact diff when available. Otherwise pass a faithful `changeSummary` and enough `projectContext` to evaluate risk.
- Do not mark work complete while any Critical or High finding remains open.

User-invoked security rule:
- If the user says `security`, `run security`, `review security`, `security check`, or similar, call `security_review_change` immediately for the latest change scope.

Truthfulness rule:
- Do not claim the workflow is automatic unless the client is actually configured to call these tools.
