export function formatEvidenceIndexBuild(view) {
  return [
    "[ REIN Index ]",
    "",
    `Status: ${view.status}`,
    `Index: ${view.indexPath}`,
    `Sources: ${view.sourceCount}`,
    `Chunks: ${view.chunkCount}`,
    `Vector dimensions: ${view.vectorDimensions}`,
    `Skipped sources: ${view.skippedSources.length}`,
  ].join("\n");
}

export function formatEvidenceIndexStatus(view) {
  const lines = ["[ REIN Index ]", "", `Status: ${view.status}`, `Index: ${view.indexPath}`];

  if (view.status === "missing") {
    lines.push("", "Recommended: rein index build");
    return lines.join("\n");
  }

  lines.push(
    `Sources: ${view.sourceCount}`,
    `Chunks: ${view.chunkCount}`,
    `Vector dimensions: ${view.vectorDimensions}`,
    `Stale sources: ${view.staleSourceCount}`,
  );

  for (const sourcePath of [...view.changedSources, ...view.missingSources].slice(0, 8)) {
    lines.push(`- ${sourcePath}`);
  }

  return lines.join("\n");
}

export function formatEvidenceIndexQuery(view) {
  const lines = ["[ REIN Index ]", "", `Query: ${view.query}`, `Status: ${view.indexStatus}`];

  if (view.staleSourceCount > 0) {
    lines.push(`Stale sources filtered: ${view.staleSourceCount}`);
  }

  if (view.results.length === 0) {
    lines.push("", "No active index results.");
    return lines.join("\n");
  }

  for (const [index, result] of view.results.entries()) {
    lines.push(
      "",
      `${index + 1}. ${result.sourcePath}:${result.lineStart}`,
      `   score=${result.score} vector=${result.scores.vector} lexical=${result.scores.lexical} pressure=${result.scores.pressure}`,
      `   ${result.heading}`,
    );
  }

  return lines.join("\n");
}
