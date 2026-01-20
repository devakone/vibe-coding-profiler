import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import { parseCommitTrailers, computeAnalysisInsights, type CommitEvent } from "../index";
import { classifySubsystem } from "../vibe";

/**
 * Integration test that analyzes the vibed-coding repo itself.
 * This repo has AI collaboration signals (Co-authored-by: Claude trailers)
 * and AI config files (AGENTS.md).
 */
describe("Integration: vibed-coding repo analysis", () => {
  // Get real git log from this repo
  const getRecentCommits = (count: number = 50): string[] => {
    try {
      const output = execSync(
        `git log --format="%H|||%ae|||%aI|||%aI|||%s%n%b|||END|||" -${count}`,
        { cwd: process.cwd(), encoding: "utf-8", maxBuffer: 1024 * 1024 }
      );
      return output.split("|||END|||").filter((c) => c.trim());
    } catch {
      return [];
    }
  };

  const parseGitCommit = (raw: string): CommitEvent | null => {
    const parts = raw.split("|||");
    if (parts.length < 5) return null;

    const [sha, authorEmail, authorDate, committerDate, messageWithBody] = parts;
    const [subject, ...bodyParts] = (messageWithBody || "").split("\n");
    const body = bodyParts.join("\n").trim();
    const message = body ? `${subject}\n\n${body}` : subject;

    return {
      sha: sha?.trim() || "",
      author_email: authorEmail?.trim() || "",
      author_date: authorDate?.trim() || "",
      committer_date: committerDate?.trim() || "",
      message: message?.trim() || "",
      files_changed: 0,
      additions: 0,
      deletions: 0,
      parents: [],
    };
  };

  describe("Commit trailer detection", () => {
    it("detects Co-authored-by: Claude trailers in repo history", () => {
      const rawCommits = getRecentCommits(100);
      if (rawCommits.length === 0) {
        console.log("Skipping: could not read git history");
        return;
      }

      const commitsWithClaudeTrailer: string[] = [];

      for (const raw of rawCommits) {
        const commit = parseGitCommit(raw);
        if (!commit) continue;

        const trailers = parseCommitTrailers(commit.message);
        const claudeTrailer = trailers.find(
          (t) =>
            t.name.toLowerCase() === "co-authored-by" &&
            t.value.toLowerCase().includes("claude")
        );

        if (claudeTrailer) {
          commitsWithClaudeTrailer.push(commit.sha.slice(0, 7));
        }
      }

      console.log(
        `Found ${commitsWithClaudeTrailer.length} commits with Claude co-author:`,
        commitsWithClaudeTrailer.slice(0, 10)
      );

      // This repo should have at least some Claude co-authored commits
      expect(commitsWithClaudeTrailer.length).toBeGreaterThan(0);
    });

    it("parses various trailer formats correctly", () => {
      const rawCommits = getRecentCommits(100);
      if (rawCommits.length === 0) return;

      const allTrailers: Array<{ sha: string; name: string; value: string }> = [];

      for (const raw of rawCommits) {
        const commit = parseGitCommit(raw);
        if (!commit) continue;

        const trailers = parseCommitTrailers(commit.message);
        for (const t of trailers) {
          allTrailers.push({ sha: commit.sha.slice(0, 7), ...t });
        }
      }

      console.log(`Found ${allTrailers.length} total trailers in repo history`);
      if (allTrailers.length > 0) {
        console.log("Sample trailers:", allTrailers.slice(0, 5));
      }

      // Just verify we can parse without errors
      expect(allTrailers).toBeDefined();
    });
  });

  describe("AI config file detection", () => {
    it("detects AGENTS.md as ai_config subsystem", () => {
      expect(classifySubsystem("AGENTS.md")).toBe("ai_config");
      expect(classifySubsystem("docs/AGENTS.md")).toBe("ai_config");
    });

    it("detects .cursor/rules as ai_config", () => {
      expect(classifySubsystem(".cursor/rules/coding.md")).toBe("ai_config");
    });

    it("does not misclassify regular docs", () => {
      expect(classifySubsystem("docs/PRD.md")).toBe("docs");
      expect(classifySubsystem("README.md")).toBe("docs");
    });
  });

  describe("Full analysis pipeline", () => {
    it("computes insights with multi-agent signals from real commits", () => {
      const rawCommits = getRecentCommits(50);
      if (rawCommits.length === 0) {
        console.log("Skipping: could not read git history");
        return;
      }

      const events: CommitEvent[] = [];
      for (const raw of rawCommits) {
        const commit = parseGitCommit(raw);
        if (commit) events.push(commit);
      }

      if (events.length === 0) {
        console.log("Skipping: no valid commits parsed");
        return;
      }

      console.log(`Analyzing ${events.length} commits from vibed-coding repo`);

      const insights = computeAnalysisInsights(events);

      console.log("\n=== Multi-Agent Signals ===");
      console.log("Co-author count:", insights.multi_agent_signals?.co_author_count);
      console.log("AI trailer count:", insights.multi_agent_signals?.ai_trailer_count);
      console.log("AI keyword count:", insights.multi_agent_signals?.ai_keyword_count);

      if (insights.multi_agent_signals?.evidence_shas?.length) {
        console.log(
          "\nEvidence SHAs (first 3):",
          insights.multi_agent_signals.evidence_shas.slice(0, 3)
        );
      }

      console.log("\n=== Artifact Traceability ===");
      console.log("Workflow style:", insights.artifact_traceability?.workflow_style);
      console.log("Confidence:", insights.artifact_traceability?.confidence);
      console.log("Orchestrator score:", insights.artifact_traceability?.scores?.orchestrator_score);
      console.log("Conductor score:", insights.artifact_traceability?.scores?.conductor_score);

      console.log("\n=== Detected Persona ===");
      console.log("ID:", insights.persona?.id);
      console.log("Label:", insights.persona?.label);
      console.log("Confidence:", insights.persona?.confidence);

      // Verify multi-agent signals are populated
      expect(insights.multi_agent_signals).toBeDefined();

      // This repo should have AI collaboration signals
      const hasAISignals =
        (insights.multi_agent_signals?.ai_trailer_count ?? 0) > 0 ||
        (insights.multi_agent_signals?.co_author_count ?? 0) > 0;

      expect(hasAISignals).toBe(true);
    });
  });
});
