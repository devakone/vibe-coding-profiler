"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import { toast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";

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

interface JobsContextValue {
  jobs: Job[];
  unreadReportIds: Set<string>;
  unreadCount: number;
  markReportAsRead: (jobId: string) => void;
  markAllAsRead: () => void;
  refreshJobs: () => Promise<void>;
  isPolling: boolean;
}

const JobsContext = createContext<JobsContextValue | null>(null);

const STORAGE_KEY = "vibed-read-reports";

type JobsStoreSnapshot = {
  jobs: Job[];
  isPolling: boolean;
};

let jobsStoreSnapshot: JobsStoreSnapshot = { jobs: [], isPolling: false };
const jobsStoreListeners = new Set<() => void>();
let jobsStoreIntervalId: number | null = null;
let jobsStoreIntervalMs: number | null = null;
let jobsStorePreviousStatus = new Map<string, string>();
let jobsStoreInitialized = false;
let jobsStoreInFlight: Promise<void> | null = null;

function jobsStoreEmit(): void {
  for (const listener of jobsStoreListeners) {
    listener();
  }
}

function jobsStoreSetSnapshot(next: JobsStoreSnapshot): void {
  jobsStoreSnapshot = next;
  jobsStoreEmit();
}

function jobsStoreHasActiveJobs(jobs: Job[]): boolean {
  return jobs.some((j) => j.status === "pending" || j.status === "running");
}

async function jobsStoreFetchOnce(): Promise<void> {
  if (jobsStoreInFlight) return jobsStoreInFlight;

  jobsStoreInFlight = (async () => {
    try {
      const res = await fetch("/api/analysis/jobs");
      if (!res.ok) return;
      const data = await res.json();
      const newJobs: Job[] = data.jobs ?? [];

      if (jobsStoreInitialized) {
        for (const job of newJobs) {
          const previousStatus = jobsStorePreviousStatus.get(job.id);
          if (job.status === "done" && previousStatus && previousStatus !== "done") {
            const repoName = job.repoName ?? "Repository";
            toast({
              title: `Analysis complete: ${repoName}`,
              description: "Your vibe report is ready to view.",
              action: (
                <ToastAction altText="View Report" asChild>
                  <Link href={`/analysis/${job.id}`}>View</Link>
                </ToastAction>
              ),
            });
          }
        }
      }

      jobsStorePreviousStatus = new Map(newJobs.map((j) => [j.id, j.status]));
      jobsStoreInitialized = true;

      const isPolling = jobsStoreHasActiveJobs(newJobs);
      jobsStoreSetSnapshot({ jobs: newJobs, isPolling });
    } catch {
      // Ignore
    }
  })().finally(() => {
    jobsStoreInFlight = null;
  });

  return jobsStoreInFlight;
}

function jobsStoreEnsureInterval(): void {
  const hasActiveJobs = jobsStoreHasActiveJobs(jobsStoreSnapshot.jobs);
  const desiredMs = hasActiveJobs ? 3000 : 30000;

  if (jobsStoreIntervalId !== null && jobsStoreIntervalMs === desiredMs) return;
  if (jobsStoreIntervalId !== null) {
    window.clearInterval(jobsStoreIntervalId);
    jobsStoreIntervalId = null;
    jobsStoreIntervalMs = null;
  }

  jobsStoreIntervalMs = desiredMs;
  jobsStoreIntervalId = window.setInterval(() => {
    void jobsStoreFetchOnce().then(() => {
      jobsStoreEnsureInterval();
    });
  }, desiredMs);
}

function jobsStoreSubscribe(listener: () => void): () => void {
  jobsStoreListeners.add(listener);

  if (jobsStoreListeners.size === 1) {
    void jobsStoreFetchOnce().then(() => {
      jobsStoreEnsureInterval();
    });
    jobsStoreEnsureInterval();
  }

  return () => {
    jobsStoreListeners.delete(listener);
    if (jobsStoreListeners.size === 0 && jobsStoreIntervalId !== null) {
      window.clearInterval(jobsStoreIntervalId);
      jobsStoreIntervalId = null;
      jobsStoreIntervalMs = null;
    }
  };
}

function jobsStoreGetSnapshot(): JobsStoreSnapshot {
  return jobsStoreSnapshot;
}

function getReadReportIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch {
    // Ignore parse errors
  }
  return new Set();
}

function saveReadReportIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    // Keep only last 100 IDs to avoid localStorage bloat
    const arr = Array.from(ids).slice(-100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // Ignore storage errors
  }
}

export function JobsProvider({ children }: { children: ReactNode }) {
  const { jobs, isPolling } = useSyncExternalStore(
    jobsStoreSubscribe,
    jobsStoreGetSnapshot,
    jobsStoreGetSnapshot
  );

  const [readReportIds, setReadReportIds] = useState<Set<string>>(() => getReadReportIds());

  // Calculate unread reports
  const completedJobs = jobs.filter((j) => j.status === "done");
  const unreadReportIds = new Set(
    completedJobs
      .filter((j) => !readReportIds.has(j.id))
      .map((j) => j.id)
  );
  const unreadCount = unreadReportIds.size;

  const markReportAsRead = useCallback((jobId: string) => {
    setReadReportIds((prev) => {
      const next = new Set(prev);
      next.add(jobId);
      saveReadReportIds(next);
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadReportIds((prev) => {
      const next = new Set(prev);
      for (const job of completedJobs) {
        next.add(job.id);
      }
      saveReadReportIds(next);
      return next;
    });
  }, [completedJobs]);

  const refreshJobs = useCallback(async () => {
    await jobsStoreFetchOnce();
  }, []);

  return (
    <JobsContext.Provider
      value={{
        jobs,
        unreadReportIds,
        unreadCount,
        markReportAsRead,
        markAllAsRead,
        refreshJobs,
        isPolling,
      }}
    >
      {children}
    </JobsContext.Provider>
  );
}

export function useJobs(): JobsContextValue {
  const context = useContext(JobsContext);
  if (!context) {
    throw new Error("useJobs must be used within a JobsProvider");
  }
  return context;
}

/**
 * Optional version of useJobs that returns null when not in a JobsProvider.
 * Useful for components that may render outside the authenticated context.
 */
export function useJobsOptional(): JobsContextValue | null {
  return useContext(JobsContext);
}
