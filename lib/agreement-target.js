const TARGET_BRANCH_HEADING = "### Target branch";

function nonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} must be a non-empty string.`);
  }
  return value.trim();
}

export function agreementTargetBranch(issueBody, defaultBranch) {
  const fallback = nonEmptyString(defaultBranch, "defaultBranch");
  if (typeof issueBody !== "string") return fallback;

  const headingIndex = issueBody.indexOf(TARGET_BRANCH_HEADING);
  if (headingIndex === -1) return fallback;

  const afterHeading = issueBody.slice(headingIndex + TARGET_BRANCH_HEADING.length);
  const match = afterHeading.match(/^\s*\n+\s*([^\n]+?)\s*(?:\n|$)/u);
  if (!match) return fallback;

  const branch = match[1].trim();
  return branch === "" || branch === "_No response_" ? fallback : branch;
}
