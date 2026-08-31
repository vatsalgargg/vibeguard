export function projectDocuments({ projectName, description, stack }) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    "ARCHITECTURE.md": `# ${projectName} — Architecture\n\nCreated: ${today}\n\n## Product intent\n${description}\n\n## Stack\n${stack || "To be decided"}\n\n## System boundaries\n- Client, API, data stores, external services, and trust boundaries must be documented here.\n\n## Data classification\n- Public, internal, confidential, restricted.\n- Identify personal data, secrets, and retention/deletion requirements.\n\n## Security architecture\n- Authentication, authorization, session handling, input validation, encryption, audit logging, and incident paths.\n\n## Delivery notes\n- Keep scope, phases, design constraints, and implementation rules inside this architecture document unless the project explicitly needs separate files.\n- Call security_review_change after every meaningful change before declaring completion.\n`
  };
}
