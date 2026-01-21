"use client";

import { useMemo, useSyncExternalStore } from "react";
import { ShareCard, ShareActions } from "./index";
import type { ShareCardMetric, ShareImageTemplate } from "./types";

// Use useSyncExternalStore to avoid SSR/CSR mismatch and comply with lint rules
function useOrigin(): string {
  return useSyncExternalStore(
    () => () => {},
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    () => ""
  );
}

// Default persona colors for profile share cards
const PERSONA_COLORS: Record<string, { primary: string; accent: string }> = {
  "prompt_sprinter": { primary: "#c026d3", accent: "#7c3aed" },
  "guardrailed_viber": { primary: "#0891b2", accent: "#4f46e5" },
  "spec_first_director": { primary: "#4f46e5", accent: "#7c3aed" },
  "vertical_slice_shipper": { primary: "#7c3aed", accent: "#0ea5e9" },
  "fix_loop_hacker": { primary: "#dc2626", accent: "#f97316" },
  "toolsmith_viber": { primary: "#059669", accent: "#0891b2" },
  "infra_weaver": { primary: "#475569", accent: "#0891b2" },
  "rapid_risk_taker": { primary: "#f97316", accent: "#dc2626" },
  "balanced_builder": { primary: "#6366f1", accent: "#8b5cf6" },
  // Fallback for older persona IDs
  "vibe-prototyper": { primary: "#c026d3", accent: "#7c3aed" },
  "test-validator": { primary: "#0891b2", accent: "#4f46e5" },
  "spec-architect": { primary: "#4f46e5", accent: "#7c3aed" },
  "agent-orchestrator": { primary: "#7c3aed", accent: "#0ea5e9" },
  "reflective-balancer": { primary: "#6366f1", accent: "#8b5cf6" },
};

const DEFAULT_COLORS = { primary: "#c026d3", accent: "#06b6d4" };

interface ProfileShareSectionProps {
  personaName: string;
  personaId?: string;
  personaTagline: string | null;
  personaConfidence: string;
  totalRepos: number;
  totalCommits: number;
  clarity: number;
  topAxes: Array<{
    name: string;
    score: number;
  }>;
  insight: string;
}

export function ProfileShareSection({
  personaName,
  personaId,
  personaTagline,
  personaConfidence,
  totalRepos,
  totalCommits,
  clarity,
  topAxes,
  insight,
}: ProfileShareSectionProps) {
  const shareOrigin = useOrigin();

  const colors = PERSONA_COLORS[personaId ?? ""] ?? DEFAULT_COLORS;

  const shareCardMetrics: ShareCardMetric[] = useMemo(() => {
    const metrics: ShareCardMetric[] = [
      { label: "Repos", value: String(totalRepos) },
      { label: "Commits", value: totalCommits.toLocaleString() },
      { label: "Clarity", value: `${clarity}%` },
    ];
    // Add top axis if available
    if (topAxes.length > 0) {
      metrics.push({ label: topAxes[0].name, value: String(topAxes[0].score) });
    }
    return metrics;
  }, [totalRepos, totalCommits, clarity, topAxes]);

  const shareUrl = useMemo(() => {
    if (!shareOrigin) return "";
    return shareOrigin; // Profile is at root
  }, [shareOrigin]);

  const shareText = useMemo(() => {
    const metricsLine = `${totalRepos} repos · ${totalCommits.toLocaleString()} commits · ${clarity}% clarity`;
    return `My Vibed Coding Profile: ${personaName}\n${personaTagline ?? ""}\n${metricsLine}\n#Vibed`;
  }, [personaName, personaTagline, totalRepos, totalCommits, clarity]);

  const shareCaption = useMemo(() => {
    return `My Vibed Coding Profile: ${personaName} — ${personaTagline ?? ""}. ${totalRepos} repos, ${totalCommits.toLocaleString()} commits. #Vibed`;
  }, [personaName, personaTagline, totalRepos, totalCommits]);

  const shareImageTemplate: ShareImageTemplate = useMemo(() => {
    return {
      colors,
      headline: `Vibed as ${personaName}`,
      subhead: personaTagline ?? `${personaConfidence} confidence`,
      metrics: shareCardMetrics,
      persona_archetype: {
        label: personaName,
        archetypes: topAxes.slice(0, 3).map((a) => `${a.name}: ${a.score}`),
      },
    };
  }, [personaName, personaTagline, personaConfidence, colors, shareCardMetrics, topAxes]);

  return (
    <div className="space-y-4">
      <ShareCard
        variant="profile"
        persona={{
          label: personaName,
          tagline: personaTagline ?? insight,
          confidence: personaConfidence,
        }}
        metrics={shareCardMetrics}
        footer={{
          left: shareOrigin ? new URL(shareOrigin).hostname : "vibed.dev",
          right: `${totalRepos} repos · ${totalCommits.toLocaleString()} commits`,
        }}
        colors={colors}
      />
      <ShareActions
        shareUrl={shareUrl}
        shareText={shareText}
        shareCaption={shareCaption}
        shareHeadline={`Vibed as ${personaName}`}
        shareTemplate={shareImageTemplate}
        entityId="profile"
      />
    </div>
  );
}
