import type { AIToolMetrics } from "@vibed/core";

interface VCPAIToolsSectionProps {
  aiTools: AIToolMetrics;
  className?: string;
}

/**
 * Displays AI coding tool breakdown detected from commit history.
 * Shows primary tool, per-tool usage bars, and summary stats.
 */
export function VCPAIToolsSection({ aiTools, className }: VCPAIToolsSectionProps) {
  if (!aiTools.detected || aiTools.tools.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
          Vibe Coding Tools
        </p>
        <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
          {aiTools.tool_diversity} tool{aiTools.tool_diversity !== 1 ? "s" : ""} detected
        </span>
      </div>
      <p className="mt-2 text-sm text-zinc-600">
        AI tools detected in commit history via Co-Authored-By trailers
      </p>

      {/* Tool breakdown */}
      <div className="mt-4 space-y-3">
        {aiTools.tools.map((tool, i) => (
          <div key={tool.tool_id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-900">
                  {tool.tool_name}
                </span>
                {i === 0 && aiTools.tools.length > 1 ? (
                  <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-700">
                    Primary
                  </span>
                ) : null}
              </div>
              <span className="text-sm tabular-nums text-zinc-500">
                {tool.percentage}%
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === 0
                    ? "bg-gradient-to-r from-violet-500 to-indigo-500"
                    : "bg-gradient-to-r from-slate-400 to-slate-300"
                }`}
                style={{ width: `${tool.percentage}%` }}
              />
            </div>
            <p className="mt-0.5 text-xs text-zinc-400">
              {tool.commit_count.toLocaleString()} commit{tool.commit_count !== 1 ? "s" : ""}
            </p>
          </div>
        ))}
      </div>

      {/* Summary stats */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            AI Rate
          </p>
          <p className="mt-1 text-xl font-semibold text-zinc-900">
            {Math.round(aiTools.ai_collaboration_rate * 100)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Tools Used
          </p>
          <p className="mt-1 text-xl font-semibold text-zinc-900">
            {aiTools.tool_diversity}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Confidence
          </p>
          <p className="mt-1 text-xl font-semibold text-zinc-900 capitalize">
            {aiTools.confidence}
          </p>
        </div>
      </div>
    </div>
  );
}
