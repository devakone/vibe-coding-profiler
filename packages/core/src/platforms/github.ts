import type {
  CommitFetcher,
  FetchCommitsOptions,
  NormalizedCommit,
  PlatformRepo,
  PlatformType,
  RepoLister,
} from "./types";

type GithubCommitListItem = {
  sha: string;
  parents: Array<{ sha: string }>;
  commit: {
    message: string;
    author: { name: string | null; email: string | null; date: string };
    committer: { email: string | null; date: string };
  };
};

type GithubCommitDetail = GithubCommitListItem & {
  files?: Array<{ filename: string }>;
  html_url: string;
  stats?: { additions: number; deletions: number; total: number };
};

type GithubRepoSummary = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  owner: { login: string };
  html_url: string;
};

type Fetcher = typeof fetch;

const PLATFORM: PlatformType = "github";
const BASE_URL = "https://api.github.com";

function defaultFetcher(): Fetcher {
  if (typeof fetch === "function") return fetch.bind(globalThis);
  throw new Error("global fetch is required");
}

function mapWithConcurrency<T, R>(
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
  return Promise.all(workers).then(() => results);
}

export class GitHubClient implements CommitFetcher, RepoLister {
  public readonly platform = PLATFORM;

  constructor(
    private readonly accessToken: string,
    private readonly fetcher: Fetcher = defaultFetcher()
  ) {}

  async *listRepos(): AsyncGenerator<PlatformRepo> {
    let page = 1;

    while (true) {
      const url = new URL(`${BASE_URL}/user/repos`);
      url.searchParams.set("per_page", "100");
      url.searchParams.set("page", String(page));
      url.searchParams.set("sort", "updated");
      url.searchParams.set("affiliation", "owner,collaborator,organization_member");
      url.searchParams.set("visibility", "all");

      const batch = await this.githubFetch<GithubRepoSummary[]>(url.toString());
      for (const repo of batch) {
        yield {
          id: String(repo.id),
          name: repo.name,
          fullName: repo.full_name,
          owner: repo.owner.login,
          isPrivate: repo.private,
          defaultBranch: repo.default_branch,
          platform: PLATFORM,
          platformUrl: repo.html_url,
        };
      }

      if (batch.length < 100) break;
      page += 1;
    }
  }

  async *fetchCommits(options: FetchCommitsOptions): AsyncGenerator<NormalizedCommit> {
    const perPage = options.pageSize ?? 200;
    const commits = await this.fetchCommitList({
      owner: options.owner,
      repo: options.repo,
      token: options.accessToken,
      maxCommits: perPage,
    });

    const details = await mapWithConcurrency(
      commits,
      4,
      (commit) => this.fetchCommitDetail({ owner: options.owner, repo: options.repo, sha: commit.sha })
    );

    for (const detail of details) {
      yield this.normalizeCommit(detail, options.repoFullName, options.owner);
    }
  }

  private normalizeCommit(detail: GithubCommitDetail, repoFullName: string, owner: string): NormalizedCommit {
    const author = detail.commit.author;
    const committer = detail.commit.committer;
    const filePaths = detail.files?.map((f) => f.filename) ?? [];
    return {
      sha: detail.sha,
      message: detail.commit.message,
      authoredAt: new Date(author.date),
      committedAt: new Date(committer.date),
      authorName: author.name ?? owner,
      authorEmail: author.email ?? "",
      additions: detail.stats?.additions,
      deletions: detail.stats?.deletions,
      filesChanged: detail.stats?.total,
      filePaths,
      parents: detail.parents.map((p) => p.sha),
      platform: PLATFORM,
      platformUrl: detail.html_url,
    };
  }

  private async fetchCommitList(params: {
    owner: string;
    repo: string;
    maxCommits: number;
    token?: string;
  }): Promise<GithubCommitListItem[]> {
    const items: GithubCommitListItem[] = [];
    let page = 1;

    while (items.length < params.maxCommits) {
      const url = new URL(`${BASE_URL}/repos/${params.owner}/${params.repo}/commits`);
      url.searchParams.set("per_page", "100");
      url.searchParams.set("page", String(page));

      const batch = await this.githubFetch<GithubCommitListItem[]>(url.toString());
      items.push(...batch);

      if (batch.length < 100) break;
      page += 1;
      if (page > 20) break;
    }

    return items.slice(0, params.maxCommits);
  }

  private async fetchCommitDetail(params: {
    owner: string;
    repo: string;
    sha: string;
  }): Promise<GithubCommitDetail> {
    return this.githubFetch<GithubCommitDetail>(`${BASE_URL}/repos/${params.owner}/${params.repo}/commits/${params.sha}`);
  }

  private async githubFetch<T>(url: string): Promise<T> {
    const res = await this.fetcher(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub API error (${res.status}): ${body}`);
    }

    return (await res.json()) as T;
  }
}
