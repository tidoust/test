import { agreementBranchName } from "./branch.js";
import { validateSigningIssue } from "./issue-form.js";
import {
  addAgreement,
  findCurrentAgreement,
  parseRegistry,
  serializeRegistry,
} from "./registry.js";

const SIGNING_LABEL = "pending-agreement";

function object(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${field} must be an object.`);
  }
  return value;
}

function positiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${field} must be a positive integer.`);
  }
  return value;
}

function nonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} must be a non-empty string.`);
  }
  return value.trim();
}

function labelNames(issue) {
  if (!Array.isArray(issue.labels)) return [];
  return issue.labels
    .map((label) => (typeof label === "string" ? label : label?.name))
    .filter((label) => typeof label === "string");
}

export function prepareAgreementRequest(event, registrySource) {
  const payload = object(event, "event");
  if (payload.action !== "opened") {
    return { status: "ignored", reason: "Only newly opened issues are supported." };
  }

  const issue = object(payload.issue, "issue");
  if ("pull_request" in issue) {
    return { status: "ignored", reason: "Pull requests are not signing issues." };
  }
  if (!labelNames(issue).includes(SIGNING_LABEL)) {
    return { status: "ignored", reason: `Issue is missing the ${SIGNING_LABEL} label.` };
  }

  const validation = validateSigningIssue(issue.body ?? "");
  if (!validation.valid) {
    return { status: "invalid", missing: validation.missing };
  }

  const user = object(issue.user, "issue.user");
  const githubId = positiveInteger(user.id, "issue.user.id");
  const issueNumber = positiveInteger(issue.number, "issue.number");
  const registry = parseRegistry(registrySource);
  const existing = findCurrentAgreement(registry, githubId);
  if (existing) {
    return { status: "already-signed", entry: existing, issueNumber };
  }

  const entry = {
    githubId,
    githubNodeId: nonEmptyString(user.node_id, "issue.user.node_id"),
    githubLogin: nonEmptyString(user.login, "issue.user.login"),
    agreementVersion: registry.agreementVersion,
    signedAt: nonEmptyString(issue.created_at, "issue.created_at"),
    issueNumber,
    issueNodeId: nonEmptyString(issue.node_id, "issue.node_id"),
  };
  const branch = agreementBranchName(githubId, issueNumber);

  return {
    status: "prepared",
    branch,
    entry,
    registry: serializeRegistry(addAgreement(registry, entry)),
    commitMessage: `Record contributor agreement for @${entry.githubLogin}`,
    pullRequestTitle: `Record contributor agreement for @${entry.githubLogin}`,
    pullRequestBody: [
      "## Contributor Agreement",
      "",
      `Records acceptance of agreement version \`${entry.agreementVersion}\` by @${entry.githubLogin}.`,
      "",
      `- GitHub user ID: \`${entry.githubId}\``,
      `- GitHub user node ID: \`${entry.githubNodeId}\``,
      `- Signing issue node ID: \`${entry.issueNodeId}\``,
      `- Signed at: \`${entry.signedAt}\``,
      "",
      `Closes #${issueNumber}`,
    ].join("\n"),
  };
}
