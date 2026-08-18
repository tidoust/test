export function agreementBranchName(githubId, issueNumber) {
  if (!Number.isSafeInteger(githubId) || githubId <= 0) throw new TypeError("Invalid GitHub ID.");
  if (!Number.isSafeInteger(issueNumber) || issueNumber <= 0)
    throw new TypeError("Invalid issue number.");
  return `agreement/${githubId}/issue-${issueNumber}`;
}
