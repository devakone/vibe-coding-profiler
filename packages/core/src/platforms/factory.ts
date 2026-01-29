import { BitbucketClient } from "./bitbucket";
import { GitHubClient } from "./github";
import { GitLabClient } from "./gitlab";
import type { CommitFetcher, PlatformType, RepoLister } from "./types";

export function createCommitFetcher(platform: PlatformType, token: string): CommitFetcher {
  switch (platform) {
    case "github":
      return new GitHubClient(token);
    case "gitlab":
      return new GitLabClient(token);
    case "bitbucket":
      return new BitbucketClient(token);
    default:
      throw new Error(`Unsupported platform ${platform}`);
  }
}

export function createRepoLister(platform: PlatformType, token: string): RepoLister {
  switch (platform) {
    case "github":
      return new GitHubClient(token);
    case "gitlab":
      return new GitLabClient(token);
    case "bitbucket":
      return new BitbucketClient(token);
    default:
      throw new Error(`Unsupported platform ${platform}`);
  }
}
