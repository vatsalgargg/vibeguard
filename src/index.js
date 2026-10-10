#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { hardAuditPrompt, hardDbAuditPrompt, lifecycleInstructions, securityPrompt } from "./prompts.js";
import { projectDocuments } from "./templates.js";
import { appendReview, createInitialFiles, resolveProjectRoot } from "./storage.js";

const server = new Server({ name: "vibeguard", version: "0.1.5" }, { capabilities: { tools: {}, resources: {} } });
const projectPathSchema = z.string().min(1).max(4096);
const findingsSchema = z.array(z.object({
  severity: z.enum(["critical", "high", "medium", "low"]),
  title: z.string().max(500),
  status: z.enum(["open", "fixed", "accepted_risk"]).default("open"),
  note: z.string().max(8000).optional()
})).max(200).optional();
const initSchema = z.object({
  projectPath: projectPathSchema,
  projectName: z.string().min(1).max(200),
  description: z.string().min(1).max(4000),
  stack: z.string().max(1000).optional().default("")
});
const reviewSchema = z.object({
  projectPath: projectPathSchema,
  changeSummary: z.string().min(1).max(4000),
  diff: z.string().max(200_000).optional().default(""),
  projectContext: z.string().max(40_000).optional().default(""),
  findings: findingsSchema
});
const hardAuditSchema = z.object({
  projectPath: projectPathSchema,
  projectContext: z.string().max(40_000).optional().default(""),
  focus: z.string().max(4000).optional().default(""),
  files: z.string().max(40_000).optional().default(""),
  diff: z.string().max(200_000).optional().default(""),
  findings: findingsSchema
});
const statusFor = (findings = []) => findings.some((finding) =>
  ["critical", "high"].includes(finding.severity) && finding.status === "open"
) ? "BLOCK" : "PENDING_AGENT_REVIEW";
const text = (value) => ({ content: [{ type: "text", text: value }] });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [
  { name: "initialize_project", description: "Creates ARCHITECTURE.md and lifecycle state in an existing project directory within VIBEGUARD_ALLOWED_ROOTS (defaults to the server working directory). Refuses to overwrite existing files.", inputSchema: { type: "object", properties: { projectPath: { type: "string", description: "Absolute path inside an allowed root" }, projectName: { type: "string" }, description: { type: "string" }, stack: { type: "string" } }, required: ["projectPath", "projectName", "description"] } },
  { name: "security_review_change", description: "Returns review instructions to the MCP client and records pending metadata. The server does not inspect files or enforce the client's verdict; client-supplied findings are unverified.", inputSchema: { type: "object", properties: { projectPath: { type: "string", description: "Absolute path inside an allowed root" }, changeSummary: { type: "string" }, diff: { type: "string" }, projectContext: { type: "string" }, findings: { type: "array" } }, required: ["projectPath", "changeSummary"] } },
  { name: "hard_sec_audit", description: "Returns whole-project audit instructions to the MCP client and records pending metadata. It does not scan files or independently block releases. Use only when the user explicitly says: hard sec audit.", inputSchema: { type: "object", properties: { projectPath: { type: "string", description: "Absolute path inside an allowed root" }, projectContext: { type: "string" }, focus: { type: "string" }, files: { type: "string" }, diff: { type: "string" }, findings: { type: "array" } }, required: ["projectPath"] } },
  { name: "hard_db_audit", description: "Returns database integrity audit instructions to the MCP client and records pending metadata. It does not scan files or independently block releases. Use only when the user explicitly says: hard db audit.", inputSchema: { type: "object", properties: { projectPath: { type: "string", description: "Absolute path inside an allowed root" }, projectContext: { type: "string" }, focus: { type: "string" }, files: { type: "string" }, diff: { type: "string" }, findings: { type: "array" } }, required: ["projectPath"] } }
] }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "initialize_project") {
    const input = initSchema.parse(request.params.arguments);
    const root = await resolveProjectRoot(input.projectPath);
    const docs = projectDocuments(input);
    await createInitialFiles(root, docs, {
      version: 1,
      initializedAt: new Date().toISOString(),
      projectName: input.projectName,
      reviews: []
    });
    return text(`Project initialized. Created: ${Object.keys(docs).join(", ")}.\n\n${lifecycleInstructions}`);
  }

  if (request.params.name === "security_review_change") {
    const input = reviewSchema.parse(request.params.arguments);
    const root = await resolveProjectRoot(input.projectPath);
    const state = await appendReview(root, {
      at: new Date().toISOString(),
      summary: input.changeSummary,
      findings: input.findings || [],
      status: statusFor(input.findings)
    });
    return text(`${securityPrompt(input)}\n\nLifecycle status: ${state.reviews.at(-1).status}.`);
  }

  if (request.params.name === "hard_sec_audit") {
    const input = hardAuditSchema.parse(request.params.arguments);
    const root = await resolveProjectRoot(input.projectPath);
    const state = await appendReview(root, {
      at: new Date().toISOString(),
      summary: `Hard audit: ${input.focus || "Full application security audit"}`,
      findings: input.findings || [],
      status: statusFor(input.findings)
    });
    return text(`${hardAuditPrompt(input)}\n\nLifecycle status: ${state.reviews.at(-1).status}.`);
  }

  if (request.params.name === "hard_db_audit") {
    const input = hardAuditSchema.parse(request.params.arguments);
    const root = await resolveProjectRoot(input.projectPath);
    const state = await appendReview(root, {
      at: new Date().toISOString(),
      summary: `Hard DB audit: ${input.focus || "Full database security audit"}`,
      findings: input.findings || [],
      status: statusFor(input.findings)
    });
    return text(`${hardDbAuditPrompt(input)}\n\nLifecycle status: ${state.reviews.at(-1).status}.`);
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: [{ uri: "vibecode-security://lifecycle", name: "Vibecode Security Lifecycle", mimeType: "text/plain", description: "Instructions an MCP client may load into its coding-agent workflow." }] }));
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri !== "vibecode-security://lifecycle") throw new Error("Unknown resource.");
  return { contents: [{ uri: request.params.uri, mimeType: "text/plain", text: lifecycleInstructions }] };
});

await server.connect(new StdioServerTransport());
