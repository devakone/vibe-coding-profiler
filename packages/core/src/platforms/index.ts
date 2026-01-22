export * from "./types";
export * from "./github";
export * from "./gitlab";
export * from "./bitbucket";

import type { PlatformType, CommitFetcher, RepoLister } from "./types";
import { GitHubClient } from "./github";
import { GitLabClient } from "./gitlab";
import { BitbucketClient } from "./bitbucket";

export function createCommitFetcher(
  platform: PlatformType,
  token: string
): CommitFetcher {
  switch (platform) {
    case "github":
      return new GitHubClient(token);
    case "gitlab":
      return new GitLabClient(token);
    case "bitbucket":
      return new BitbucketClient(token);
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

export function createRepoLister(
  platform: PlatformType,
  token: string
): RepoLister {
  switch (platform) {
    case "github":
      return new GitHubClient(token);
    case "gitlab":
      return new GitLabClient(token);
    case "bitbucket":
      return new BitbucketClient(token);
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}
