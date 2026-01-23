import type {
  CommitFetcher,
  FetchCommitsOptions,
  NormalizedCommit,
  PlatformRepo,
  RepoLister,
} from "./types";

type GitLabProject = {
  id: number;
  name: string;
  path_with_namespace: string;
  visibility: "private" | "public" | "internal";
  default_branch: string;
  web_url: string;
  namespace: { name: string };
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
  stats: { total: number; additions: number; deletions: number };
};

export class GitLabClient implements CommitFetcher, RepoLister {
  public readonly platform = "gitlab" as const;
  private readonly baseUrl = "https://gitlab.com/api/v4";

  constructor(private readonly accessToken: string, private readonly fetcher: typeof fetch = fetch) {}

  private async gitlabFetch<T>(url: string): Promise<T> {
    const res = await this.fetcher(url, {
      headers: {
        "PRIVATE-TOKEN": this.accessToken,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const body = await res.text();
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
      const url = new URL(`${this.baseUrl}/projects/${encodeURIComponent(options.repoFullName)}/repository/commits`);
      url.searchParams.set("per_page", String(options.pageSize ?? 100));
      url.searchParams.set("page", String(page));
      if (options.since) url.searchParams.set("since", options.since.toISOString());
      if (options.until) url.searchParams.set("until", options.until.toISOString());

      const commits = await this.gitlabFetch<GitLabCommit[]>(url.toString());
      if (commits.length === 0) break;

      for (const commit of commits) {
        const diffFiles = await this.gitlabFetch<{ new_path: string }[]>(
          `${this.baseUrl}/projects/${encodeURIComponent(options.repoFullName)}/repository/commits/${commit.id}/diff`
        );

        yield {
          sha: commit.id,
          message: commit.message,
          authoredAt: new Date(commit.authored_date),
          committedAt: new Date(commit.committed_date),
          authorName: commit.author_name,
          authorEmail: commit.author_email,
          additions: commit.stats?.additions,
          deletions: commit.stats?.deletions,
          filesChanged: commit.stats?.total,
          filePaths: diffFiles.map((file) => file.new_path).filter(Boolean),
          parents: commit.parent_ids,
          platform: this.platform,
          platformUrl: `${options.repoFullName}/-/commit/${commit.id}`,
        };
      }

      if (commits.length < (options.pageSize ?? 100)) break;
      page += 1;
    }
  }
}
