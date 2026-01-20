"use client";

import { useState, useTransition } from "react";
import { wrappedTheme } from "@/lib/theme";
import { runCoverageAnalysis } from "./actions";

interface CoverageReport {
  id: string;
  total_combinations: number;
  fallback_count: number;
  fallback_percentage: number;
  persona_counts: Record<string, number>;
  sample_fallbacks: Array<{
    axes: { A: number; B: number; C: number; D: number; E: number; F: number };
    suggestion?: string;
  }>;
  real_user_fallbacks: Array<{
    userId: string;
    username: string;
    totalCommits: number;
    totalRepos: number;
    axes: { A: number; B: number; C: number; D: number; E: number; F: number };
    suggestion?: string;
  }>;
  step_size: number;
  created_at: string;
  notes: string | null;
}

export default function AdminClient({
  initialReports,
}: {
  initialReports: CoverageReport[];
}) {
  const [reports, setReports] = useState<CoverageReport[]>(initialReports);
  const [isPending, startTransition] = useTransition();
  const [stepSize, setStepSize] = useState(20);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  const handleRunAnalysis = () => {
    setError(null);
    startTransition(async () => {
      const result = await runCoverageAnalysis(stepSize, notes || undefined);
      if (!result.success) {
        setError(result.error ?? "Unknown error");
        return;
      }

      // Refresh the page to get updated reports
      window.location.reload();
    });
  };

  const latestReport = reports[0];

  return (
    <div className="space-y-8">
      {/* Run Analysis Section */}
      <section className={`${wrappedTheme.card} p-6`}>
        <h2 className="text-lg font-semibold text-zinc-950">Run Coverage Analysis</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Test persona rules against axes combinations to identify coverage gaps.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Step Size
            </label>
            <select
              value={stepSize}
              onChange={(e) => setStepSize(Number(e.target.value))}
              className="mt-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
            >
              <option value={10}>10 (Fine - 161,051 combos)</option>
              <option value={20}>20 (Medium - 15,625 combos)</option>
              <option value={25}>25 (Coarse - 4,096 combos)</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-zinc-700">
              Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., After adding Rapid Risk-Taker persona"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          <button
            onClick={handleRunAnalysis}
            disabled={isPending}
            className={`${wrappedTheme.primaryButton} ${isPending ? "opacity-50" : ""}`}
          >
            {isPending ? "Running..." : "Run Analysis"}
          </button>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}
      </section>

      {/* Latest Report Summary */}
      {latestReport && (
        <section className={`${wrappedTheme.card} p-6`}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">Latest Coverage Report</h2>
              <p className="mt-1 text-sm text-zinc-600">
                {new Date(latestReport.created_at).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-zinc-950">
                {100 - latestReport.fallback_percentage}%
              </p>
              <p className="text-sm text-zinc-600">Coverage</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-white/50 p-4">
              <p className="text-sm text-zinc-600">Total Combinations</p>
              <p className="text-xl font-semibold text-zinc-950">
                {latestReport.total_combinations.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-white/50 p-4">
              <p className="text-sm text-zinc-600">Matched Personas</p>
              <p className="text-xl font-semibold text-emerald-600">
                {(latestReport.total_combinations - latestReport.fallback_count).toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-white/50 p-4">
              <p className="text-sm text-zinc-600">Fallback (Balanced Builder)</p>
              <p className="text-xl font-semibold text-amber-600">
                {latestReport.fallback_count.toLocaleString()} ({latestReport.fallback_percentage}%)
              </p>
            </div>
          </div>

          {/* Persona Breakdown */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-zinc-700">Persona Breakdown</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(latestReport.persona_counts)
                .sort((a, b) => b[1] - a[1])
                .map(([personaId, count]) => {
                  const percentage = Math.round((count / latestReport.total_combinations) * 100);
                  return (
                    <div
                      key={personaId}
                      className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2"
                    >
                      <span className="text-sm text-zinc-700">{formatPersonaId(personaId)}</span>
                      <span className="text-sm font-medium text-zinc-950">
                        {count.toLocaleString()} ({percentage}%)
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Real User Fallbacks */}
          {latestReport.real_user_fallbacks?.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-red-700">
                Real Users Hitting Fallback ({latestReport.real_user_fallbacks.length})
              </h3>
              <p className="mt-1 text-xs text-zinc-600">
                Users with 100+ commits and 2+ repos who don&apos;t match any persona rule
              </p>
              <div className="mt-3 space-y-2">
                {latestReport.real_user_fallbacks.map((user) => (
                  <div
                    key={user.userId}
                    className="rounded-lg border border-red-200 bg-red-50/50 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-zinc-950">@{user.username}</span>
                      <span className="text-sm text-zinc-600">
                        {user.totalCommits} commits / {user.totalRepos} repos
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-zinc-600">
                      A={user.axes.A} B={user.axes.B} C={user.axes.C} D={user.axes.D} E={user.axes.E} F={user.axes.F}
                    </p>
                    {user.suggestion && (
                      <p className="mt-2 text-xs text-red-700">{user.suggestion}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample Fallback Patterns */}
          {latestReport.sample_fallbacks?.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-zinc-700">Sample Fallback Patterns</h3>
              <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                {latestReport.sample_fallbacks.slice(0, 10).map((sample, i) => (
                  <div key={i} className="font-mono text-xs text-zinc-600">
                    A={sample.axes.A} B={sample.axes.B} C={sample.axes.C} D={sample.axes.D} E={sample.axes.E} F={sample.axes.F}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Historical Reports */}
      {reports.length > 1 && (
        <section className={`${wrappedTheme.card} p-6`}>
          <h2 className="text-lg font-semibold text-zinc-950">Historical Reports</h2>
          <p className="mt-1 text-sm text-zinc-600">Track coverage improvements over time</p>

          <div className="mt-4 space-y-3">
            {reports.slice(1).map((report) => (
              <div
                key={report.id}
                className="rounded-xl bg-white/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-950">
                      {new Date(report.created_at).toLocaleDateString()}
                    </p>
                    {report.notes && (
                      <p className="text-xs text-zinc-600">{report.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-zinc-950">
                      {100 - report.fallback_percentage}% coverage
                    </p>
                    <p className="text-xs text-zinc-600">
                      {report.fallback_count.toLocaleString()} fallbacks
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setExpandedReport(expandedReport === report.id ? null : report.id)
                  }
                  className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  {expandedReport === report.id ? "Hide details" : "Show details"}
                </button>
                {expandedReport === report.id && (
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    {Object.entries(report.persona_counts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([id, count]) => (
                        <div key={id} className="flex justify-between">
                          <span className="text-zinc-600">{formatPersonaId(id)}</span>
                          <span className="text-zinc-950">{count.toLocaleString()}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function formatPersonaId(id: string): string {
  return id
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
