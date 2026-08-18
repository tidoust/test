import { readFile } from "node:fs/promises";

import { synchronizeContributorAgreementComment } from "../lib/contributor-agreement-comment.js";
import { refreshOpenPullRequests } from "../lib/refresh.js";

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const apiUrl = process.env.GITHUB_API_URL ?? "https://api.github.com";
const serverUrl = process.env.GITHUB_SERVER_URL ?? "https://github.com";
const runUrl = `${serverUrl}/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}`;

if (!repository || !token) throw new Error("GITHUB_REPOSITORY and GITHUB_TOKEN are required.");

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      ...options.headers,
    },
  });

  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

const pullRequests = await request(`/repos/${repository}/pulls?state=open&per_page=100`);
const pullRequestsByNumber = new Map(
  pullRequests.map((pullRequest) => [pullRequest.number, pullRequest]),
);

const results = await refreshOpenPullRequests({
  repository,
  registrySource: await readFile("CLA_REGISTRY.yaml", "utf8"),
  listPullRequests: () => pullRequests,
  publishStatus: ({ sha, state, context, description }) =>
    request(`/repos/${repository}/statuses/${sha}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state, context, description, target_url: runUrl }),
    }),
});

for (const result of results) {
  const pullRequest = pullRequestsByNumber.get(result.pullRequestNumber);
  if (!pullRequest) continue;

  const commentsPath = `/repos/${repository}/issues/${pullRequest.number}/comments`;
  await synchronizeContributorAgreementComment({
    state: result.state,
    login: pullRequest.user.login,
    signingUrl: `${serverUrl}/${repository}/issues/new?template=sign-contributor-agreement.yml`,
    listComments: () => request(`${commentsPath}?per_page=100`),
    createComment: (body) =>
      request(commentsPath, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      }),
    updateComment: (commentId, body) =>
      request(`/repos/${repository}/issues/comments/${commentId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      }),
    deleteComment: (commentId) =>
      request(`/repos/${repository}/issues/comments/${commentId}`, { method: "DELETE" }),
  });
}

console.log(`Refreshed ${results.length} open pull request(s).`);
