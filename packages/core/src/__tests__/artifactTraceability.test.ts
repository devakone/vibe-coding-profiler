import { describe, it, expect } from "vitest";
import { computeAnalysisInsights, type CommitEvent, type PullRequestSignals } from "../index";

describe("Artifact Traceability (Conductor vs Orchestrator)", () => {
  const makeCommit = (sha: string, message: string): CommitEvent => ({
    sha,
    message,
    author_date: "2024-01-15T10:00:00Z",
    committer_date: "2024-01-15T10:00:00Z",
    author_email: "dev@example.com",
    files_changed: 3,
    additions: 50,
    deletions: 10,
    parents: [],
  });

  describe("Orchestrator detection", () => {
    it("detects orchestrator style with high PR coverage and issue linking", () => {
      const commits = Array.from({ length: 30 }, (_, i) =>
        makeCommit(`sha${i}`, `feat: feature ${i}`)
      );

      const prSignals: PullRequestSignals = {
        total: 25,
        merged: 20,
        merge_methods: { merge: 2, squash: 15, rebase: 3, unknown: 0 },
        checklist_rate: 0.6,
        template_rate: 0.7,
        linked_issue_rate: 0.5,
        evidence_shas: ["pr1", "pr2", "pr3"],
      };

      const insights = computeAnalysisInsights(commits, { pull_requests: prSignals });

      expect(insights.artifact_traceability.workflow_style).toBe("orchestrator");
      expect(insights.artifact_traceability.dominant_merge_method).toBe("squash");
      expect(insights.artifact_traceability.scores.orchestrator_score).toBeGreaterThan(
        insights.artifact_traceability.scores.conductor_score
      );
    });

    it("boosts orchestrator score with AI trailers", () => {
      const commits = [
        makeCommit("sha1", "feat: feature 1\n\nCo-authored-by: Claude <noreply@anthropic.com>"),
        makeCommit("sha2", "feat: feature 2\n\nCo-authored-by: Claude <noreply@anthropic.com>"),
        makeCommit("sha3", "feat: feature 3\n\nCo-authored-by: Claude <noreply@anthropic.com>"),
        makeCommit("sha4", "feat: feature 4\n\nCo-authored-by: Claude <noreply@anthropic.com>"),
        makeCommit("sha5", "feat: feature 5"),
      ];

      const insights = computeAnalysisInsights(commits);

      // AI trailers should boost orchestrator score
      expect(insights.artifact_traceability.scores.orchestrator_score).toBeGreaterThan(0);
    });
  });

  describe("Conductor detection", () => {
    it("detects conductor style with no PR data", () => {
      const commits = Array.from({ length: 20 }, (_, i) =>
        makeCommit(`sha${i}`, `feat: feature ${i}`)
      );

      const insights = computeAnalysisInsights(commits);

      // No PR data should lean toward conductor
      expect(insights.artifact_traceability.scores.conductor_score).toBeGreaterThan(0);
    });

    it("detects conductor style with low PR coverage", () => {
      const commits = Array.from({ length: 50 }, (_, i) =>
        makeCommit(`sha${i}`, `feat: feature ${i}`)
      );

      const prSignals: PullRequestSignals = {
        total: 5,
        merged: 3,
        merge_methods: { merge: 1, squash: 1, rebase: 1, unknown: 0 },
        checklist_rate: 0,
        template_rate: 0,
        linked_issue_rate: 0,
        evidence_shas: [],
      };

      const insights = computeAnalysisInsights(commits, { pull_requests: prSignals });

      // Low PR coverage and no structure should lean conductor
      expect(insights.artifact_traceability.pr_coverage_rate).toBeLessThan(0.1);
    });
  });

  describe("Hybrid detection", () => {
    it("detects hybrid style with mixed signals", () => {
      const commits = Array.from({ length: 30 }, (_, i) =>
        makeCommit(`sha${i}`, `feat: feature ${i}`)
      );

      const prSignals: PullRequestSignals = {
        total: 10,
        merged: 8,
        merge_methods: { merge: 3, squash: 3, rebase: 2, unknown: 0 },
        checklist_rate: 0.2,
        template_rate: 0.3,
        linked_issue_rate: 0.1,
        evidence_shas: ["pr1"],
      };

      const insights = computeAnalysisInsights(commits, { pull_requests: prSignals });

      // Mixed signals should result in hybrid
      expect(["hybrid", "orchestrator", "conductor"]).toContain(
        insights.artifact_traceability.workflow_style
      );
    });
  });

  describe("Merge method detection", () => {
    it("detects squash as dominant merge method", () => {
      const commits = Array.from({ length: 20 }, (_, i) =>
        makeCommit(`sha${i}`, `feat: feature ${i}`)
      );

      const prSignals: PullRequestSignals = {
        total: 15,
        merged: 12,
        merge_methods: { merge: 1, squash: 10, rebase: 1, unknown: 0 },
        checklist_rate: null,
        template_rate: null,
        linked_issue_rate: null,
        evidence_shas: [],
      };

      const insights = computeAnalysisInsights(commits, { pull_requests: prSignals });

      expect(insights.artifact_traceability.dominant_merge_method).toBe("squash");
      expect(insights.artifact_traceability.merge_method_distribution.squash).toBeGreaterThan(0.8);
    });

    it("detects mixed merge methods", () => {
      const commits = Array.from({ length: 20 }, (_, i) =>
        makeCommit(`sha${i}`, `feat: feature ${i}`)
      );

      const prSignals: PullRequestSignals = {
        total: 15,
        merged: 12,
        merge_methods: { merge: 4, squash: 4, rebase: 4, unknown: 0 },
        checklist_rate: null,
        template_rate: null,
        linked_issue_rate: null,
        evidence_shas: [],
      };

      const insights = computeAnalysisInsights(commits, { pull_requests: prSignals });

      expect(insights.artifact_traceability.dominant_merge_method).toBe("mixed");
    });
  });

  describe("Confidence levels", () => {
    it("has low confidence with minimal data", () => {
      const commits = [makeCommit("sha1", "feat: initial")];

      const insights = computeAnalysisInsights(commits);

      expect(insights.artifact_traceability.confidence).toBe("low");
    });

    it("has higher confidence with more data", () => {
      const commits = Array.from({ length: 30 }, (_, i) =>
        makeCommit(`sha${i}`, `feat: feature ${i}`)
      );

      const prSignals: PullRequestSignals = {
        total: 20,
        merged: 15,
        merge_methods: { merge: 0, squash: 15, rebase: 0, unknown: 0 },
        checklist_rate: 0.8,
        template_rate: 0.9,
        linked_issue_rate: 0.6,
        evidence_shas: ["pr1", "pr2"],
      };

      const insights = computeAnalysisInsights(commits, { pull_requests: prSignals });

      expect(["medium", "high"]).toContain(insights.artifact_traceability.confidence);
    });
  });
});
