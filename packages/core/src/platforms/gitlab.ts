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

type GitLabProject = {
  id: number;
  name: string;
  path_with_namespace: string;
  visibility: "private" | "public" | "internal";
  default_branch: string;
  web_url: string;
  namespace: { name: string };
  created_at: string;
  last_activity_at: string;
};

type GitLabCommit = {
  id: string;
  short_id: string;
  title: string;
  message: string;
  author_name: string;
  author_email: string;
  authored_date: string;
  committed_date: string;
  parent_ids: string[];
  stats?: { total: number; additions: number; deletions: number };
};

const PLATFORM: PlatformType = "gitlab";

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

export class GitLabClient implements CommitFetcher, RepoLister {
  public readonly platform = PLATFORM;
  private readonly baseUrl = "https://gitlab.com/api/v4";

  constructor(
    private readonly accessToken: string,
    private readonly fetcher: typeof fetch = fetch
  ) { }

  private async gitlabFetch<T>(url: string): Promise<T> {
    const res = await this.fetcher(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text();

      // Handle rate limit
      if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After");
        const retryMs = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : undefined;
        throw new RateLimitExceededError(PLATFORM, retryMs);
      }

      // Handle token expiry
      if (res.status === 401) {
        throw new TokenExpiredError(PLATFORM);
      }

      throw new Error(`GitLab API error (${res.status}): ${body}`);
    }

    return (await res.json()) as T;
  }

  async *listRepos(): AsyncGenerator<PlatformRepo> {
    let page = 1;
    while (true) {
      const url = new URL(`${this.baseUrl}/projects`);
      url.searchParams.set("membership", "true");
      url.searchParams.set("per_page", "100");
      url.searchParams.set("page", String(page));

      const projects = await this.gitlabFetch<GitLabProject[]>(url.toString());
      for (const project of projects) {
        yield {
          id: String(project.id),
          name: project.name,
          fullName: project.path_with_namespace,
          owner: project.namespace.name,
          isPrivate: project.visibility !== "public",
          defaultBranch: project.default_branch,
          platform: this.platform,
          platformUrl: project.web_url,
        };
      }

      if (projects.length < 100) break;
      page += 1;
    }
  }

  async *fetchCommits(options: FetchCommitsOptions): AsyncGenerator<NormalizedCommit> {
    let page = 1;
    while (true) {
      const url = new URL(
        `${this.baseUrl}/projects/${encodeURIComponent(options.repoFullName)}/repository/commits`
      );
      url.searchParams.set("per_page", String(options.pageSize ?? 100));
      url.searchParams.set("page", String(page));
      url.searchParams.set("with_stats", "true");
      if (options.since) url.searchParams.set("since", options.since.toISOString());
      if (options.until) url.searchParams.set("until", options.until.toISOString());

      const commits = await this.gitlabFetch<GitLabCommit[]>(url.toString());
      if (commits.length === 0) break;

      for (const commit of commits) {
        const filePaths = await this.fetchCommitFilePaths(options.repoFullName, commit.id);
        yield this.normalizeCommit(commit, options.repoFullName, filePaths);
      }

      if (commits.length < (options.pageSize ?? 100)) break;
      page += 1;
    }
  }

  /**
   * Fetch commits with time-bucketed sampling for comprehensive repository coverage.
   * GitLab supports since/until parameters, enabling proper time-bucketed sampling.
   */
  async fetchCommitsSampled(options: FetchCommitsSampledOptions): Promise<NormalizedCommit[]> {
    const { owner, repo, maxCommits, repoFullName } = options;

    // Fetch project metadata to get timeline
    const project = await this.gitlabFetch<GitLabProject>(
      `${this.baseUrl}/projects/${encodeURIComponent(repoFullName)}`
    );

    const startMs = new Date(project.created_at).getTime();
    const endMs = new Date(project.last_activity_at).getTime();

    // Fall back to recent commits if timeline is invalid
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      return this.fetchCommitsRecent({ repoFullName, maxCommits });
    }

    // Calculate time buckets
    const target = Math.max(1, maxCommits);
    const bucketCount = Math.min(24, Math.max(6, Math.ceil(target / 25)));
    const perBucketTarget = Math.max(1, Math.ceil(target / bucketCount));
    const bucketMs = Math.max(1, Math.floor((endMs - startMs) / bucketCount));

    const bySha = new Map<string, GitLabCommit>();

    // Fetch from each time bucket
    for (let i = 0; i < bucketCount; i += 1) {
      const since = new Date(startMs + bucketMs * i);
      const until = new Date(i === bucketCount - 1 ? endMs : startMs + bucketMs * (i + 1));

      const url = new URL(
        `${this.baseUrl}/projects/${encodeURIComponent(repoFullName)}/repository/commits`
      );
      url.searchParams.set("per_page", "100");
      url.searchParams.set("with_stats", "true");
      url.searchParams.set("since", since.toISOString());
      url.searchParams.set("until", until.toISOString());

      const bucketItems = await this.gitlabFetch<GitLabCommit[]>(url.toString());
      const sampled = sampleEvenly(bucketItems, perBucketTarget);
      for (const item of sampled) {
        bySha.set(item.id, item);
      }
    }

    // Sort by committed date descending
    const descByCommittedDate = (a: GitLabCommit, b: GitLabCommit): number =>
      new Date(b.committed_date).getTime() - new Date(a.committed_date).getTime();

    let combined = Array.from(bySha.values()).sort(descByCommittedDate);

    // Fill with recent commits if not enough
    if (combined.length < target) {
      const fallbackCommits = await this.fetchCommitListRecent({ repoFullName, maxCommits: target });
      for (const item of fallbackCommits) {
        if (!bySha.has(item.id)) bySha.set(item.id, item);
        if (bySha.size >= target) break;
      }
      combined = Array.from(bySha.values()).sort(descByCommittedDate);
    }

    const commitList = combined.slice(0, target);

    // Fetch file paths for each commit
    const results: NormalizedCommit[] = [];
    for (const commit of commitList) {
      const filePaths = await this.fetchCommitFilePaths(repoFullName, commit.id);
      results.push(this.normalizeCommit(commit, repoFullName, filePaths));
    }

    return results;
  }

  private async fetchCommitsRecent(options: {
    repoFullName: string;
    maxCommits: number;
  }): Promise<NormalizedCommit[]> {
    const commits = await this.fetchCommitListRecent(options);
    const results: NormalizedCommit[] = [];

    for (const commit of commits) {
      const filePaths = await this.fetchCommitFilePaths(options.repoFullName, commit.id);
      results.push(this.normalizeCommit(commit, options.repoFullName, filePaths));
    }

    return results;
  }

  private async fetchCommitListRecent(options: {
    repoFullName: string;
    maxCommits: number;
  }): Promise<GitLabCommit[]> {
    const items: GitLabCommit[] = [];
    let page = 1;

    while (items.length < options.maxCommits) {
      const url = new URL(
        `${this.baseUrl}/projects/${encodeURIComponent(options.repoFullName)}/repository/commits`
      );
      url.searchParams.set("per_page", "100");
      url.searchParams.set("page", String(page));
      url.searchParams.set("with_stats", "true");

      const batch = await this.gitlabFetch<GitLabCommit[]>(url.toString());
      items.push(...batch);

      if (batch.length < 100) break;
      page += 1;
      if (page > 20) break;
    }

    return items.slice(0, options.maxCommits);
  }

  private async fetchCommitFilePaths(repoFullName: string, commitId: string): Promise<string[]> {
    try {
      const diffFiles = await this.gitlabFetch<{ new_path: string }[]>(
        `${this.baseUrl}/projects/${encodeURIComponent(repoFullName)}/repository/commits/${commitId}/diff`
      );
      return diffFiles.map((file) => file.new_path).filter(Boolean);
    } catch {
      // Return empty array if diff fetch fails
      return [];
    }
  }

  private normalizeCommit(
    commit: GitLabCommit,
    repoFullName: string,
    filePaths: string[]
  ): NormalizedCommit {
    return {
      sha: commit.id,
      message: commit.message,
      authoredAt: new Date(commit.authored_date),
      committedAt: new Date(commit.committed_date),
      authorName: commit.author_name,
      authorEmail: commit.author_email,
      additions: commit.stats?.additions,
      deletions: commit.stats?.deletions,
      filesChanged: commit.stats?.total,
      filePaths,
      parents: commit.parent_ids,
      platform: this.platform,
      platformUrl: `https://gitlab.com/${repoFullName}/-/commit/${commit.id}`,
    };
  }
}
