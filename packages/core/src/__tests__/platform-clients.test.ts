import { describe, expect, it, vi } from "vitest";
import { BitbucketClient } from "../platforms/bitbucket";
import { GitHubClient } from "../platforms/github";
import { GitLabClient } from "../platforms/gitlab";
import type { NormalizedCommit } from "../platforms/types";

// Helper to create mock fetch responses
function mockResponse<T>(data: T, status = 200): Partial<Response> {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

describe("Platform client normalization", () => {
  it("GitHub client yields normalized commits + repos", async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url.includes("/user/repos")) {
        return mockResponse([
          {
            id: 1,
            name: "repo",
            full_name: "user/repo",
            private: false,
            default_branch: "main",
            owner: { login: "user" },
            html_url: "https://github.com/user/repo",
          },
        ]);
      }
      if (url.includes("/commits/abc")) {
        return mockResponse({
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
        });
      }
      return mockResponse([
        {
          sha: "abc",
          parents: [{ sha: "p" }],
          commit: {
            message: "msg",
            author: { name: "Author", email: "a@a.com", date: "2025-01-01T00:00:00Z" },
            committer: { email: "c@c.com", date: "2025-01-01T01:00:00Z" },
          },
        },
      ]);
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
    const fetcher = vi.fn(async (url: string) => {
      if (url.includes("/projects")) {
        return mockResponse([
          {
            id: 2,
            name: "app",
            path_with_namespace: "user/app",
            visibility: "private",
            default_branch: "main",
            web_url: "https://gitlab.com/user/app",
            namespace: { name: "user" },
          },
        ]);
      }
      return mockResponse([]);
    });

    const client = new GitLabClient("token", fetcher as typeof fetch);
    const repo = await client.listRepos().next();
    expect(repo.value?.platform).toBe("gitlab");
  });

  it("Bitbucket client reports platform metadata", async () => {
    const fetcher = vi.fn(async () =>
      mockResponse({
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
      })
    );

    const client = new BitbucketClient("token", fetcher as typeof fetch);
    const repo = await client.listRepos().next();
    expect(repo.value?.platform).toBe("bitbucket");
  });

  it("GitLab client normalizes commit details", async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url.includes("/repository/commits/") && url.includes("/diff")) {
        return mockResponse([{ new_path: "src/app.ts" }, { new_path: "src/utils.ts" }]);
      }

      if (url.includes("/repository/commits")) {
        return mockResponse([
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
        ]);
      }

      return mockResponse([]);
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
        return mockResponse({ values: [{ new: { path: "src/main.ts" } }] });
      }

      if (url.includes("/commits")) {
        return mockResponse({
          values: [
            {
              hash: "bb-1",
              message: "fix: bug",
              date: "2025-01-03T00:00:00Z",
              author: { raw: "Dev <dev@bb.com>", user: { display_name: "BB Dev" } },
              parents: [{ hash: "bb-base" }],
            },
          ],
        });
      }

      return mockResponse({ next: undefined, values: [] });
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
