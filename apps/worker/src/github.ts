export type GithubCommitListItem = {
  sha: string;
  parents: Array<{ sha: string }>;
  commit: {
    message: string;
    author: { email: string | null; date: string };
    committer: { email: string | null; date: string };
  };
};

export type GithubCommitDetail = GithubCommitListItem & {
  files?: Array<unknown>;
  stats?: { additions: number; deletions: number; total: number };
};

async function githubFetch<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API error (${res.status}): ${body}`);
  }

  return (await res.json()) as T;
}

export async function fetchCommitList(params: {
  owner: string;
  repo: string;
  token: string;
  maxCommits: number;
}): Promise<GithubCommitListItem[]> {
  const items: GithubCommitListItem[] = [];
  let page = 1;

  while (items.length < params.maxCommits) {
    const url = new URL(
      `https://api.github.com/repos/${params.owner}/${params.repo}/commits`
    );
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));

    const batch = await githubFetch<GithubCommitListItem[]>(url.toString(), params.token);
    items.push(...batch);

    if (batch.length < 100) break;
    page += 1;
    if (page > 20) break;
  }

  return items.slice(0, params.maxCommits);
}

export async function fetchCommitDetail(params: {
  owner: string;
  repo: string;
  sha: string;
  token: string;
}): Promise<GithubCommitDetail> {
  const url = `https://api.github.com/repos/${params.owner}/${params.repo}/commits/${params.sha}`;
  return githubFetch<GithubCommitDetail>(url, params.token);
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (true) {
      const i = next;
      next += 1;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker());
  await Promise.all(workers);
  return results;
}

