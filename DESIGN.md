# Vibeguard — Interaction Design

Vibeguard is an MCP service, not an interactive terminal UI.

## Response principles

- Name the requested MCP tool and state its effect plainly.
- Distinguish a prompt returned to the client from work actually performed by the client.
- Show lifecycle status as advisory metadata.
- Explain path or overwrite errors without exposing environment secrets.
- Do not claim prompts are private or unbypassable.

## Client setup

Show a copyable MCP configuration with an explicit project-root allowlist. Explain that the server communicates over stdio and must be launched by an MCP client.
