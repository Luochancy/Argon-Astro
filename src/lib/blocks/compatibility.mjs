export function compatibilityRecord(name) {
  return {
    name,
    status: "saved-html-only",
    note: "Inner HTML is kept and media URLs are rewritten. This is not a compatibility certification.",
  };
}

export function compatibilityReport(names) {
  return [...new Set(names)].map(compatibilityRecord);
}
