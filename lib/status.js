export const AGREEMENT_STATUS_CONTEXT = "Contributor Agreement";

export function statusFromEvaluation(result) {
  if (!result || typeof result !== "object") {
    throw new TypeError("evaluation result must be an object.");
  }
  return {
    state: result.authorized ? "success" : "failure",
    context: AGREEMENT_STATUS_CONTEXT,
    description: truncateDescription(result.summary),
  };
}

export function truncateDescription(value, maximum = 140) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError("status description must be a non-empty string.");
  }
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length <= maximum) return normalized;
  return `${normalized.slice(0, maximum - 1).trimEnd()}…`;
}
