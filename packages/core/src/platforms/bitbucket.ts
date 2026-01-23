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

type BitbucketRepo = {
  uuid: string;
  name: string;
  full_name: string;
  owner: { username: string };
  is_private: boolean;
  mainbranch?: { name: string };
  links: { html: { href: string } };
};

type BitbucketCommit = {
  hash: string;
  message: string;
  date: string;
  author: {
    raw: string;
    user?: { display_name: string };
  };
  parents: Array<{ hash: string }>;
};

type BitbucketDiffStat = {
  values: Array<{ new?: { path: string }; lines_added?: number; lines_removed?: number }>;
  next?: string;
};

const PLATFORM: PlatformType = "bitbucket";

export class BitbucketClient implements CommitFetcher, RepoLister {
  public readonly platform = PLATFORM;
  private readonly baseUrl = "https://api.bitbucket.org/2.0";

  constructor(
    private readonly accessToken: string,
    private readonly fetcher: typeof fetch = fetch
  ) {}

  private async bitbucketFetch<T>(url: string): Promise<T> {
    const res = await this.fetcher(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
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

      throw new Error(`Bitbucket API error (${res.status}): ${body}`);
    }

    return (await res.json()) as T;
  }

  async *listRepos(): AsyncGenerator<PlatformRepo> {
    let nextUrl = `${this.baseUrl}/repositories?role=member&pagelen=100`;
    while (nextUrl) {
      const page = await this.bitbucketFetch<{ next?: string; values: BitbucketRepo[] }>(nextUrl);
      for (const repo of page.values) {
        yield {
          id: repo.uuid,
          name: repo.name,
          fullName: repo.full_name,
          owner: repo.owner.username,
          isPrivate: repo.is_private,
          defaultBranch: repo.mainbranch?.name ?? "main",
          platform: this.platform,
          platformUrl: repo.links.html.href,
        };
      }
      nextUrl = page.next ?? "";
    }
  }

  async *fetchCommits(options: FetchCommitsOptions): AsyncGenerator<NormalizedCommit> {
    let url = `${this.baseUrl}/repositories/${options.repoFullName}/commits`;
    let count = 0;
    const limit = options.pageSize ?? 100;

    do {
      const page = await this.bitbucketFetch<{ next?: string; values: BitbucketCommit[] }>(url);
      for (const commit of page.values) {
        if (count >= limit) break;
        const normalized = await this.normalizeCommit(commit, options.repoFullName);
        yield normalized;
        count++;
      }
      url = page.next ?? "";
    } while (url && count < limit);
  }

  /**
   * Fetch commits with sampling. Bitbucket doesn't support date filtering,
   * so this falls back to fetching recent commits.
   */
  async fetchCommitsSampled(options: FetchCommitsSampledOptions): Promise<NormalizedCommit[]> {
    const { repoFullName, maxCommits } = options;
    const commits: NormalizedCommit[] = [];

    let url = `${this.baseUrl}/repositories/${repoFullName}/commits`;

    while (commits.length < maxCommits && url) {
      const page = await this.bitbucketFetch<{ next?: string; values: BitbucketCommit[] }>(url);

      for (const commit of page.values) {
        if (commits.length >= maxCommits) break;
        const normalized = await this.normalizeCommit(commit, repoFullName);
        commits.push(normalized);
      }

      url = page.next ?? "";
    }

    return commits;
  }

  private async normalizeCommit(
    commit: BitbucketCommit,
    repoFullName: string
  ): Promise<NormalizedCommit> {
    // Fetch diffstat for file paths and stats
    const { filePaths, additions, deletions } = await this.fetchDiffStat(repoFullName, commit.hash);

    // Parse email from author.raw (format: "Name <email@example.com>")
    const emailMatch = commit.author.raw.match(/<([^>]+)>/);
    const authorEmail = emailMatch ? emailMatch[1] : "";

    return {
      sha: commit.hash,
      message: commit.message,
      authoredAt: new Date(commit.date),
      committedAt: new Date(commit.date),
      authorName: commit.author.user?.display_name ?? commit.author.raw.split("<")[0].trim(),
      authorEmail,
      additions,
      deletions,
      filesChanged: filePaths.length,
      filePaths,
      parents: commit.parents.map((p) => p.hash),
      platform: this.platform,
      platformUrl: `https://bitbucket.org/${repoFullName}/commits/${commit.hash}`,
    };
  }

  private async fetchDiffStat(
    repoFullName: string,
    commitHash: string
  ): Promise<{ filePaths: string[]; additions: number; deletions: number }> {
    try {
      const filePaths: string[] = [];
      let additions = 0;
      let deletions = 0;

      let nextUrl: string | undefined =
        `${this.baseUrl}/repositories/${repoFullName}/diffstat/${commitHash}`;

      while (nextUrl) {
        const currentUrl = nextUrl;
        nextUrl = undefined;

        const diff: BitbucketDiffStat = await this.bitbucketFetch<BitbucketDiffStat>(currentUrl);

        for (const file of diff.values) {
          if (file.new?.path) {
            filePaths.push(file.new.path);
          }
          additions += file.lines_added ?? 0;
          deletions += file.lines_removed ?? 0;
        }

        nextUrl = diff.next;
      }

      return { filePaths, additions, deletions };
    } catch {
      // Return empty data if diffstat fetch fails
      return { filePaths: [], additions: 0, deletions: 0 };
    }
  }
}
