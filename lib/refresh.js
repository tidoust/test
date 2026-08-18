import { evaluateContributorAgreement } from "./enforcement.js";
import { statusFromEvaluation } from "./status.js";

export async function refreshOpenPullRequests({
  repository,
  registrySource,
  listPullRequests,
  publishStatus,
}) {
  if (typeof repository !== "string" || !repository.includes("/")) {
    throw new TypeError("repository must be an owner/name string.");
  }
  if (typeof listPullRequests !== "function" || typeof publishStatus !== "function") {
    throw new TypeError("listPullRequests and publishStatus must be functions.");
  }

  const pullRequests = await listPullRequests();
  const results = [];
  for (const pullRequest of pullRequests) {
    if (!pullRequest?.user || !pullRequest?.head) continue;
    const evaluation = evaluateContributorAgreement(
      {
        githubId: pullRequest.user.id,
        labels: pullRequest.labels ?? [],
        headRef: pullRequest.head.ref ?? "",
        headRepository: pullRequest.head.repo?.full_name ?? "",
        baseRepository: repository,
      },
      registrySource,
    );
    const status = statusFromEvaluation(evaluation);
    await publishStatus({
      sha: pullRequest.head.sha,
      pullRequestNumber: pullRequest.number,
      ...status,
    });
    results.push({ pullRequestNumber: pullRequest.number, ...status });
  }
  return results;
}
