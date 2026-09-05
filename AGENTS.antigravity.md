# Vibeguard AGENTS Template For Antigravity

Use the `vibeguard` MCP server as part of the default project workflow.

Project-start trigger rule:
- If the user asks to build, create, make, scaffold, start, generate, or initialize a website, app, tool, dashboard, SaaS, API, backend, frontend, fullstack app, mobile app, bot, script, automation, extension, or project, call `initialize_project` before writing product code.

Initialization rule:
- Call `initialize_project` with `projectPath`, `projectName`, `description`, and `stack` before creating implementation files for a new project.
- After `initialize_project`, read and follow `ARCHITECTURE.md`.

Security review rule:
- After every code, config, auth, API, schema, infrastructure, data-model, or dependency change, call `security_review_change`.
- Pass the exact diff when available. Otherwise pass a faithful `changeSummary` and enough `projectContext` to evaluate risk.
- Do not mark work complete while any Critical or High finding remains open.

Hard sec audit rule:
- Only call `hard_sec_audit` when the user explicitly says `hard sec audit`.
- Treat `hard_sec_audit` as a release-blocking project-wide audit, not a quick change review.

Hard DB audit rule:
- Only call `hard_db_audit` when the user explicitly says `hard db audit`.
- Treat `hard_db_audit` as a release-blocking database integrity audit, not a quick change review.

User-invoked security rule:
- If the user says `security`, `run security`, `review security`, `security check`, or similar, call `security_review_change` immediately for the latest change scope.

Truthfulness rule:
- Do not claim the workflow is automatic unless the client is actually configured to call these tools.
