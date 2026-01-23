import { describe, expect, it, vi } from "vitest";
import { BitbucketClient } from "../platforms/bitbucket";
import { GitHubClient } from "../platforms/github";
import { GitLabClient } from "../platforms/gitlab";

describe("Platform client normalization", () => {
  it("GitHub client yields normalized commits + repos", async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url.includes("/user/repos")) {
        return {
          ok: true,
          status: 200,
          json: async () => [
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
          text: async () => "[]",
        };
      }
      if (url.includes("/commits/abc")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            sha: "abc",
            parents: [{ sha: "p" }],
            commit: {
              message: "msg",
              author: { name: "Author", email: "a@a.com", date: "2025-01-01T00:00:00Z" },
              committer: { email: "c@c.com", date: "2025-01-01T01:00:00Z" },
            },
            files: [{ filename: "x.ts" }],
            html_url: "https://github.com/user/repo/commit/abc",
            stats: { additions: 1, deletions: 0, total: 1 },
          }),
          text: async () => "",
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => [
          {
            sha: "abc",
            parents: [{ sha: "p" }],
            commit: {
              message: "msg",
              author: { name: "Author", email: "a@a.com", date: "2025-01-01T00:00:00Z" },
              committer: { email: "c@c.com", date: "2025-01-01T01:00:00Z" },
            },
          },
        ],
        text: async () => "",
      };
    });

    const client = new GitHubClient("token", fetcher as typeof fetch);
    const repo = await client.listRepos().next();
    expect(repo.value?.platform).toBe("github");
    const commits = [];
    for await (const commit of client.fetchCommits({
      repoFullName: "user/repo",
      owner: "user",
      repo: "repo",
      accessToken: "token",
    })) {
      commits.push(commit);
    }
    expect(commits[0].platform).toBe("github");
  });

  it("GitLab client returns normalized repos", async () => {
    const fetcher = vi.fn(async (url: string) => ({
      ok: true,
      status: 200,
      json: async () => {
        if (url.includes("/projects")) {
          return [
            {
              id: 2,
              name: "app",
              path_with_namespace: "user/app",
              visibility: "private",
              default_branch: "main",
              web_url: "https://gitlab.com/user/app",
              namespace: { name: "user" },
            },
          ];
        }
        return [];
      },
      text: async () => "[]",
    }));

    const client = new GitLabClient("token", fetcher as typeof fetch);
    const repo = await client.listRepos().next();
    expect(repo.value?.platform).toBe("gitlab");
  });

  it("Bitbucket client reports platform metadata", async () => {
    const fetcher = vi.fn(async (url: string) => ({
      ok: true,
      status: 200,
      json: async () => ({
        values: [
          {
            uuid: "{1}",
            name: "project",
            full_name: "user/project",
            owner: { username: "user" },
            is_private: true,
            links: { html: { href: "https://bitbucket.org/user/project" } },
          },
        ],
        next: undefined,
      }),
      text: async () => "[]",
    }));

    const client = new BitbucketClient("token", fetcher as typeof fetch);
    const repo = await client.listRepos().next();
    expect(repo.value?.platform).toBe("bitbucket");
  });
});
