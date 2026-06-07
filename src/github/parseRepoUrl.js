// Parse a GitHub repo URL into { owner, repo }.
// Supported forms:
//   https://github.com/owner/repo
//   https://github.com/owner/repo.git
//   https://github.com/owner/repo/tree/branch
//   github.com/owner/repo            (no protocol)

export function parseRepoUrl(repoUrl) {
  if (typeof repoUrl !== "string" || !repoUrl.trim()) {
    throw new Error("Repo URL is required (e.g. https://github.com/owner/repo).");
  }

  const cleaned = repoUrl.trim().replace(/^git@github\.com:/, "github.com/");

  // Match the github.com host (with or without protocol/www) then owner/repo.
  const match = cleaned.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+)/i
  );

  if (!match) {
    throw new Error(
      `Not a recognisable GitHub repo URL: "${repoUrl}". ` +
        `Expected something like https://github.com/owner/repo`
    );
  }

  const owner = match[1];
  let repo = match[2].replace(/\.git$/i, "");

  const githubName = /^[A-Za-z0-9._-]+$/;
  if (!owner || !repo || !githubName.test(owner) || !githubName.test(repo)) {
    throw new Error(
      `Not a recognisable GitHub repo URL: "${repoUrl}". ` +
        `Expected something like https://github.com/owner/repo`
    );
  }

  return { owner, repo };
}
