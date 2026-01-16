export interface GithubRepoSummary {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  owner: { login: string };
}

async function githubFetch<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API error (${res.status}): ${body}`);
  }

  return (await res.json()) as T;
}

export async function fetchGithubRepos(token: string): Promise<GithubRepoSummary[]> {
  const repos: GithubRepoSummary[] = [];
  let page = 1;

  while (page <= 5) {
    const url = new URL("https://api.github.com/user/repos");
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    url.searchParams.set("sort", "updated");
    url.searchParams.set("affiliation", "owner,collaborator,organization_member");

    const batch = await githubFetch<GithubRepoSummary[]>(url.toString(), token);
    repos.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }

  return repos;
}

