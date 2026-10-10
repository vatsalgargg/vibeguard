import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { appendReview, createInitialFiles, readLifecycleState, resolveProjectRoot } from "../src/storage.js";

async function makeWorkspace() {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vibeguard-test-"));
  const allowedRoot = path.join(temporaryRoot, "workspace");
  const projectRoot = path.join(allowedRoot, "project");
  await mkdir(projectRoot, { recursive: true });
  return { temporaryRoot, allowedRoot, projectRoot };
}

test("project paths must be absolute and within an allowed root", async (t) => {
  const workspace = await makeWorkspace();
  t.after(() => rm(workspace.temporaryRoot, { recursive: true, force: true }));

  assert.equal(await resolveProjectRoot(workspace.projectRoot, [workspace.allowedRoot]), await realpath(workspace.projectRoot));
  await assert.rejects(resolveProjectRoot("relative/project", [workspace.allowedRoot]), /absolute path/);
  await assert.rejects(resolveProjectRoot(workspace.temporaryRoot, [workspace.allowedRoot]), /outside/);
});

test("reinitialization refuses to overwrite documents or clear review history", async (t) => {
  const workspace = await makeWorkspace();
  t.after(() => rm(workspace.temporaryRoot, { recursive: true, force: true }));
  const docs = { "ARCHITECTURE.md": "original architecture\n" };
  const initialState = { version: 1, initializedAt: new Date().toISOString(), projectName: "test", reviews: [] };

  await createInitialFiles(workspace.projectRoot, docs, initialState);
  await appendReview(workspace.projectRoot, { at: new Date().toISOString(), summary: "verified change", findings: [], status: "PENDING_AGENT_REVIEW" });
  await assert.rejects(createInitialFiles(workspace.projectRoot, { "ARCHITECTURE.md": "replacement" }, initialState), /Refusing to overwrite/);

  assert.equal(await readFile(path.join(workspace.projectRoot, "ARCHITECTURE.md"), "utf8"), "original architecture\n");
  assert.equal((await readLifecycleState(workspace.projectRoot)).reviews.length, 1);
});

test("concurrent review appends preserve every review", async (t) => {
  const workspace = await makeWorkspace();
  t.after(() => rm(workspace.temporaryRoot, { recursive: true, force: true }));
  await createInitialFiles(workspace.projectRoot, {}, { version: 1, initializedAt: new Date().toISOString(), projectName: "test", reviews: [] });

  await Promise.all(Array.from({ length: 8 }, (_, index) => appendReview(workspace.projectRoot, {
    at: new Date().toISOString(), summary: `review-${index}`, findings: [], status: "PENDING_AGENT_REVIEW"
  })));

  const summaries = (await readLifecycleState(workspace.projectRoot)).reviews.map((review) => review.summary).sort();
  assert.deepEqual(summaries, Array.from({ length: 8 }, (_, index) => `review-${index}`).sort());
});
