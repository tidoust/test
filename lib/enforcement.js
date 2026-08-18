import { findCurrentAgreement, parseRegistry } from "./registry.js";

function positiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${field} must be a positive integer.`);
  }

  return value;
}

function stringList(value) {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    throw new TypeError("labels must be an array.");
  }

  return value
    .map((label) => (typeof label === "string" ? label : label?.name))
    .filter((label) => typeof label === "string")
    .map((label) => label.toLowerCase());
}

export function isAgreementPullRequest({
  labels = [],
  headRef = "",
  headRepository = "",
  baseRepository = "",
} = {}) {
  // Parse labels for input validation and compatibility, but do not require
  // the agreement label. GitHub may emit the pull_request "opened" event
  // before the workflow has attached the label.
  stringList(labels);

  return (
    typeof headRef === "string" &&
    headRef.startsWith("agreement/") &&
    typeof headRepository === "string" &&
    headRepository !== "" &&
    headRepository === baseRepository
  );
}

export function evaluateContributorAgreement(
  { githubId, labels, headRef, headRepository, baseRepository },
  registrySource,
) {
  if (
    isAgreementPullRequest({
      labels,
      headRef,
      headRepository,
      baseRepository,
    })
  ) {
    return {
      authorized: true,
      exempt: true,
      summary: "Generated Agreement PRs are exempt from contributor agreement enforcement.",
      entry: null,
    };
  }

  const id = positiveInteger(githubId, "githubId");
  const registry = parseRegistry(registrySource);
  const entry = findCurrentAgreement(registry, id);

  if (entry) {
    return {
      authorized: true,
      exempt: false,
      summary: `Current agreement ${entry.agreementVersion} found for @${entry.githubLogin}.`,
      entry,
    };
  }

  return {
    authorized: false,
    exempt: false,
    summary: `No current contributor agreement found for GitHub user ID ${id}. Open a Sign Contributor Agreement issue, then have the generated Agreement PR merged.`,
    entry: null,
  };
}
