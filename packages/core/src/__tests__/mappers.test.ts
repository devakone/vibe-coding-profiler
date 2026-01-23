import { describe, expect, it } from "vitest";
import { normalizedCommitToVibeEvent } from "../platforms/mappers";
import type { NormalizedCommit } from "../platforms/types";

describe("normalizedCommitToVibeEvent", () => {
  it("transforms a complete NormalizedCommit to VibeCommitEvent", () => {
    const commit: NormalizedCommit = {
      sha: "abc123def456",
      message: "feat: add new feature",
      authoredAt: new Date("2025-01-15T10:30:00Z"),
      committedAt: new Date("2025-01-15T11:00:00Z"),
      authorName: "Test Author",
      authorEmail: "test@example.com",
      additions: 100,
      deletions: 20,
      filesChanged: 5,
      filePaths: ["src/index.ts", "src/utils.ts", "tests/index.test.ts"],
      parents: ["parent1", "parent2"],
      platform: "github",
      platformUrl: "https://github.com/user/repo/commit/abc123def456",
    };

    const result = normalizedCommitToVibeEvent(commit);

    expect(result.sha).toBe("abc123def456");
    expect(result.message).toBe("feat: add new feature");
    expect(result.author_date).toBe("2025-01-15T10:30:00.000Z");
    expect(result.committer_date).toBe("2025-01-15T11:00:00.000Z");
    expect(result.author_email).toBe("test@example.com");
    expect(result.files_changed).toBe(5);
    expect(result.additions).toBe(100);
    expect(result.deletions).toBe(20);
    expect(result.parents).toEqual(["parent1", "parent2"]);
    expect(result.file_paths).toEqual(["src/index.ts", "src/utils.ts", "tests/index.test.ts"]);
  });

  it("handles missing optional fields with defaults", () => {
    const commit: NormalizedCommit = {
      sha: "minimal123",
      message: "chore: minimal commit",
      authoredAt: new Date("2025-01-10T08:00:00Z"),
      committedAt: new Date("2025-01-10T08:00:00Z"),
      authorName: "Author",
      authorEmail: "author@example.com",
      filePaths: [],
      parents: [],
      platform: "gitlab",
      platformUrl: "https://gitlab.com/user/repo/-/commit/minimal123",
      // additions, deletions, filesChanged are undefined
    };

    const result = normalizedCommitToVibeEvent(commit);

    expect(result.sha).toBe("minimal123");
    expect(result.additions).toBe(0);
    expect(result.deletions).toBe(0);
    expect(result.files_changed).toBe(0);
    expect(result.file_paths).toEqual([]);
    expect(result.parents).toEqual([]);
  });

  it("uses filePaths.length when filesChanged is undefined", () => {
    const commit: NormalizedCommit = {
      sha: "files123",
      message: "test: file count fallback",
      authoredAt: new Date("2025-01-12T12:00:00Z"),
      committedAt: new Date("2025-01-12T12:00:00Z"),
      authorName: "Tester",
      authorEmail: "tester@example.com",
      filePaths: ["a.ts", "b.ts", "c.ts"],
      parents: ["base"],
      platform: "bitbucket",
      platformUrl: "https://bitbucket.org/user/repo/commits/files123",
      additions: 50,
      deletions: 10,
      // filesChanged is undefined
    };

    const result = normalizedCommitToVibeEvent(commit);

    // Should use filePaths.length as fallback
    expect(result.files_changed).toBe(3);
  });

  it("preserves all platform types", () => {
    const platforms = ["github", "gitlab", "bitbucket"] as const;

    for (const platform of platforms) {
      const commit: NormalizedCommit = {
        sha: `${platform}-sha`,
        message: `commit from ${platform}`,
        authoredAt: new Date(),
        committedAt: new Date(),
        authorName: "Dev",
        authorEmail: "dev@example.com",
        filePaths: [],
        parents: [],
        platform,
        platformUrl: `https://${platform}.com/commit`,
      };

      const result = normalizedCommitToVibeEvent(commit);

      // The VibeCommitEvent doesn't include platform, but we verify the mapping works
      expect(result.sha).toBe(`${platform}-sha`);
      expect(result.message).toBe(`commit from ${platform}`);
    }
  });
});
