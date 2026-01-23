import type {
  CommitFetcher,
  FetchCommitsOptions,
  NormalizedCommit,
  PlatformRepo,
  RepoLister,
} from "./types";

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
  values: Array<{ new?: { path: string } }>;
};

export class BitbucketClient implements CommitFetcher, RepoLister {
  public readonly platform = "bitbucket" as const;
  private readonly baseUrl = "https://api.bitbucket.org/2.0";

  constructor(private readonly accessToken: string, private readonly fetcher: typeof fetch = fetch) {}

  private async bitbucketFetch<T>(url: string): Promise<T> {
    const res = await this.fetcher(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });
    if (!res.ok) {
      const body = await res.text();
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
    do {
      const page = await this.bitbucketFetch<{ next?: string; values: BitbucketCommit[] }>(url);
      for (const commit of page.values) {
        const diff = await this.bitbucketFetch<BitbucketDiffStat>(
          `${this.baseUrl}/repositories/${options.repoFullName}/diffstat/${commit.hash}`
        );

        yield {
          sha: commit.hash,
          message: commit.message,
          authoredAt: new Date(commit.date),
          committedAt: new Date(commit.date),
          authorName: commit.author.user?.display_name ?? commit.author.raw,
          authorEmail: commit.author.raw.split("<")[1]?.replace(">", "") ?? "",
          filePaths: diff.values.map((file) => file.new?.path ?? "").filter(Boolean),
          parents: commit.parents.map((p) => p.hash),
          platform: this.platform,
          platformUrl: `${options.repoFullName}/commits/${commit.hash}`,
        };
      }
      url = page.next ?? "";
    } while (url);
  }
}
