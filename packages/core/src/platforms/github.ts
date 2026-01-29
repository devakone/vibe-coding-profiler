import type {
  CommitFetcher,
  FetchCommitsOptions,
  FetchCommitsSampledOptions,
  NormalizedCommit,
  PlatformRepo,
  PlatformType,
  RepoLister,
} from "./types";
import { RateLimitExceededError, TokenExpiredError } from "./errors";

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

type GithubRepoMeta = {
  created_at: string;
  pushed_at: string | null;
};

type Fetcher = typeof fetch;

const PLATFORM: PlatformType = "github";
const BASE_URL = "https://api.github.com";

/**
 * Sample items evenly from an array
 */
function sampleEvenly<T>(items: T[], count: number): T[] {
  if (count <= 0) return [];
  if (items.length <= count) return items;
  const out: T[] = [];
  for (let i = 0; i < count; i += 1) {
    const idx = Math.min(items.length - 1, Math.floor(((i + 0.5) * items.length) / count));
    out.push(items[idx]);
  }
  return out;
}

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

  /**
   * Fetch commits with time-bucketed sampling for comprehensive repository coverage.
   * Divides the repository's lifespan into buckets and samples evenly from each.
   */
  async fetchCommitsSampled(options: FetchCommitsSampledOptions): Promise<NormalizedCommit[]> {
    const { owner, repo, maxCommits, repoFullName } = options;

    // Fetch repo metadata to get timeline
    const repoMeta = await this.githubFetch<GithubRepoMeta>(
      `${BASE_URL}/repos/${owner}/${repo}`
    );

    const startMs = new Date(repoMeta.created_at).getTime();
    const endMs = new Date(repoMeta.pushed_at ?? new Date().toISOString()).getTime();

    // Fall back to recent commits if timeline is invalid
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      return this.fetchCommitsRecent({ owner, repo, maxCommits, repoFullName });
    }

    // Calculate time buckets
    const target = Math.max(1, maxCommits);
    const bucketCount = Math.min(24, Math.max(6, Math.ceil(target / 25)));
    const perBucketTarget = Math.max(1, Math.ceil(target / bucketCount));
    const bucketMs = Math.max(1, Math.floor((endMs - startMs) / bucketCount));
    const pageLimitPerBucket = 2;

    const bySha = new Map<string, GithubCommitListItem>();

    // Fetch from each time bucket
    for (let i = 0; i < bucketCount; i += 1) {
      const since = new Date(startMs + bucketMs * i);
      const until = new Date(i === bucketCount - 1 ? endMs : startMs + bucketMs * (i + 1));

      const bucketItems: GithubCommitListItem[] = [];
      for (let page = 1; page <= pageLimitPerBucket; page += 1) {
        const url = new URL(`${BASE_URL}/repos/${owner}/${repo}/commits`);
        url.searchParams.set("per_page", "100");
        url.searchParams.set("page", String(page));
        url.searchParams.set("since", since.toISOString());
        url.searchParams.set("until", until.toISOString());

        const batch = await this.githubFetch<GithubCommitListItem[]>(url.toString());
        bucketItems.push(...batch);
        if (batch.length < 100) break;
      }

      const sampled = sampleEvenly(bucketItems, perBucketTarget);
      for (const item of sampled) {
        bySha.set(item.sha, item);
      }
    }

    // Sort by committer date descending
    const descByCommitterDate = (a: GithubCommitListItem, b: GithubCommitListItem): number =>
      new Date(b.commit.committer.date).getTime() - new Date(a.commit.committer.date).getTime();

    let combined = Array.from(bySha.values()).sort(descByCommitterDate);

    // Fill with recent commits if not enough
    if (combined.length < target) {
      const fallback = await this.fetchCommitList({ owner, repo, maxCommits: target });
      for (const item of fallback) {
        if (!bySha.has(item.sha)) bySha.set(item.sha, item);
        if (bySha.size >= target) break;
      }
      combined = Array.from(bySha.values()).sort(descByCommitterDate);
    }

    const commitList = combined.slice(0, target);

    // Fetch details with concurrency
    const details = await mapWithConcurrency(
      commitList,
      4,
      (commit) => this.fetchCommitDetail({ owner, repo, sha: commit.sha })
    );

    return details.map((detail) => this.normalizeCommit(detail, repoFullName, owner));
  }

  /**
   * Fetch recent commits (fallback when time-bucketing isn't possible)
   */
  private async fetchCommitsRecent(options: {
    owner: string;
    repo: string;
    maxCommits: number;
    repoFullName: string;
  }): Promise<NormalizedCommit[]> {
    const commits = await this.fetchCommitList({
      owner: options.owner,
      repo: options.repo,
      maxCommits: options.maxCommits,
    });

    const details = await mapWithConcurrency(
      commits,
      4,
      (commit) => this.fetchCommitDetail({ owner: options.owner, repo: options.repo, sha: commit.sha })
    );

    return details.map((detail) => this.normalizeCommit(detail, options.repoFullName, options.owner));
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

      // Handle rate limit
      if (res.status === 429 || res.status === 403) {
        const remaining = res.headers.get("X-RateLimit-Remaining");
        if (res.status === 429 || remaining === "0") {
          const resetHeader = res.headers.get("X-RateLimit-Reset");
          const resetMs = resetHeader
            ? Number.parseInt(resetHeader, 10) * 1000 - Date.now()
            : undefined;
          throw new RateLimitExceededError(PLATFORM, resetMs);
        }
      }

      // Handle token expiry
      if (res.status === 401) {
        throw new TokenExpiredError(PLATFORM);
      }

      throw new Error(`GitHub API error (${res.status}): ${body}`);
    }

    return (await res.json()) as T;
  }
}
