import { synchronizeContributorAgreementComment } from "../lib/contributor-agreement-comment.js";

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const apiUrl = process.env.GITHUB_API_URL ?? "https://api.github.com";
const serverUrl = process.env.GITHUB_SERVER_URL ?? "https://github.com";
const pullRequestNumber = Number(process.env.PULL_REQUEST_NUMBER);
const state = process.env.AGREEMENT_STATE;
const login = process.env.CONTRIBUTOR_LOGIN;
const baseRef = process.env.PULL_REQUEST_BASE_REF;

if (!repository || !token || !baseRef) {
  throw new Error("GITHUB_REPOSITORY, GITHUB_TOKEN, and PULL_REQUEST_BASE_REF are required.");
}
if (!Number.isSafeInteger(pullRequestNumber) || pullRequestNumber <= 0) {
  throw new TypeError("PULL_REQUEST_NUMBER must be a positive integer.");
}

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

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  }

  return response.status === 204 ? null : response.json();
}

const commentsPath = `/repos/${repository}/issues/${pullRequestNumber}/comments`;
const signingParameters = new URLSearchParams({
  template: "sign-contributor-agreement.yml",
  target_branch: baseRef,
});
const signingUrl = `${serverUrl}/${repository}/issues/new?${signingParameters}`;

const result = await synchronizeContributorAgreementComment({
  state,
  login,
  signingUrl,
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

console.log(`Contributor Agreement comment action: ${result.action}.`);
