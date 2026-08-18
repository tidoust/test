import { appendFile, readFile, writeFile } from "node:fs/promises";
import { prepareAgreementRequest } from "../lib/agreement-request.js";

const eventPath = process.env.GITHUB_EVENT_PATH;
const outputPath = process.env.GITHUB_OUTPUT;
const registryPath = process.env.CLA_REGISTRY_PATH ?? "CLA_REGISTRY.yaml";

if (!eventPath) {
  console.error("GITHUB_EVENT_PATH is required.");
  process.exit(2);
}
if (!outputPath) {
  console.error("GITHUB_OUTPUT is required.");
  process.exit(2);
}

const event = JSON.parse(await readFile(eventPath, "utf8"));
const registrySource = await readFile(registryPath, "utf8");
const result = prepareAgreementRequest(event, registrySource);

async function output(name, value) {
  const delimiter = `EOF_${name}_${Date.now()}`;
  await appendFile(outputPath, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
}

await output("status", result.status);

if (result.status === "ignored") {
  console.log(result.reason);
  process.exit(0);
}
if (result.status === "invalid") {
  await output("missing", result.missing.join("; "));
  console.log(`Missing required acknowledgements: ${result.missing.join("; ")}`);
  process.exit(0);
}
if (result.status === "already-signed") {
  await output("issue_number", String(result.issueNumber));
  await output("github_login", result.entry.githubLogin);
  console.log(`@${result.entry.githubLogin} already has a current agreement.`);
  process.exit(0);
}

await writeFile(registryPath, result.registry);
await output("branch", result.branch);
await output("commit_message", result.commitMessage);
await output("pr_title", result.pullRequestTitle);
await output("pr_body", result.pullRequestBody);
await output("issue_number", String(result.entry.issueNumber));
await output("github_login", result.entry.githubLogin);
console.log(`Prepared agreement record for @${result.entry.githubLogin} on ${result.branch}.`);
