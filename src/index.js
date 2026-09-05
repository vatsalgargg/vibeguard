#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hardAuditPrompt, lifecycleInstructions, securityPrompt } from "./prompts.js";
import { projectDocuments } from "./templates.js";

const server = new Server({ name: "vibeguard", version: "0.1.0" }, { capabilities: { tools: {}, resources: {} } });
const initSchema = z.object({ projectPath: z.string().min(1), projectName: z.string().min(1), description: z.string().min(1), stack: z.string().optional().default("") });
const reviewSchema = z.object({ projectPath: z.string().min(1), changeSummary: z.string().min(1), diff: z.string().optional().default(""), projectContext: z.string().optional().default(""), findings: z.array(z.object({ severity: z.enum(["critical", "high", "medium", "low"]), title: z.string(), status: z.enum(["open", "fixed", "accepted_risk"]).default("open"), note: z.string().optional() })).optional() });
const hardAuditSchema = z.object({ projectPath: z.string().min(1), projectContext: z.string().optional().default(""), focus: z.string().optional().default(""), files: z.string().optional().default(""), diff: z.string().optional().default(""), findings: z.array(z.object({ severity: z.enum(["critical", "high", "medium", "low"]), title: z.string(), status: z.enum(["open", "fixed", "accepted_risk"]).default("open"), note: z.string().optional() })).optional() });
const stateFile = (projectPath) => path.join(path.resolve(projectPath), ".vibecode-security", "state.json");
const text = (value) => ({ content: [{ type: "text", text: value }] });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [
  { name: "initialize_project", description: "MUST be called before implementation. Creates ARCHITECTURE.md plus lifecycle state.", inputSchema: { type: "object", properties: { projectPath: { type: "string" }, projectName: { type: "string" }, description: { type: "string" }, stack: { type: "string" } }, required: ["projectPath", "projectName", "description"] } },
  { name: "security_review_change", description: "MUST be called after every change. Returns the custom security gate prompt and records review metadata. Pass the exact diff when available.", inputSchema: { type: "object", properties: { projectPath: { type: "string" }, changeSummary: { type: "string" }, diff: { type: "string" }, projectContext: { type: "string" }, findings: { type: "array" } }, required: ["projectPath", "changeSummary"] } },
  { name: "hard_sec_audit", description: "Runs a strict project-wide security audit prompt using the custom security directives. Use when the user says hard sec audit, hard audit, deep security audit, final security audit, release audit, or full security review.", inputSchema: { type: "object", properties: { projectPath: { type: "string" }, projectContext: { type: "string" }, focus: { type: "string" }, files: { type: "string" }, diff: { type: "string" }, findings: { type: "array" } }, required: ["projectPath"] } }
] }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "initialize_project") {
    const input = initSchema.parse(request.params.arguments);
    const root = path.resolve(input.projectPath); const meta = path.join(root, ".vibecode-security");
    await mkdir(meta, { recursive: true });
    const docs = projectDocuments(input);
    for (const [name, content] of Object.entries(docs)) await writeFile(path.join(root, name), content, "utf8");
    const state = { version: 1, initializedAt: new Date().toISOString(), projectName: input.projectName, reviews: [] };
    await writeFile(stateFile(root), JSON.stringify(state, null, 2), "utf8");
    return text(`Project initialized. Created: ${Object.keys(docs).join(", ")}.\n\n${lifecycleInstructions}`);
  }
  if (request.params.name === "security_review_change") {
    const input = reviewSchema.parse(request.params.arguments); const file = stateFile(input.projectPath);
    let state; try { state = JSON.parse(await readFile(file, "utf8")); } catch { throw new Error("Project is not initialized. Call initialize_project first."); }
    state.reviews.push({ at: new Date().toISOString(), summary: input.changeSummary, findings: input.findings || [], status: input.findings?.some(f => ["critical", "high"].includes(f.severity) && f.status === "open") ? "BLOCK" : "PENDING_AGENT_REVIEW" });
    await writeFile(file, JSON.stringify(state, null, 2), "utf8");
    return text(`${securityPrompt(input)}\n\nLifecycle status: ${state.reviews.at(-1).status}.`);
  }
  if (request.params.name === "hard_sec_audit") {
    const input = hardAuditSchema.parse(request.params.arguments); const file = stateFile(input.projectPath);
    let state; try { state = JSON.parse(await readFile(file, "utf8")); } catch { throw new Error("Project is not initialized. Call initialize_project first."); }
    state.reviews.push({ at: new Date().toISOString(), summary: `Hard audit: ${input.focus || "Full application security audit"}`, findings: input.findings || [], status: input.findings?.some(f => ["critical", "high"].includes(f.severity) && f.status === "open") ? "BLOCK" : "PENDING_AGENT_REVIEW" });
    await writeFile(file, JSON.stringify(state, null, 2), "utf8");
    return text(`${hardAuditPrompt(input)}\n\nLifecycle status: ${state.reviews.at(-1).status}.`);
  }
  throw new Error(`Unknown tool: ${request.params.name}`);
});

server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: [{ uri: "vibecode-security://lifecycle", name: "Vibecode Security Lifecycle", mimeType: "text/plain", description: "Instructions an MCP client should load into its coding-agent workflow." }] }));
server.setRequestHandler(ReadResourceRequestSchema, async (request) => ({ contents: [{ uri: request.params.uri, mimeType: "text/plain", text: lifecycleInstructions }] }));
await server.connect(new StdioServerTransport());
