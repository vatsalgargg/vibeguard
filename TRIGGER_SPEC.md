# Vibeguard Trigger Spec

This file defines when the client should call `initialize_project` and when it should call `security_review_change`.

## Trigger `initialize_project`

Call `initialize_project` before product code is written when the user intent matches:

- action words: `build`, `create`, `make`, `scaffold`, `start`, `generate`, `initialize`
- project nouns: `website`, `app`, `tool`, `project`, `dashboard`, `SaaS`, `API`, `backend`, `frontend`, `fullstack app`, `mobile app`, `bot`, `script`, `automation`, `extension`

Examples:

- `build me a website`
- `create a SaaS dashboard`
- `make an internal tool`
- `start a fullstack app`
- `generate a landing page`

Interpretation rule:
- If an action word and project noun clearly indicate a new software project, call `initialize_project` first.

## Trigger `security_review_change`

Call `security_review_change` after:

- code changes
- config changes
- auth changes
- API changes
- schema or data-model changes
- infrastructure changes
- dependency changes

Manual user triggers:

- `security`
- `run security`
- `review security`
- `security check`
- `audit this change`

## Trigger `hard_sec_audit`

Call `hard_sec_audit` for project-wide release-blocking audit requests:

- `hard sec audit`
- `hard audit`
- `deep security audit`
- `final security audit`
- `release audit`
- `full security review`
- `audit the whole project`

Interpretation rule:
- Use `hard_sec_audit` for whole-project security review.
- Use `security_review_change` for the latest change scope.

## Important limitation

These are agent-side or client-side triggers. The MCP server itself does not watch the filesystem and does not self-trigger.
