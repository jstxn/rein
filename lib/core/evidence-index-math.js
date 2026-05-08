export const VECTOR_DIMENSIONS = 384;

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "with",
]);

const PRESSURE_SIGNAL_PATTERNS = [
  ["acceptance", /\bacceptance\s*criteria\b|\bacceptanceCriteria\b/i],
  ["assumption", /\bassumptions?\b|\bassumed\b/i],
  ["constraint", /\bconstraints?\b|\bnon-negotiable\b/i],
  ["decision", /\bdecision\s*boundar(?:y|ies)\b|\bdecisionBoundaries\b/i],
  ["directive", /\bdirective\b/i],
  ["out_of_scope", /\bout\s*of\s*scope\b|\boutOfScope\b|\bnon-goals?\b/i],
  ["rejected", /\brejected\b/i],
  ["risk", /\bscope-risk\b|\brisk\b|\bblast radius\b/i],
  ["tested", /\btested\b|\bverification\b|\bverify\b/i],
  ["not_tested", /\bnot-tested\b|\bnot tested\b/i],
];

export const PRESSURE_SIGNALS = PRESSURE_SIGNAL_PATTERNS.map(([signal]) => signal);

function fnv1a(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function splitToken(token) {
  const normalized = token.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  const rawParts = normalized.match(/[a-z0-9][a-z0-9._/-]*/g) || [];
  const tokens = [];

  for (const rawPart of rawParts) {
    const pieces = rawPart.split(/[._/-]+/).filter(Boolean);
    if (rawPart.length > 1 && rawPart.length <= 80 && !STOP_WORDS.has(rawPart)) {
      tokens.push(rawPart);
    }
    for (const piece of pieces) {
      if (piece.length > 1 && !STOP_WORDS.has(piece)) {
        tokens.push(piece);
      }
    }
  }

  const baseTokenCount = tokens.length;
  for (let index = 0; index < baseTokenCount - 1; index += 1) {
    tokens.push(`${tokens[index]}_${tokens[index + 1]}`);
  }

  return tokens;
}

function tokenize(value) {
  return splitToken(value);
}

export function pressureSignals(value, relativePath = "") {
  const signals = new Set();
  for (const [signal, pattern] of PRESSURE_SIGNAL_PATTERNS) {
    if (pattern.test(value)) {
      signals.add(signal);
    }
  }

  if (relativePath.startsWith(".rein/specs/")) {
    signals.add("interview");
  }
  if (relativePath.startsWith(".rein/go/")) {
    signals.add("go_flow");
  }

  return [...signals].sort();
}

export function termFrequencies(value) {
  const terms = {};
  for (const token of tokenize(value)) {
    terms[token] = (terms[token] || 0) + 1;
  }
  return terms;
}

export function vectorizeTerms(terms) {
  const vector = new Float32Array(VECTOR_DIMENSIONS);
  for (const [term, count] of Object.entries(terms)) {
    const hash = fnv1a(term);
    const slot = hash % VECTOR_DIMENSIONS;
    const sign = hash & 0x80000000 ? -1 : 1;
    vector[slot] += sign * (1 + Math.log(count));
  }

  let norm = 0;
  for (const value of vector) {
    norm += value * value;
  }

  if (norm === 0) {
    return vector;
  }

  const scale = 1 / Math.sqrt(norm);
  for (let index = 0; index < vector.length; index += 1) {
    vector[index] *= scale;
  }

  return vector;
}

export function dotVector(buffer, vectorIndex, queryVector) {
  let score = 0;
  const start = vectorIndex * VECTOR_DIMENSIONS * 4;
  for (let index = 0; index < VECTOR_DIMENSIONS; index += 1) {
    score += buffer.readFloatLE(start + index * 4) * queryVector[index];
  }
  return score;
}

export function documentFrequencies(chunks) {
  const frequencies = {};
  for (const chunk of chunks) {
    for (const term of Object.keys(chunk.terms)) {
      frequencies[term] = (frequencies[term] || 0) + 1;
    }
  }
  return frequencies;
}

export function bm25Score(chunk, queryTerms, frequencies, totalChunks, averageLength) {
  const k1 = 1.2;
  const b = 0.75;
  let score = 0;

  for (const term of Object.keys(queryTerms)) {
    const tf = chunk.terms[term] || 0;
    if (tf === 0) {
      continue;
    }

    const df = frequencies[term] || 0;
    const idf = Math.log(1 + (totalChunks - df + 0.5) / (df + 0.5));
    const denominator = tf + k1 * (1 - b + b * (chunk.termCount / averageLength));
    score += idf * ((tf * (k1 + 1)) / denominator);
  }

  return score;
}

export function signalScore(chunk, querySignals) {
  if (chunk.pressureSignals.length === 0) {
    return 0;
  }

  const overlap = chunk.pressureSignals.filter((signal) => querySignals.includes(signal)).length;
  const evidenceWeight = Math.min(chunk.pressureSignals.length / 5, 1) * 0.35;
  return Math.min(1, overlap * 0.35 + evidenceWeight);
}

export function roundScore(value) {
  return Number(value.toFixed(6));
}
