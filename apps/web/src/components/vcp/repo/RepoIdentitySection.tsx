"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatMetricLabel } from "@/lib/format-labels";

interface Persona {
  label: string;
  description: string;
  archetypes: string[];
}

interface Narrative {
  summary?: string | null;
}

interface RepoIdentitySectionProps {
  /** Detected persona */
  persona: Persona;
  /** Optional narrative summary */
  narrative?: Narrative | null;
  /** Matched criteria for persona detection */
  matchedCriteria: string[];
  /** Additional class names */
  className?: string;
}

/**
 * RepoIdentitySection - Main identity header for the Repo VCP
 *
 * Shows persona name, description, archetypes, and methodology collapsible.
 */
export function RepoIdentitySection({
  persona,
  narrative,
  matchedCriteria,
  className,
}: RepoIdentitySectionProps) {
  return (
    <div className={cn("relative rounded-[2rem] border border-black/5 bg-white shadow-sm", className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/8 via-transparent to-indigo-500/8" />
      <div className="relative p-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
            Your vibe
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950">
            {persona.label}
          </h2>
          <p className="mt-3 text-base text-zinc-600">{persona.description}</p>
          {narrative?.summary ? (
            <p className="mt-3 text-sm font-medium text-zinc-800">
              {narrative.summary}
            </p>
          ) : null}
        </div>

        {/* Methodology collapsible */}
        <div className="mt-5 rounded-2xl border border-black/5 bg-white/60 p-4 backdrop-blur">
          <details>
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
              How we got this
            </summary>
            <div className="mt-3 space-y-3 text-sm text-zinc-700">
              <p>
                This report is inferred from Git/PR metadata (commit timing, commit size,
                file paths, and message patterns). We do not use your prompts, IDE workflow,
                PR comments, or code content—so this is an informed guess based on what lands
                in Git.
              </p>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
                  Matched criteria
                </p>
                {matchedCriteria.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {matchedCriteria.map((c) => (
                      <span
                        key={c}
                        className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-zinc-700"
                      >
                        {formatMetricLabel(c)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-zinc-600">
                    This report didn&apos;t include explicit matched criteria.
                  </p>
                )}
              </div>
              <div>
                <Link
                  href="/methodology"
                  className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-700 underline decoration-zinc-400 underline-offset-4"
                >
                  Methodology
                </Link>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
