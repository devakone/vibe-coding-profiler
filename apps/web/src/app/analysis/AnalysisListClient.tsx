"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { wrappedTheme } from "@/lib/theme";
import { useJobs } from "@/contexts/JobsContext";

type Tab = "reports" | "jobs";

type Report = {
  jobId: string;
  repoId: string | null;
  repoName: string | null;
  personaLabel: string | null;
  personaConfidence: string | null;
  generatedAt: string | null;
  status: string;
};

type Job = {
  id: string;
  status: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  repoId: string | null;
  repoName: string | null;
  errorMessage: string | null;
};

interface AnalysisListClientProps {
  initialReports: Report[];
  initialJobs: Job[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  running: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400 animate-pulse" },
  done: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  failed: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${colors.bg} ${colors.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
      {status === "done" ? "Completed" : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function AnalysisListClient({ initialReports, initialJobs }: AnalysisListClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { jobs: contextJobs, unreadReportIds, markReportAsRead, markAllAsRead, refreshJobs, isPolling } = useJobs();

  const tabParam = searchParams.get("tab");
  const activeTab: Tab = tabParam === "jobs" ? "jobs" : "reports";

  const setActiveTab = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Use context jobs if available, otherwise initial jobs
  const jobs = contextJobs.length > 0 ? contextJobs : initialJobs;

  // Track completed job count to detect new completions
  const completedJobCountRef = useRef(jobs.filter((j) => j.status === "done").length);
  const completedJobCount = jobs.filter((j) => j.status === "done").length;

  useEffect(() => {
    if (completedJobCount > completedJobCountRef.current) {
      router.refresh();
    }
    completedJobCountRef.current = completedJobCount;
  }, [completedJobCount, router]);

  // Reports already only include jobs with insights (i.e., completed analyses)
  const completedReports = initialReports;
  const activeJobsCount = jobs.filter((j) => j.status === "pending" || j.status === "running").length;

  return (
    <div className={`${wrappedTheme.card} p-6`}>
      {/* Tabs */}
      <div className="mb-6 flex items-center gap-1 rounded-xl bg-zinc-100 p-1">
        <button
          onClick={() => setActiveTab("reports")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "reports"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          Reports
          {completedReports.length > 0 && (
            <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-xs">
              {completedReports.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("jobs")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "jobs"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          Jobs
          {activeJobsCount > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
              {activeJobsCount}
            </span>
          )}
        </button>
      </div>

      {/* Reports Tab Content */}
      {activeTab === "reports" && (
        <>
          {unreadReportIds.size > 0 && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/50 px-4 py-3">
              <p className="text-sm text-indigo-700">
                <span className="font-semibold">{unreadReportIds.size}</span> new report{unreadReportIds.size === 1 ? "" : "s"} ready to view
              </p>
              <button
                onClick={markAllAsRead}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                Mark all as read
              </button>
            </div>
          )}
          {completedReports.length === 0 ? (
            <div className="flex flex-col gap-3 py-8 text-center">
              <p className="text-sm text-zinc-600">
                No completed reports yet. Run your first vibe check.
              </p>
              <Link className={`${wrappedTheme.primaryButtonSm} mx-auto`} href="/repos">
                Pick a repo
              </Link>
            </div>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {completedReports.map((r) => {
                const isUnread = unreadReportIds.has(r.jobId);
                return (
                  <li
                    key={r.jobId}
                    className={`rounded-2xl border p-5 transition-colors ${
                      isUnread
                        ? "border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-white"
                        : "border-black/5 bg-white/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-zinc-950">
                            {r.repoName ?? "Repository"}
                          </p>
                          {isUnread && (
                            <span className="inline-flex h-2 w-2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" />
                          )}
                        </div>
                        <p className="mt-1 text-xs text-zinc-600">
                          {r.generatedAt ? new Date(r.generatedAt).toLocaleDateString() : ""}
                        </p>
                      </div>
                      <Link
                        href={`/analysis/${r.jobId}`}
                        className={wrappedTheme.primaryButtonSm}
                        onClick={() => markReportAsRead(r.jobId)}
                      >
                        View
                      </Link>
                    </div>

                    <div className="mt-4 rounded-xl border border-black/5 bg-zinc-50/50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                        Persona
                      </p>
                      <p className="mt-1 text-base font-semibold text-zinc-950">
                        {r.personaLabel ?? "Still forming"}
                      </p>
                      <p className="mt-0.5 text-sm text-zinc-600">
                        {r.personaConfidence ?? "Not enough signal yet"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {/* Jobs Tab Content */}
      {activeTab === "jobs" && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-zinc-600">
              {isPolling ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                  Watching for updates...
                </span>
              ) : (
                "All jobs"
              )}
            </p>
            <button
              onClick={() => void refreshJobs()}
              className="text-xs text-zinc-500 hover:text-zinc-700"
            >
              Refresh
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="flex flex-col gap-3 py-8 text-center">
              <p className="text-sm text-zinc-600">
                No analysis jobs yet.
              </p>
              <Link className={`${wrappedTheme.primaryButtonSm} mx-auto`} href="/repos">
                Start an analysis
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    job.status === "running"
                      ? "border-blue-200 bg-blue-50/50"
                      : job.status === "failed"
                      ? "border-red-200 bg-red-50/50"
                      : "border-black/5 bg-white/70"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {job.repoName ?? "Unknown repo"}
                        </p>
                        <StatusBadge status={job.status} />
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        Started {formatRelativeTime(job.createdAt)}
                        {job.completedAt && (
                          <> · Completed {formatRelativeTime(job.completedAt)}</>
                        )}
                      </p>
                      {job.errorMessage && (
                        <p className="mt-2 text-xs text-red-600">
                          {job.errorMessage}
                        </p>
                      )}
                    </div>
                    {job.status === "done" && (
                      <Link
                        href={`/analysis/${job.id}`}
                        className={wrappedTheme.primaryButtonSm}
                      >
                        View
                      </Link>
                    )}
                    {job.status === "running" && (
                      <div className="flex items-center gap-2 text-xs text-blue-600">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Processing
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
