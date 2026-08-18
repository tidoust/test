import { appendFile, readFile } from "node:fs/promises";
import { evaluateContributorAgreement } from "../lib/enforcement.js";
import { statusFromEvaluation } from "../lib/status.js";

function parseLabels(source) {
  if (!source) return [];
  try {
    const parsed = JSON.parse(source);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return source
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }
}

const idText = process.env.CONTRIBUTOR_GITHUB_ID;
if (!idText || !/^\d+$/.test(idText)) {
  throw new TypeError("CONTRIBUTOR_GITHUB_ID must be a numeric GitHub user ID.");
}

const evaluation = evaluateContributorAgreement(
  {
    githubId: Number(idText),
    labels: parseLabels(process.env.PULL_REQUEST_LABELS),
    headRef: process.env.PULL_REQUEST_HEAD_REF ?? "",
    headRepository: process.env.PULL_REQUEST_HEAD_REPOSITORY ?? "",
    baseRepository: process.env.BASE_REPOSITORY ?? "",
  },
  await readFile(process.env.CLA_REGISTRY_PATH ?? "CLA_REGISTRY.yaml", "utf8"),
);
const status = statusFromEvaluation(evaluation);
console.log(evaluation.summary);

if (process.env.GITHUB_OUTPUT) {
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `state=${status.state}\ncontext=${status.context}\ndescription=${status.description}\n`,
  );
}
