import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type {
  CommunityStatsPayload,
  CommunityStatsSuppressed,
  CommunityStatsResult,
} from "@vibe-coding-profiler/core";
import { PERSONA_DISPLAY_NAMES } from "@vibe-coding-profiler/core";
import {
  AXIS_METADATA,
  AXIS_ORDER,
  getPersonaIcon,
} from "@/components/vcp/constants";
import type { AxisKey } from "@/components/vcp/types";

export const runtime = "nodejs";
export const revalidate = 300;

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:8108";

export const metadata: Metadata = {
  title: "Community Insights | Vibe Coding Profiler",
  description:
    "Anonymized, aggregated coding patterns across the Vibe Coding Profiler community.",
};

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchCommunityStats(): Promise<CommunityStatsResult | null> {
  try {
    const res = await fetch(`${appUrl}/api/community/stats`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as CommunityStatsResult;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CommunityPage() {
  const stats = await fetchCommunityStats();

  if (!stats) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <SuppressedView
          data={{
            suppressed: true,
            reason: "no_data_yet",
            eligible_profiles: 0,
            threshold: 10,
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {stats.suppressed ? (
        <SuppressedView data={stats} />
      ) : (
        <FullDataView data={stats} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suppressed state
// ---------------------------------------------------------------------------

function SuppressedView({ data }: { data: CommunityStatsSuppressed }) {
  const progress = Math.min(
    100,
    Math.round((data.eligible_profiles / data.threshold) * 100)
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_25px_80px_rgba(30,27,75,0.06)]">
      <div className="px-8 py-12 text-center sm:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500">
          Coming Soon
        </p>
        <h1 className="mt-3 text-2xl font-bold text-zinc-900 sm:text-3xl">
          Community Insights
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-zinc-600">
          We&apos;re gathering data from developers across the community. Once{" "}
          {data.threshold} profiles are analyzed, community-wide patterns will
          appear here.
        </p>

        {/* Progress bar */}
        <div className="mx-auto mt-8 max-w-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              {data.eligible_profiles} / {data.threshold} profiles
            </span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <Link
          href="/login"
          className="mt-8 inline-block rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
        >
          Get your VCP to help us launch
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full data view
// ---------------------------------------------------------------------------

function FullDataView({ data }: { data: CommunityStatsPayload }) {
  return (
    <div className="space-y-0 overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_25px_80px_rgba(30,27,75,0.06)]">
      <HeroSection data={data} />
      <PersonaSection data={data} />
      <AxesSection data={data} />
      {data.ai_tools && <AIToolsSection aiTools={data.ai_tools} />}
      <CTASection />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero section
// ---------------------------------------------------------------------------

function HeroSection({ data }: { data: CommunityStatsPayload }) {
  const formattedDate = new Date(data.as_of + "T00:00:00Z").toLocaleDateString(
    "en-US",
    { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }
  );

  return (
    <div className="px-8 py-10 sm:px-10">
      <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500">
        Community Insights
      </p>
      <h1 className="mt-2 text-2xl font-bold text-zinc-900 sm:text-3xl">
        How developers vibe code
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        Anonymized patterns from {data.eligible_profiles.toLocaleString()}{" "}
        developers across {data.eligible_repos.toLocaleString()} repos.
        {" "}
        <span className="text-zinc-400">As of {formattedDate}</span>
      </p>

      {/* Stat pills */}
      <div className="mt-6 flex flex-wrap gap-3">
        <StatPill label="Developers" value={data.eligible_profiles} />
        <StatPill label="Repos Analyzed" value={data.eligible_repos} />
        <StatPill
          label="Commits Analyzed"
          value={data.total_analyzed_commits}
        />
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-black/5 bg-zinc-50/50 px-4 py-2.5">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-lg font-bold text-zinc-900">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Persona distribution
// ---------------------------------------------------------------------------

function PersonaSection({ data }: { data: CommunityStatsPayload }) {
  return (
    <div className="border-t border-black/5 p-8 sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500">
        Persona Breakdown
      </p>
      <p className="mt-1 text-sm text-zinc-600">
        How the community distributes across coding personas
      </p>

      {data.personas.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-400">
          Not enough data per persona yet — check back soon.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {data.personas.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <Image
                src={getPersonaIcon(p.id)}
                alt={p.name}
                width={28}
                height={28}
                className="rounded-full"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-900">
                    {PERSONA_DISPLAY_NAMES[p.id] ?? p.name}
                  </p>
                  <p className="text-sm font-semibold text-zinc-700">
                    {p.pct}%
                  </p>
                </div>
                <div className="mt-1.5 h-2.5 w-full rounded-full bg-slate-100">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all"
                    style={{ width: `${p.pct}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Axis baselines
// ---------------------------------------------------------------------------

function AxesSection({ data }: { data: CommunityStatsPayload }) {
  return (
    <div className="border-t border-black/5 p-8 sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500">
        Community Axes
      </p>
      <p className="mt-1 text-sm text-zinc-600">
        How the community scores across the six coding axes (25th–75th
        percentile ranges)
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AXIS_ORDER.map((key) => {
          const axisData = data.axes[key];
          if (!axisData) return null;
          const meta = AXIS_METADATA[key as AxisKey];
          if (!meta) return null;

          return (
            <AxisRangeCard
              key={key}
              name={meta.name}
              description={meta.description}
              lowLabel={meta.lowLabel}
              highLabel={meta.highLabel}
              p25={axisData.p25}
              p50={axisData.p50}
              p75={axisData.p75}
            />
          );
        })}
      </div>
    </div>
  );
}

function AxisRangeCard({
  name,
  description,
  lowLabel,
  highLabel,
  p25,
  p50,
  p75,
}: {
  name: string;
  description: string;
  lowLabel: string;
  highLabel: string;
  p25: number;
  p50: number;
  p75: number;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-zinc-50/50 p-4">
      <p className="text-sm font-semibold text-zinc-900">{name}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{description}</p>

      {/* Range bar */}
      <div className="relative mt-4 h-2 w-full rounded-full bg-slate-100">
        {/* Highlighted range: p25 to p75 */}
        <div
          className="absolute top-0 h-2 rounded-full bg-gradient-to-r from-violet-400 to-indigo-400"
          style={{
            left: `${p25}%`,
            width: `${Math.max(p75 - p25, 2)}%`,
          }}
        />
        {/* p50 marker */}
        <div
          className="absolute top-[-2px] h-3 w-1 rounded-full bg-violet-700"
          style={{ left: `${p50}%` }}
        />
      </div>

      {/* Labels */}
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-400">
        <span>{lowLabel}</span>
        <span className="font-medium text-zinc-600">
          p50: {p50}
        </span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI tools section
// ---------------------------------------------------------------------------

function AIToolsSection({
  aiTools,
}: {
  aiTools: NonNullable<CommunityStatsPayload["ai_tools"]>;
}) {
  return (
    <div className="border-t border-black/5 p-8 sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500">
        AI Tool Adoption
      </p>
      <p className="mt-1 text-sm text-zinc-600">
        How the community uses AI coding tools (based on{" "}
        {aiTools.eligible_profiles_with_data} profiles with AI data)
      </p>

      <div className="mt-6 grid gap-8 sm:grid-cols-2">
        {/* Collaboration rate */}
        <div>
          <p className="text-xs font-medium text-zinc-700">
            AI Collaboration Rate
          </p>
          <div className="mt-3 space-y-2">
            {aiTools.collaboration_rate_buckets.map((b) => (
              <BucketBar
                key={b.bucket}
                label={formatBucketLabel(b.bucket)}
                pct={b.pct}
              />
            ))}
          </div>
        </div>

        {/* Tool diversity */}
        <div>
          <p className="text-xs font-medium text-zinc-700">
            AI Tool Diversity
          </p>
          <div className="mt-3 space-y-2">
            {aiTools.tool_diversity_buckets.map((b) => (
              <BucketBar
                key={b.bucket}
                label={
                  b.bucket === "3+"
                    ? "3+ tools"
                    : `${b.bucket} tool${b.bucket === "1" ? "" : "s"}`
                }
                pct={b.pct}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BucketBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs text-zinc-500">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-xs font-medium text-zinc-600">
        {pct}%
      </span>
    </div>
  );
}

function formatBucketLabel(bucket: string): string {
  const labels: Record<string, string> = {
    none: "None",
    light: "Light",
    moderate: "Moderate",
    heavy: "Heavy",
    "ai-native": "AI-Native",
  };
  return labels[bucket] ?? bucket;
}

// ---------------------------------------------------------------------------
// CTA footer
// ---------------------------------------------------------------------------

function CTASection() {
  return (
    <div className="border-t border-black/5 px-8 py-10 text-center sm:px-10">
      <p className="text-sm font-medium text-zinc-700">
        Want to see where you stand?
      </p>
      <Link
        href="/login"
        className="mt-4 inline-block rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
      >
        Get your Vibe Coding Profile
      </Link>
    </div>
  );
}
