import { describe, expect, it, vi } from "vitest";
import { BitbucketClient } from "../platforms/bitbucket";
import { GitHubClient } from "../platforms/github";
import { GitLabClient } from "../platforms/gitlab";
import type { NormalizedCommit } from "../platforms/types";

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

  it("GitLab client normalizes commit details", async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url.includes("/repository/commits/") && url.includes("/diff")) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            { new_path: "src/app.ts" },
            { new_path: "src/utils.ts" },
          ],
          text: async () => "[]",
        };
      }

      if (url.includes("/repository/commits")) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              id: "gl-1",
              short_id: "gl-1",
              title: "title",
              message: "feat: add",
              author_name: "GL Author",
              author_email: "gl@author.com",
              authored_date: "2025-01-02T00:00:00Z",
              committed_date: "2025-01-02T01:00:00Z",
              parent_ids: ["gl-base"],
              stats: { total: 2, additions: 5, deletions: 3 },
            },
          ],
          text: async () => "[]",
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => [],
        text: async () => "[]",
      };
    });

    const client = new GitLabClient("token", fetcher as typeof fetch);
    const commits: NormalizedCommit[] = [];
    for await (const commit of client.fetchCommits({
      repoFullName: "user/app",
      owner: "user",
      repo: "app",
      accessToken: "token",
    })) {
      commits.push(commit);
    }

    expect(commits).toHaveLength(1);
    expect(commits[0].platform).toBe("gitlab");
    expect(commits[0].filePaths).toContain("src/app.ts");
    expect(commits[0].additions).toBe(5);
    expect(commits[0].platformUrl).toContain("user/app");
  });

  it("Bitbucket client normalizes commit details", async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url.includes("/diffstat")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ values: [{ new: { path: "src/main.ts" } }] }),
          text: async () => "[]",
        };
      }

      if (url.includes("/commits")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            values: [
              {
                hash: "bb-1",
                message: "fix: bug",
                date: "2025-01-03T00:00:00Z",
                author: { raw: "Dev <dev@bb.com>", user: { display_name: "BB Dev" } },
                parents: [{ hash: "bb-base" }],
              },
            ],
          }),
          text: async () => "[]",
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ next: undefined, values: [] }),
        text: async () => "[]",
      };
    });

    const client = new BitbucketClient("token", fetcher as typeof fetch);
    const commits: NormalizedCommit[] = [];
    for await (const commit of client.fetchCommits({
      repoFullName: "user/project",
      owner: "user",
      repo: "project",
      accessToken: "token",
    })) {
      commits.push(commit);
    }

    expect(commits).toHaveLength(1);
    expect(commits[0].platform).toBe("bitbucket");
    expect(commits[0].authorName).toBe("BB Dev");
    expect(commits[0].filePaths).toContain("src/main.ts");
  });
});
