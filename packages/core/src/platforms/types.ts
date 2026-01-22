export type PlatformType = "github" | "gitlab" | "bitbucket";

export interface FetchCommitsOptions {
  repoFullName: string;
  owner: string;
  repo: string;
  accessToken: string;
  since?: Date;
  until?: Date;
  pageSize?: number;
}

export interface NormalizedCommit {
  sha: string;
  message: string;
  authoredAt: Date;
  committedAt: Date;
  authorName: string;
  authorEmail: string;
  additions?: number;
  deletions?: number;
  filesChanged?: number;
  filePaths: string[];
  parents: string[];
  platform: PlatformType;
  platformUrl: string;
}

export interface PlatformRepo {
  id: string;
  name: string;
  fullName: string;
  owner: string;
  isPrivate: boolean;
  defaultBranch: string;
  platform: PlatformType;
  platformUrl: string;
}

export interface RepoLister {
  listRepos(): AsyncGenerator<PlatformRepo>;
}

export interface CommitFetcher {
  fetchCommits(options: FetchCommitsOptions): AsyncGenerator<NormalizedCommit>;
}
