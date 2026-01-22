import { describe, expect, it, vi } from "vitest";
import { BitbucketClient } from "../platforms/bitbucket";
import { GitHubClient } from "../platforms/github";
import { GitLabClient } from "../platforms/gitlab";

describe("PlatformClient surface", () => {
  it("should expose all platform IDs", () => {
    const hub = new GitHubClient("token");
    const lab = new GitLabClient("token");
    const bit = new BitbucketClient("token");

    expect(hub.platform).toBe("github");
    expect(lab.platform).toBe("gitlab");
    expect(bit.platform).toBe("bitbucket");
  });

  it("should normalize GitHub repos and commits", async () => {
    const responses: Array<{
      urlMatcher: (url: string) => boolean;
      payload: unknown;
    }> = [
      {
        urlMatcher: (url) => url.includes("/user/repos"),
        payload: [
          {
            id: 1,
            name: "repo",
            full_name: "user/repo",
            private: false,
            default_branch: "main",
            owner: { login: "user" },
            html_url: "https://github.com/user/repo",
          },
        ],
      },
      {
        urlMatcher: (url) => /\/repos\/.+\/commits(\?|$)/.test(url),
        payload: [
          {
            sha: "abc",
            parents: [{ sha: "parent" }],
            commit: {
              message: "feat: add",
              author: { name: "Author", email: "author@example.com", date: "2025-01-01T00:00:00Z" },
              committer: { email: "committer@example.com", date: "2025-01-01T01:00:00Z" },
            },
          },
        ],
      },
      {
        urlMatcher: (url) => /\/repos\/.+\/commits\/abc$/.test(url),
        payload: {
          sha: "abc",
          parents: [{ sha: "parent" }],
          commit: {
            message: "feat: add",
            author: { name: "Author", email: "author@example.com", date: "2025-01-01T00:00:00Z" },
            committer: { email: "committer@example.com", date: "2025-01-01T01:00:00Z" },
          },
          files: [{ filename: "src/index.ts" }],
          html_url: "https://github.com/user/repo/commit/abc",
          stats: { additions: 10, deletions: 5, total: 15 },
        },
      },
    ];

    const fetcher = vi.fn(async (url: string) => {
      const response = responses.find((resp) => resp.urlMatcher(url));
      if (!response) throw new Error(`Unexpected URL ${url}`);
      return {
        ok: true,
        status: 200,
        json: async () => response.payload,
        text: async () => JSON.stringify(response.payload),
      };
    });

    const client = new GitHubClient("token", fetcher as unknown as typeof globalThis.fetch);

    const repoIterator = client.listRepos();
    const firstRepo = await repoIterator.next();
    expect(firstRepo.value).toEqual({
      id: "1",
      name: "repo",
      fullName: "user/repo",
      owner: "user",
      isPrivate: false,
      defaultBranch: "main",
      platform: "github",
      platformUrl: "https://github.com/user/repo",
    });

    const commits: unknown[] = [];
    for await (const commit of client.fetchCommits({
      repoFullName: "user/repo",
      owner: "user",
      repo: "repo",
      accessToken: "token",
    })) {
      commits.push(commit);
    }

    expect(commits).toHaveLength(1);
    expect((commits[0] as any).platform).toBe("github");
    expect((commits[0] as any).platformUrl).toBe("https://github.com/user/repo/commit/abc");
  });
});
