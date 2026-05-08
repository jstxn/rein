import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  PRESSURE_SIGNALS,
  VECTOR_DIMENSIONS,
  bm25Score,
  documentFrequencies,
  dotVector,
  pressureSignals,
  roundScore,
  signalScore,
  termFrequencies,
  vectorizeTerms,
} from "./evidence-index-math.js";
import { findGitRoot } from "./installer.js";
import { ReinError } from "./rein-error.js";

const INDEX_SCHEMA_VERSION = 1;
const MAX_SOURCE_BYTES = 512 * 1024;
const MAX_CHUNK_CHARS = 2400;
const INDEX_RELATIVE_DIR = path.join(".rein", "index");
const MANIFEST_FILE = "manifest.json";
const CHUNKS_FILE = "chunks.jsonl";
const VECTORS_FILE = "vectors.f32";

const SKIPPED_DIRECTORIES = new Set([".git", "node_modules", ".omc", ".omx"]);
const ALWAYS_INDEXED_FILES = new Set([
  "AGENTS.md",
  "CLAUDE.md",
  "PRESSURE.md",
  "README.md",
  "REIN.md",
  "package.json",
]);
const INDEXED_ROOTS = [
  ".claude/commands",
  ".codex/skills",
  ".cursor/rules",
  ".rein/codebase",
  ".rein/context",
  ".rein/go",
  ".rein/interviews",
  ".rein/specs",
  "docs",
];
const INDEXED_EXTENSIONS = new Set([".json", ".md", ".mdc"]);

function workspaceRoot(cwd = process.cwd()) {
  return findGitRoot(cwd) || path.resolve(cwd);
}

function toRelative(root, target) {
  return path.relative(root, target).split(path.sep).join("/");
}

function fromRelative(root, relativePath) {
  return path.join(root, ...relativePath.split("/"));
}

function indexPaths(root) {
  const indexDir = path.join(root, INDEX_RELATIVE_DIR);
  return {
    chunks: path.join(indexDir, CHUNKS_FILE),
    dir: indexDir,
    manifest: path.join(indexDir, MANIFEST_FILE),
    vectors: path.join(indexDir, VECTORS_FILE),
  };
}

function hashText(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hasIndexedRoot(relativePath) {
  return INDEXED_ROOTS.some((root) => relativePath === root || relativePath.startsWith(`${root}/`));
}

function shouldIndexFile(relativePath) {
  if (relativePath.startsWith(".rein/index/")) {
    return false;
  }

  if (ALWAYS_INDEXED_FILES.has(relativePath)) {
    return true;
  }

  return hasIndexedRoot(relativePath) && INDEXED_EXTENSIONS.has(path.extname(relativePath));
}

function walkFiles(root, directory = root, files = []) {
  if (!fs.existsSync(directory)) {
    return files;
  }

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) {
        walkFiles(root, fullPath, files);
      }
      continue;
    }

    if (entry.isFile()) {
      const relativePath = toRelative(root, fullPath);
      if (shouldIndexFile(relativePath)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function classifyArtifact(relativePath) {
  if (relativePath === "README.md") {
    return "readme";
  }
  if (relativePath === "package.json") {
    return "package";
  }
  if (["AGENTS.md", "CLAUDE.md", "PRESSURE.md", "REIN.md"].includes(relativePath)) {
    return "protocol";
  }
  if (relativePath.startsWith(".codex/skills/")) {
    return "codex-skill";
  }
  if (relativePath.startsWith(".claude/commands/")) {
    return "claude-command";
  }
  if (relativePath.startsWith(".cursor/rules/")) {
    return "cursor-rule";
  }
  if (relativePath.startsWith(".rein/specs/")) {
    return relativePath.endsWith("result.json") ? "interview-result" : "interview-spec";
  }
  if (relativePath.startsWith(".rein/go/")) {
    return "go-stage";
  }
  if (relativePath.startsWith(".rein/interviews/")) {
    return "interview-transcript";
  }
  if (relativePath.startsWith(".rein/context/")) {
    return "context-snapshot";
  }
  if (relativePath.startsWith(".rein/codebase/") || relativePath.startsWith("docs/")) {
    return "codebase-map";
  }
  return "artifact";
}

function chunkTextBySize(lines, startLine, heading) {
  const chunks = [];
  let pending = [];
  let pendingStart = startLine;
  let pendingLength = 0;

  const flush = () => {
    if (pending.length === 0) {
      return;
    }

    chunks.push({
      heading,
      lineEnd: pendingStart + pending.length - 1,
      lineStart: pendingStart,
      text: pending.join("\n").trim(),
    });
    pending = [];
    pendingLength = 0;
  };

  for (const [offset, line] of lines.entries()) {
    if (pendingLength + line.length > MAX_CHUNK_CHARS && pending.length > 0) {
      flush();
      pendingStart = startLine + offset;
    }
    pending.push(line);
    pendingLength += line.length + 1;
  }

  flush();
  return chunks.filter((chunk) => chunk.text);
}

function chunkMarkdown(text, fallbackHeading) {
  const lines = text.split(/\r?\n/);
  const chunks = [];
  let heading = fallbackHeading;
  let sectionStart = 1;
  let sectionLines = [];

  const flush = () => {
    chunks.push(...chunkTextBySize(sectionLines, sectionStart, heading));
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (match && sectionLines.length > 0) {
      flush();
      heading = match[2].trim();
      sectionStart = index + 1;
      sectionLines = [line];
      continue;
    }

    if (match) {
      heading = match[2].trim();
      sectionStart = index + 1;
    }
    sectionLines.push(line);
  }

  flush();
  return chunks;
}

function lineForJsonKey(lines, key) {
  const index = lines.findIndex((line) => line.includes(`"${key}"`));
  return index === -1 ? 1 : index + 1;
}

function chunkJson(text, fallbackHeading) {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return chunkMarkdown(text, fallbackHeading);
    }

    const lines = text.split(/\r?\n/);
    return Object.entries(parsed)
      .map(([key, value]) => {
        const rendered = `${key}: ${JSON.stringify(value, null, 2)}`;
        const lineStart = lineForJsonKey(lines, key);
        return {
          heading: key,
          lineEnd: lineStart + rendered.split(/\r?\n/).length - 1,
          lineStart,
          text: rendered,
        };
      })
      .filter((chunk) => chunk.text.trim());
  } catch {
    return chunkMarkdown(text, fallbackHeading);
  }
}

function chunksForSource(source) {
  const fallbackHeading = path.basename(source.relativePath);
  const extension = path.extname(source.relativePath);
  const rawChunks =
    extension === ".json"
      ? chunkJson(source.text, fallbackHeading)
      : chunkMarkdown(source.text, fallbackHeading);

  return rawChunks.map((chunk) => {
    const searchableText = [
      source.relativePath,
      source.artifactType,
      chunk.heading,
      chunk.text,
    ].join("\n");
    const terms = termFrequencies(searchableText);
    const signals = pressureSignals(searchableText, source.relativePath);

    return {
      artifactType: source.artifactType,
      byteLength: Buffer.byteLength(chunk.text, "utf8"),
      heading: chunk.heading,
      id: hashText(`${source.relativePath}:${chunk.lineStart}:${chunk.lineEnd}:${chunk.text}`),
      lineEnd: chunk.lineEnd,
      lineStart: chunk.lineStart,
      pressureSignals: signals,
      sourceHash: source.hash,
      sourcePath: source.relativePath,
      termCount: Object.values(terms).reduce((total, value) => total + value, 0),
      terms,
      text: chunk.text,
    };
  });
}

function readSource(root, filePath) {
  const stats = fs.statSync(filePath);
  const relativePath = toRelative(root, filePath);
  if (stats.size > MAX_SOURCE_BYTES) {
    return {
      reason: `source exceeds ${MAX_SOURCE_BYTES} bytes`,
      relativePath,
      skipped: true,
    };
  }

  const text = fs.readFileSync(filePath, "utf8");
  return {
    artifactType: classifyArtifact(relativePath),
    hash: hashText(text),
    mtimeMs: stats.mtimeMs,
    relativePath,
    size: stats.size,
    text,
  };
}

function writeVectors(vectorPath, vectors) {
  const buffer = Buffer.alloc(vectors.length * VECTOR_DIMENSIONS * 4);
  let offset = 0;
  for (const vector of vectors) {
    for (const value of vector) {
      buffer.writeFloatLE(value, offset);
      offset += 4;
    }
  }
  fs.writeFileSync(vectorPath, buffer);
}

function readChunks(chunksPath) {
  return fs
    .readFileSync(chunksPath, "utf8")
    .split(/\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function readManifest(paths) {
  if (!fs.existsSync(paths.manifest)) {
    throw new ReinError("No REIN evidence index found. Run `rein index build` first.", {
      code: "missing_index",
    });
  }

  if (!fs.existsSync(paths.chunks) || !fs.existsSync(paths.vectors)) {
    throw new ReinError("REIN evidence index is incomplete. Rebuild with `rein index build`.", {
      code: "incomplete_index",
    });
  }

  const manifest = JSON.parse(fs.readFileSync(paths.manifest, "utf8"));
  if (manifest.schemaVersion !== INDEX_SCHEMA_VERSION) {
    throw new ReinError(
      `Unsupported evidence index schema ${manifest.schemaVersion}. Rebuild with \`rein index build\`.`,
      { code: "unsupported_index_schema" },
    );
  }

  return manifest;
}

function compareSources(root, manifest) {
  const changed = [];
  const missing = [];

  for (const source of manifest.sources || []) {
    const sourcePath = fromRelative(root, source.path);
    if (!fs.existsSync(sourcePath)) {
      missing.push(source.path);
      continue;
    }

    const currentText = fs.readFileSync(sourcePath, "utf8");
    const currentHash = hashText(currentText);
    if (currentHash !== source.hash) {
      changed.push(source.path);
    }
  }

  return { changed, missing };
}

function selectDiverseResults(results, limit) {
  const selected = [];
  const remaining = [];
  const seenSources = new Set();

  for (const result of results) {
    if (!seenSources.has(result.sourcePath)) {
      selected.push(result);
      seenSources.add(result.sourcePath);
    } else {
      remaining.push(result);
    }

    if (selected.length === limit) {
      return selected;
    }
  }

  return [...selected, ...remaining].slice(0, limit);
}

export function buildEvidenceIndex(options = {}) {
  const root = workspaceRoot(options.cwd);
  const paths = indexPaths(root);
  const discoveredFiles = walkFiles(root).sort();
  const sources = [];
  const skippedSources = [];
  const chunks = [];
  const vectors = [];

  fs.rmSync(paths.dir, { force: true, recursive: true });
  fs.mkdirSync(paths.dir, { recursive: true });

  for (const filePath of discoveredFiles) {
    const source = readSource(root, filePath);
    if (source.skipped) {
      skippedSources.push({
        path: source.relativePath,
        reason: source.reason,
      });
      continue;
    }

    sources.push(source);
    for (const chunk of chunksForSource(source)) {
      chunks.push(chunk);
      vectors.push(vectorizeTerms(chunk.terms));
    }
  }

  fs.writeFileSync(paths.chunks, `${chunks.map((chunk) => JSON.stringify(chunk)).join("\n")}\n`);
  writeVectors(paths.vectors, vectors);

  const manifest = {
    algorithm: {
      distance: "cosine",
      lexical: "bm25",
      pressureSignals: PRESSURE_SIGNALS,
      vectorizer: "local-feature-hash-fnv1a-signed-l2",
    },
    chunkCount: chunks.length,
    createdAt: new Date().toISOString(),
    files: {
      chunks: CHUNKS_FILE,
      vectors: VECTORS_FILE,
    },
    indexPath: toRelative(root, paths.dir),
    root,
    schemaVersion: INDEX_SCHEMA_VERSION,
    skippedSources,
    sourceCount: sources.length,
    sources: sources.map((source) => ({
      artifactType: source.artifactType,
      hash: source.hash,
      mtimeMs: source.mtimeMs,
      path: source.relativePath,
      size: source.size,
    })),
    vectorDimensions: VECTOR_DIMENSIONS,
  };

  fs.writeFileSync(paths.manifest, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return {
    ...manifest,
    status: chunks.length > 0 ? "ready" : "empty",
  };
}

export function getEvidenceIndexStatus(options = {}) {
  const root = workspaceRoot(options.cwd);
  const paths = indexPaths(root);
  if (!fs.existsSync(paths.manifest)) {
    return {
      indexPath: toRelative(root, paths.dir),
      status: "missing",
    };
  }

  const manifest = readManifest(paths);
  const comparison = compareSources(root, manifest);
  const staleSourceCount = comparison.changed.length + comparison.missing.length;

  return {
    changedSources: comparison.changed,
    chunkCount: manifest.chunkCount,
    createdAt: manifest.createdAt,
    indexPath: manifest.indexPath,
    missingSources: comparison.missing,
    schemaVersion: manifest.schemaVersion,
    sourceCount: manifest.sourceCount,
    staleSourceCount,
    status: staleSourceCount > 0 ? "stale" : "ready",
    vectorDimensions: manifest.vectorDimensions,
  };
}

export function queryEvidenceIndex(query, options = {}) {
  const normalizedQuery = String(query || "").trim();
  if (!normalizedQuery) {
    throw new ReinError("Query text is required.", { code: "missing_query" });
  }

  const root = workspaceRoot(options.cwd);
  const requestedLimit = Number(options.limit || 5);
  const limit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 25)) : 5;
  const paths = indexPaths(root);
  const manifest = readManifest(paths);
  const status = getEvidenceIndexStatus({ cwd: root });
  const staleSources = new Set([
    ...(status.changedSources || []),
    ...(status.missingSources || []),
  ]);
  const indexedChunks = readChunks(paths.chunks);
  const chunks = indexedChunks
    .map((chunk, vectorIndex) => ({ chunk, vectorIndex }))
    .filter((entry) => !staleSources.has(entry.chunk.sourcePath));

  if (chunks.length === 0) {
    return {
      indexStatus: status.status,
      query: normalizedQuery,
      results: [],
      staleSourceCount: status.staleSourceCount,
      status: "empty",
    };
  }

  const vectorBuffer = fs.readFileSync(paths.vectors);
  const queryTerms = termFrequencies(normalizedQuery);
  const queryVector = vectorizeTerms(queryTerms);
  const querySignals = pressureSignals(normalizedQuery);
  const activeChunks = chunks.map((entry) => entry.chunk);
  const frequencies = documentFrequencies(activeChunks);
  const averageLength =
    activeChunks.reduce((total, chunk) => total + chunk.termCount, 0) /
    Math.max(activeChunks.length, 1);
  const rawScores = chunks.map((entry) => {
    const vectorScore = Math.max(0, dotVector(vectorBuffer, entry.vectorIndex, queryVector));
    const lexicalScore = bm25Score(
      entry.chunk,
      queryTerms,
      frequencies,
      activeChunks.length,
      averageLength,
    );
    const pressureScore = signalScore(entry.chunk, querySignals);
    return {
      chunk: entry.chunk,
      lexicalScore,
      pressureScore,
      vectorScore,
    };
  });
  const maxLexical = Math.max(...rawScores.map((score) => score.lexicalScore), 0.000001);

  const results = rawScores
    .map((score) => {
      const lexical = score.lexicalScore / maxLexical;
      const combined = score.vectorScore * 0.58 + lexical * 0.32 + score.pressureScore * 0.1;
      return {
        artifactType: score.chunk.artifactType,
        heading: score.chunk.heading,
        lineEnd: score.chunk.lineEnd,
        lineStart: score.chunk.lineStart,
        pressureSignals: score.chunk.pressureSignals,
        scores: {
          lexical: roundScore(lexical),
          pressure: roundScore(score.pressureScore),
          vector: roundScore(score.vectorScore),
        },
        score: roundScore(combined),
        sourceHash: score.chunk.sourceHash,
        sourcePath: score.chunk.sourcePath,
        text: score.chunk.text,
      };
    })
    .sort((left, right) => right.score - left.score);

  return {
    chunkCount: activeChunks.length,
    indexCreatedAt: manifest.createdAt,
    indexStatus: status.status,
    query: normalizedQuery,
    results: selectDiverseResults(results, limit),
    staleSourceCount: status.staleSourceCount,
    status: "ready",
  };
}

export function lookupEvidenceContext(query, options = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit || 6), 10));

  try {
    const view = queryEvidenceIndex(query, {
      cwd: options.cwd,
      limit,
    });

    return {
      indexCreatedAt: view.indexCreatedAt,
      query: view.query,
      results: view.results.map((result) => ({
        artifactType: result.artifactType,
        excerpt: result.text.slice(0, 1200),
        heading: result.heading,
        lineEnd: result.lineEnd,
        lineStart: result.lineStart,
        pressureSignals: result.pressureSignals,
        score: result.score,
        scores: result.scores,
        sourceHash: result.sourceHash,
        sourcePath: result.sourcePath,
      })),
      source: "rein-index",
      staleSourceCount: view.staleSourceCount,
      status: view.indexStatus,
    };
  } catch (error) {
    const code = error?.code || null;
    if (code === "missing_index" || code === "incomplete_index") {
      return {
        code,
        message: error.message,
        query,
        recommendedCommand: "rein index build",
        results: [],
        source: "rein-index",
        staleSourceCount: null,
        status: "missing",
      };
    }

    return {
      code,
      message: error instanceof Error ? error.message : String(error),
      query,
      recommendedCommand: "rein index build",
      results: [],
      source: "rein-index",
      staleSourceCount: null,
      status: "unavailable",
    };
  }
}
