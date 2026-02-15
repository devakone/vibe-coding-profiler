"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { ExternalLink } from "lucide-react";
import { computeShareCardMetrics } from "@/lib/vcp/metrics";
import type { VibeAxes } from "@vibe-coding-profiler/core";
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
  axes: VibeAxes;
  userId: string;
  /** When set and public profile is enabled, share URL uses /u/{username} */
  username?: string | null;
  /** Whether the user's public profile is enabled */
  profileEnabled?: boolean;
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
  axes,
  userId,
  username,
  profileEnabled,
}: ProfileShareSectionProps) {
  const shareOrigin = useOrigin();

  const colors = PERSONA_COLORS[personaId ?? ""] ?? DEFAULT_COLORS;

  const shareCardMetrics: ShareCardMetric[] = useMemo(() => {
    const computed = computeShareCardMetrics(axes);
    return [
      { label: "Strongest", value: computed.strongest },
      { label: "Style", value: computed.style },
      { label: "Rhythm", value: computed.rhythm },
      { label: "Peak", value: computed.peak },
    ];
  }, [axes]);

  const shareUrl = useMemo(() => {
    if (!shareOrigin) return "";
    if (username && profileEnabled) {
      return `${shareOrigin}/u/${username}`;
    }
    return shareOrigin;
  }, [shareOrigin, username, profileEnabled]);

  const shareTagline = insight ?? personaTagline ?? "";

  const shareText = useMemo(() => {
    const metricsLine = `${totalRepos} repos · ${totalCommits.toLocaleString()} commits · ${clarity}% clarity`;
    return `My Unified VCP: ${personaName}\n${shareTagline}\n${metricsLine}\n#VCP`;
  }, [personaName, shareTagline, totalRepos, totalCommits, clarity]);

  const shareCaption = useMemo(() => {
    const taglineSegment = shareTagline ? ` — ${shareTagline}` : "";
    return `My Unified VCP: ${personaName}${taglineSegment}. ${totalRepos} repos, ${totalCommits.toLocaleString()} commits. #VCP`;
  }, [personaName, shareTagline, totalRepos, totalCommits]);

  const shareImageTemplate: ShareImageTemplate = useMemo(() => {
    return {
      colors,
      headline: `Unified VCP: ${personaName}`,
      subhead: personaTagline ?? `${personaConfidence} confidence`,
      tagline: shareTagline || `${personaConfidence} confidence`,
      metrics: shareCardMetrics,
      persona_archetype: {
        label: personaName,
        archetypes: topAxes.slice(0, 3).map((a) => `${a.name}: ${a.score}`),
      },
    };
  }, [personaName, personaTagline, personaConfidence, colors, shareCardMetrics, topAxes, shareTagline]);

  const shareJson = useMemo(() => ({
    meta: {
      generatedAt: new Date().toISOString(),
      profileUrl: shareUrl,
    },
    persona: {
      label: personaName,
      tagline: personaTagline,
      confidence: personaConfidence,
      insight,
    },
    metrics: {
      totalRepos,
      totalCommits,
      clarity,
      topAxes,
    },
    axes,
  }), [personaName, personaTagline, personaConfidence, insight, totalRepos, totalCommits, clarity, topAxes, axes, shareUrl]);

  return (
    <div className="space-y-4">
      <ShareCard
        variant="profile"
        personaId={personaId}
        persona={{
          label: personaName,
          tagline: personaTagline ?? insight,
          confidence: personaConfidence,
        }}
        tagline={insight}
        metrics={shareCardMetrics}
        footer={{
          left: process.env.NEXT_PUBLIC_APP_URL
            ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
            : "Vibe Coding Profiler",
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
        entityId={userId}
        shareJson={shareJson}
      />
      {/* CTA to enable public profile when disabled */}
      {!profileEnabled && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-zinc-600">
          <span>
            {username
              ? "Enable your public profile to share on social media."
              : "Claim a username to share your VCP publicly."}
          </span>
          <Link
            href="/settings/public-profile"
            className="inline-flex items-center gap-1 font-medium text-violet-600 hover:text-violet-800"
          >
            {username ? "Enable" : "Set up"} public profile
            <ExternalLink size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}
