import type {
  CommitFetcher,
  FetchCommitsOptions,
  NormalizedCommit,
  PlatformRepo,
  RepoLister,
} from "./types";

export class BitbucketClient implements CommitFetcher, RepoLister {
  public readonly platform = "bitbucket" as const;

  constructor(private readonly accessToken: string) {}

  async *fetchCommits(_options: FetchCommitsOptions): AsyncGenerator<NormalizedCommit> {
    // TODO: implement Bitbucket diffstat calls to gather file paths.
    return;
  }

  async *listRepos(): AsyncGenerator<PlatformRepo> {
    return;
  }
}
