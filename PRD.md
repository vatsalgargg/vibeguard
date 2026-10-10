# Vibeguard — Product Requirements

## Problem

AI coding clients can miss project planning and security review steps. Vibeguard gives supported clients reusable prompts and a small advisory lifecycle record.

## Users and jobs

- Developers configure an MCP client and want consistent project initialization and review prompts.
- The client model reads project files and performs the review; Vibeguard does not scan those files itself.

## Scope

- Provide `initialize_project`, `security_review_change`, `hard_sec_audit`, and `hard_db_audit` MCP tools.
- Safely create project documents and preserve review history.
- Constrain writes to explicitly allowed project roots.
- Document prompt visibility and client-side enforcement limits.

## Acceptance criteria

- Inputs are schema-validated and size-bounded.
- Paths outside allowed roots are rejected.
- Re-initialization never overwrites documents or clears prior reviews.
- Concurrent review calls within one server process preserve all records.
- Review and audit prompts treat supplied repository content as untrusted evidence.
- Documentation does not claim secret prompts, autonomous scanning, or guaranteed release blocking.
- CI runs storage regression tests on supported Node versions and checks the lockfile audit.
