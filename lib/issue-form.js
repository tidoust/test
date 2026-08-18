const REQUIRED_LABELS = [
  "I have read and agree to the Contributor Agreement.",
  "I am submitting this agreement for my own authenticated GitHub account.",
];

function normalize(value) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function checkedLabels(body) {
  if (typeof body !== "string") return new Set();
  const labels = new Set();
  for (const line of body.split(/\r?\n/)) {
    const match = line.trim().match(/^-\s*\[([xX ])\]\s*(.+)$/);
    if (match?.[1]?.toLowerCase() === "x" && match[2]) labels.add(normalize(match[2]));
  }
  return labels;
}

export function validateSigningIssue(body) {
  const checked = checkedLabels(body);
  const missing = REQUIRED_LABELS.filter((label) => !checked.has(normalize(label)));
  return { valid: missing.length === 0, missing };
}

export function requiredSigningLabels() {
  return [...REQUIRED_LABELS];
}
