import { describe, it, expect } from "vitest";
import { parseCommitTrailers } from "../index";

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
