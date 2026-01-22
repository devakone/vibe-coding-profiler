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

/**
 * Persona colors for profile share cards
 * 
 * All personas now use the unified violet-indigo palette with subtle variations
 * to maintain brand consistency while still providing visual differentiation.
 */
const PERSONA_COLORS: Record<string, { primary: string; accent: string }> = {
  // Dynamic/fast personas - brighter violet
  "prompt_sprinter": { primary: "#7c3aed", accent: "#6366f1" }, // violet-600 → indigo-500
  "rapid_risk_taker": { primary: "#8b5cf6", accent: "#6366f1" }, // violet-500 → indigo-500
  "fix_loop_hacker": { primary: "#7c3aed", accent: "#818cf8" }, // violet-600 → indigo-400
  
  // Balanced/thoughtful personas - deeper tones
  "guardrailed_viber": { primary: "#6366f1", accent: "#7c3aed" }, // indigo-500 → violet-600
  "spec_first_director": { primary: "#4f46e5", accent: "#7c3aed" }, // indigo-600 → violet-600
  "balanced_builder": { primary: "#6366f1", accent: "#8b5cf6" }, // indigo-500 → violet-500
  
  // Technical/structured personas - cooler indigo
  "vertical_slice_shipper": { primary: "#6366f1", accent: "#818cf8" }, // indigo-500 → indigo-400
  "toolsmith_viber": { primary: "#4f46e5", accent: "#6366f1" }, // indigo-600 → indigo-500
  "infra_weaver": { primary: "#4338ca", accent: "#6366f1" }, // indigo-700 → indigo-500
  
  // Fallback for older persona IDs - all mapped to unified palette
  "vibe-prototyper": { primary: "#7c3aed", accent: "#6366f1" },
  "test-validator": { primary: "#6366f1", accent: "#7c3aed" },
  "spec-architect": { primary: "#4f46e5", accent: "#7c3aed" },
  "agent-orchestrator": { primary: "#6366f1", accent: "#818cf8" },
  "reflective-balancer": { primary: "#6366f1", accent: "#8b5cf6" },
};

// Default uses the primary brand gradient
const DEFAULT_COLORS = { primary: "#7c3aed", accent: "#6366f1" };

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
    return `My Unified VCP: ${personaName}\n${personaTagline ?? ""}\n${metricsLine}\n#VCP`;
  }, [personaName, personaTagline, totalRepos, totalCommits, clarity]);

  const shareCaption = useMemo(() => {
    return `My Unified VCP: ${personaName} — ${personaTagline ?? ""}. ${totalRepos} repos, ${totalCommits.toLocaleString()} commits. #VCP`;
  }, [personaName, personaTagline, totalRepos, totalCommits]);

  const shareImageTemplate: ShareImageTemplate = useMemo(() => {
    return {
      colors,
      headline: `Unified VCP: ${personaName}`,
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
        shareHeadline={`Unified VCP: ${personaName}`}
        shareTemplate={shareImageTemplate}
        entityId="profile"
      />
    </div>
  );
}
