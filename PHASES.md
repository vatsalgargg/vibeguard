# Delivery Phases

## 1. MCP workflow

Maintain the four tools and accurate client-side lifecycle instructions.

## 2. Filesystem safety

Validate allowed roots, avoid symlink state paths, preserve existing files, and update state atomically.

## 3. Prompt safety and transparency

Treat supplied code/context as untrusted evidence and document that prompts are visible and cannot enforce a client decision.

## 4. Release checks

Run the storage regression suite across supported Node versions and operating systems. Require a clean npm audit before release. Add repository-specific CI or branch protection where release blocking is required.
