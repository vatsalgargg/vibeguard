import { randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_STATE_BYTES = 1024 * 1024;
const stateQueues = new Map();

function comparisonPath(candidate) {
  if (process.platform !== "win32") return candidate;
  return candidate.replace(/^\\\\\?\\UNC\\/i, "\\\\").replace(/^\\\\\?\\([a-z]:)/i, "$1");
}

function isWithin(parent, child) {
  const relative = path.relative(comparisonPath(parent), comparisonPath(child));
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

async function canonicalDirectory(candidate, label) {
  let canonical;
  try {
    canonical = await realpath(candidate);
  } catch {
    throw new Error(`${label} must point to an existing directory.`);
  }
  const info = await lstat(canonical);
  if (!info.isDirectory()) throw new Error(`${label} must point to a directory.`);
  return canonical;
}

export async function resolveProjectRoot(projectPath, allowedRoots) {
  if (typeof projectPath !== "string" || !path.isAbsolute(projectPath)) {
    throw new Error("projectPath must be an absolute path.");
  }

  const root = await canonicalDirectory(projectPath, "projectPath");
  if (root === path.parse(root).root) throw new Error("projectPath cannot be a filesystem root.");

  const configuredRoots = allowedRoots ?? (process.env.VIBEGUARD_ALLOWED_ROOTS
    ? process.env.VIBEGUARD_ALLOWED_ROOTS.split(path.delimiter).filter(Boolean)
    : [process.cwd()]);
  if (configuredRoots.length === 0 || configuredRoots.some((candidate) => !path.isAbsolute(candidate))) {
    throw new Error("VIBEGUARD_ALLOWED_ROOTS must contain one or more absolute directory paths.");
  }

  const roots = await Promise.all(configuredRoots.map((candidate) => canonicalDirectory(candidate, "Allowed root")));
  if (!roots.some((allowedRoot) => isWithin(allowedRoot, root))) {
    throw new Error("projectPath is outside the configured Vibeguard allowed roots.");
  }
  return root;
}

async function statePaths(root, { createDirectory = false } = {}) {
  const directory = path.join(root, ".vibecode-security");
  if (createDirectory) await mkdir(directory, { recursive: true, mode: 0o700 });

  let directoryInfo;
  try {
    directoryInfo = await lstat(directory);
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error("Project is not initialized. Call initialize_project first.");
    throw error;
  }
  if (directoryInfo.isSymbolicLink() || !directoryInfo.isDirectory()) {
    throw new Error("The Vibeguard state directory must be a real directory, not a symlink.");
  }

  const canonicalMeta = await realpath(directory);
  if (!isWithin(root, canonicalMeta)) throw new Error("The Vibeguard state directory resolves outside projectPath.");

  const file = path.join(canonicalMeta, "state.json");
  let fileInfo;
  try {
    fileInfo = await lstat(file);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    return { directory: canonicalMeta, file, exists: false };
  }
  if (fileInfo.isSymbolicLink() || !fileInfo.isFile()) {
    throw new Error("The Vibeguard state file must be a regular file, not a symlink.");
  }
  if (fileInfo.size > MAX_STATE_BYTES) throw new Error("The Vibeguard state file exceeds the 1 MiB safety limit.");
  return { directory: canonicalMeta, file, exists: true };
}

export async function createInitialFiles(root, docs, initialState) {
  const paths = await statePaths(root, { createDirectory: true });
  const files = Object.entries(docs).map(([name, content]) => {
    if (path.basename(name) !== name) throw new Error("Generated document names must be simple filenames.");
    return [path.join(root, name), content];
  });
  files.push([paths.file, JSON.stringify(initialState, null, 2)]);

  for (const [file] of files) {
    try {
      await lstat(file);
      throw new Error(`Refusing to overwrite existing file: ${path.basename(file)}.`);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  const created = [];
  try {
    for (const [file, contents] of files) {
      await writeFile(file, contents, { encoding: "utf8", flag: "wx", mode: 0o600 });
      created.push(file);
    }
  } catch (error) {
    await Promise.all(created.map((file) => rm(file, { force: true }).catch(() => {})));
    throw error;
  }
}

export async function readLifecycleState(root) {
  const paths = await statePaths(root);
  if (!paths.exists) throw new Error("Project is not initialized. Call initialize_project first.");

  let state;
  try {
    state = JSON.parse(await readFile(paths.file, "utf8"));
  } catch {
    throw new Error("The Vibeguard state file is unreadable or invalid JSON.");
  }
  if (state?.version !== 1 || !Array.isArray(state.reviews)) {
    throw new Error("The Vibeguard state file has an unsupported format.");
  }
  return state;
}

async function writeLifecycleState(root, state) {
  const paths = await statePaths(root);
  if (!paths.exists) throw new Error("Project is not initialized. Call initialize_project first.");

  const contents = JSON.stringify(state, null, 2);
  if (Buffer.byteLength(contents, "utf8") > MAX_STATE_BYTES) {
    throw new Error("The Vibeguard state file would exceed the 1 MiB safety limit.");
  }
  const temporaryFile = path.join(paths.directory, `.state-${randomUUID()}.tmp`);
  await writeFile(temporaryFile, contents, { encoding: "utf8", flag: "wx", mode: 0o600 });
  try {
    const current = await lstat(paths.file);
    if (current.isSymbolicLink() || !current.isFile()) {
      throw new Error("The Vibeguard state file must be a regular file, not a symlink.");
    }
    await rename(temporaryFile, paths.file);
  } finally {
    await rm(temporaryFile, { force: true }).catch(() => {});
  }
}

export function appendReview(root, review) {
  const previous = stateQueues.get(root) ?? Promise.resolve();
  const update = previous.then(async () => {
    const state = await readLifecycleState(root);
    state.reviews.push(review);
    await writeLifecycleState(root, state);
    return state;
  });
  const queueTail = update.catch(() => {});
  stateQueues.set(root, queueTail);
  queueTail.then(() => {
    if (stateQueues.get(root) === queueTail) stateQueues.delete(root);
  });
  return update;
}
