"use client";

import { useEffect, useState } from "react";

type Job = {
  id: string;
  status: string;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

type ApiResponse = {
  job: Job;
  report: unknown | null;
  metrics: unknown | null;
};

type Report = {
  bolokono_type: string | null;
  narrative_json?: { summary?: string };
};

function isReport(v: unknown): v is Report {
  if (!v || typeof v !== "object") return false;
  const r = v as { bolokono_type?: unknown };
  return r.bolokono_type === null || typeof r.bolokono_type === "string";
}

export default function AnalysisClient({ jobId }: { jobId: string }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;

    async function tick() {
      try {
        const res = await fetch(`/api/analysis/${jobId}`, { cache: "no-store" });
        const json = (await res.json()) as unknown;

        if (!res.ok) {
          const err = (json as { error?: unknown } | null)?.error;
          throw new Error(typeof err === "string" ? err : "Failed to fetch analysis status");
        }

        const parsed = json as ApiResponse;
        if (!cancelled) setData(parsed);
        if (!cancelled && (parsed.job.status === "queued" || parsed.job.status === "running")) {
          timeoutId = window.setTimeout(tick, 2000);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to fetch analysis status");
      }
    }

    tick();

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [jobId]);

  if (error) return <p className="mt-6 text-sm text-red-600">{error}</p>;
  if (!data) return <p className="mt-6 text-sm text-zinc-600">Loading...</p>;

  const { job, report } = data;
  const parsedReport = isReport(report) ? report : null;

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="rounded-md border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-600">Status</p>
        <p className="mt-1 text-lg font-semibold text-zinc-900">{job.status}</p>
        {job.error_message ? (
          <p className="mt-2 text-sm text-red-600">{job.error_message}</p>
        ) : null}
      </div>

      {job.status === "done" && parsedReport ? (
        <div className="rounded-md border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-600">Bolokono type</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">
            {parsedReport.bolokono_type ?? "—"}
          </p>
          <p className="mt-4 text-sm font-medium text-zinc-900">Summary</p>
          <p className="mt-1 text-sm text-zinc-700">
            {parsedReport.narrative_json?.summary ?? "—"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
