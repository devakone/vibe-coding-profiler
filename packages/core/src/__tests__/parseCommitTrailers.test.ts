import { describe, it, expect } from "vitest";
import { parseCommitTrailers, identifyAITool } from "../index";
import { extractAIToolMetrics } from "../vibe";

describe("parseCommitTrailers", () => {
  it("parses Co-authored-by trailer after blank line", () => {
    const message = `feat: add new feature

This is the body of the commit message.

Co-authored-by: Alice <alice@example.com>`;

    const trailers = parseCommitTrailers(message);
    expect(trailers).toHaveLength(1);
    expect(trailers[0]).toEqual({
      name: "Co-authored-by",
      value: "Alice <alice@example.com>",
    });
  });

  it("parses multiple trailers", () => {
    const message = `fix: resolve bug

Fixed the issue with login.

Co-authored-by: Alice <alice@example.com>
Signed-off-by: Bob <bob@example.com>
Reviewed-by: Charlie <charlie@example.com>`;

    const trailers = parseCommitTrailers(message);
    expect(trailers).toHaveLength(3);
    expect(trailers.map((t) => t.name)).toContain("Co-authored-by");
    expect(trailers.map((t) => t.name)).toContain("Signed-off-by");
    expect(trailers.map((t) => t.name)).toContain("Reviewed-by");
  });

  it("detects AI trailers with claude in value", () => {
    const message = `feat: implement feature

This adds a new feature.

Co-authored-by: Claude <noreply@anthropic.com>`;

    const trailers = parseCommitTrailers(message);
    expect(trailers).toHaveLength(1);
    expect(trailers[0].value.toLowerCase()).toContain("claude");
  });

  it("detects AI trailers with copilot in value", () => {
    const message = `feat: add component

Added a new component.

Co-authored-by: GitHub Copilot <copilot@github.com>`;

    const trailers = parseCommitTrailers(message);
    expect(trailers).toHaveLength(1);
    expect(trailers[0].value.toLowerCase()).toContain("copilot");
  });

  it("detects Generated-by trailer", () => {
    const message = `chore: update config

Updated the configuration.

Generated-by: cursor-ai`;

    const trailers = parseCommitTrailers(message);
    expect(trailers).toHaveLength(1);
    expect(trailers[0].name).toBe("Generated-by");
  });

  it("detects AI-assisted-by trailer", () => {
    const message = `feat: new feature

Added new functionality.

AI-assisted-by: claude-3.5-sonnet`;

    const trailers = parseCommitTrailers(message);
    expect(trailers).toHaveLength(1);
    expect(trailers[0].name).toBe("AI-assisted-by");
  });

  it("handles messages without trailers - body only", () => {
    const message = `feat: simple commit

Just a regular commit message without any trailers at the end.
This is more body text.`;

    const trailers = parseCommitTrailers(message);
    expect(trailers).toHaveLength(0);
  });

  it("handles empty message", () => {
    const trailers = parseCommitTrailers("");
    expect(trailers).toHaveLength(0);
  });

  it("handles message with only subject line - no blank line", () => {
    const message = "fix: quick fix";
    const trailers = parseCommitTrailers(message);
    // No blank line means no trailer section
    expect(trailers).toHaveLength(0);
  });

  it("supports lowercase trailer names", () => {
    const message = `fix: bug fix

Fixed the bug.

signed-off-by: Developer <dev@example.com>`;

    const trailers = parseCommitTrailers(message);
    expect(trailers).toHaveLength(1);
    expect(trailers[0].name).toBe("signed-off-by");
  });

  it("trailers must be at the end after blank line", () => {
    const message = `feat: feature

This is body text.

Co-authored-by: Real Trailer <real@example.com>`;

    const trailers = parseCommitTrailers(message);
    expect(trailers).toHaveLength(1);
    expect(trailers[0].name).toBe("Co-authored-by");
  });

  it("parses consecutive trailers at end", () => {
    const message = `feat: feature

Some body text here.

Co-authored-by: Alice <alice@example.com>
Signed-off-by: Bob <bob@example.com>`;

    const trailers = parseCommitTrailers(message);
    expect(trailers).toHaveLength(2);
    expect(trailers.map((t) => t.name)).toContain("Co-authored-by");
    expect(trailers.map((t) => t.name)).toContain("Signed-off-by");
  });
});

describe("identifyAITool", () => {
  it("identifies Claude from co-author value", () => {
    expect(identifyAITool("Claude <noreply@anthropic.com>")).toBe("claude");
  });

  it("identifies Claude from anthropic domain", () => {
    expect(identifyAITool("AI Assistant <assistant@anthropic.com>")).toBe("claude");
  });

  it("identifies GitHub Copilot", () => {
    expect(identifyAITool("GitHub Copilot <copilot@github.com>")).toBe("copilot");
  });

  it("identifies Cursor", () => {
    expect(identifyAITool("Cursor AI <cursor@cursor.sh>")).toBe("cursor");
  });

  it("identifies Aider", () => {
    expect(identifyAITool("aider <aider@aider.chat>")).toBe("aider");
  });

  it("identifies Cline", () => {
    expect(identifyAITool("Cline Bot <cline@bot.dev>")).toBe("cline");
  });

  it("identifies Roo Code", () => {
    expect(identifyAITool("Roo <roo@example.com>")).toBe("roo");
  });

  it("identifies Windsurf via codeium", () => {
    expect(identifyAITool("Codeium AI <noreply@codeium.com>")).toBe("windsurf");
  });

  it("identifies Devin via cognition", () => {
    expect(identifyAITool("Devin AI <devin@cognition.dev>")).toBe("devin");
  });

  it("identifies Gemini", () => {
    expect(identifyAITool("Gemini <gemini@google.com>")).toBe("gemini");
  });

  it("identifies SWE-Agent", () => {
    expect(identifyAITool("SWE-Agent <swe-agent@bot.dev>")).toBe("swe-agent");
    expect(identifyAITool("sweagent <sweagent@bot.dev>")).toBe("swe-agent");
  });

  it("returns null for human co-authors", () => {
    expect(identifyAITool("Alice <alice@example.com>")).toBeNull();
    expect(identifyAITool("Bob Smith <bob@company.org>")).toBeNull();
    expect(identifyAITool("John Developer <john@dev.io>")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(identifyAITool("")).toBeNull();
  });
});

describe("extractAIToolMetrics", () => {
  it("detects tools from commits with AI co-authors", () => {
    const commits = [
      { message: "feat: add feature\n\nCo-authored-by: Claude <noreply@anthropic.com>" },
      { message: "fix: bug fix\n\nCo-authored-by: Claude <noreply@anthropic.com>" },
      { message: "feat: another feature\n\nCo-authored-by: GitHub Copilot <copilot@github.com>" },
      { message: "chore: cleanup" },
    ];

    const metrics = extractAIToolMetrics(commits);
    expect(metrics.detected).toBe(true);
    expect(metrics.ai_assisted_commits).toBe(3);
    expect(metrics.ai_collaboration_rate).toBe(0.75);
    expect(metrics.primary_tool).toEqual({ id: "claude", name: "Claude" });
    expect(metrics.tool_diversity).toBe(2);
    expect(metrics.tools).toHaveLength(2);
    expect(metrics.tools[0].tool_id).toBe("claude");
    expect(metrics.tools[0].commit_count).toBe(2);
    expect(metrics.tools[1].tool_id).toBe("copilot");
    expect(metrics.tools[1].commit_count).toBe(1);
  });

  it("handles commits with multiple AI co-authors in same commit", () => {
    const commits = [
      {
        message:
          "feat: complex feature\n\nCo-authored-by: Claude <noreply@anthropic.com>\nCo-authored-by: GitHub Copilot <copilot@github.com>",
      },
    ];

    const metrics = extractAIToolMetrics(commits);
    expect(metrics.detected).toBe(true);
    expect(metrics.ai_assisted_commits).toBe(1);
    expect(metrics.tool_diversity).toBe(2);
    // Both tools get credit for 1 commit
    expect(metrics.tools.find((t) => t.tool_id === "claude")?.commit_count).toBe(1);
    expect(metrics.tools.find((t) => t.tool_id === "copilot")?.commit_count).toBe(1);
  });

  it("returns detected: false when no AI co-authors", () => {
    const commits = [
      { message: "feat: add feature" },
      { message: "fix: bug fix\n\nCo-authored-by: Alice <alice@example.com>" },
    ];

    const metrics = extractAIToolMetrics(commits);
    expect(metrics.detected).toBe(false);
    expect(metrics.ai_assisted_commits).toBe(0);
    expect(metrics.ai_collaboration_rate).toBe(0);
    expect(metrics.primary_tool).toBeNull();
    expect(metrics.tool_diversity).toBe(0);
    expect(metrics.tools).toHaveLength(0);
  });

  it("computes correct percentages", () => {
    const commits = [
      { message: "feat: a\n\nCo-authored-by: Claude <noreply@anthropic.com>" },
      { message: "feat: b\n\nCo-authored-by: Claude <noreply@anthropic.com>" },
      { message: "feat: c\n\nCo-authored-by: Claude <noreply@anthropic.com>" },
      { message: "feat: d\n\nCo-authored-by: GitHub Copilot <copilot@github.com>" },
    ];

    const metrics = extractAIToolMetrics(commits);
    expect(metrics.tools[0].percentage).toBe(75); // Claude: 3 of 4
    expect(metrics.tools[1].percentage).toBe(25); // Copilot: 1 of 4
  });

  it("uses totalCommits param for collaboration rate", () => {
    const commits = [
      { message: "feat: a\n\nCo-authored-by: Claude <noreply@anthropic.com>" },
    ];

    const metrics = extractAIToolMetrics(commits, 10);
    expect(metrics.ai_collaboration_rate).toBe(0.1); // 1 of 10
  });

  it("sets confidence based on signal count", () => {
    const lowCommits = [
      { message: "feat: a\n\nCo-authored-by: Claude <noreply@anthropic.com>" },
    ];
    expect(extractAIToolMetrics(lowCommits).confidence).toBe("low");

    const medCommits = Array.from({ length: 5 }, (_, i) => ({
      message: `feat: ${i}\n\nCo-authored-by: Claude <noreply@anthropic.com>`,
    }));
    expect(extractAIToolMetrics(medCommits).confidence).toBe("medium");

    const highCommits = Array.from({ length: 15 }, (_, i) => ({
      message: `feat: ${i}\n\nCo-authored-by: Claude <noreply@anthropic.com>`,
    }));
    expect(extractAIToolMetrics(highCommits).confidence).toBe("high");
  });
});
