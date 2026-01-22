import type {
  CommitFetcher,
  FetchCommitsOptions,
  NormalizedCommit,
  PlatformRepo,
  RepoLister,
} from "./types";

export class GitLabClient implements CommitFetcher, RepoLister {
  public readonly platform = "gitlab" as const;

  constructor(private readonly accessToken: string) {}

  async *fetchCommits(_options: FetchCommitsOptions): AsyncGenerator<NormalizedCommit> {
    // TODO: implement GitLab API requests (diff endpoints) and return file paths.
    return;
  }

  async *listRepos(): AsyncGenerator<PlatformRepo> {
    return;
  }
}
