import { appendFile, readFile } from "node:fs/promises";
import { agreementTargetBranch } from "../lib/agreement-target.js";

const eventPath = process.env.GITHUB_EVENT_PATH;
const outputPath = process.env.GITHUB_OUTPUT;

if (!eventPath) {
  throw new Error("GITHUB_EVENT_PATH is required.");
}
if (!outputPath) {
  throw new Error("GITHUB_OUTPUT is required.");
}

const event = JSON.parse(await readFile(eventPath, "utf8"));
const targetBranch = agreementTargetBranch(event.issue?.body, event.repository?.default_branch);

await appendFile(outputPath, `target_branch=${targetBranch}\n`);
console.log(`Agreement PR target branch: ${targetBranch}`);
