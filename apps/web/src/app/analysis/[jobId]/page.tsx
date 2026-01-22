import type { Metadata } from "next";
import AnalysisClient from "./AnalysisClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { wrappedTheme } from "@/lib/theme";

export const runtime = "nodejs";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:8108";

// Database row types for OG metadata
type AnalysisJobRow = {
  repo_id: string;
  commit_count: number | null;
  status: string;
};

type RepoRow = {
  full_name: string;
};

type VibeInsightsRow = {
  persona_name: string | null;
  persona_tagline: string | null;
};

type AnalysisInsightsRow = {
  persona_label: string | null;
  share_template: unknown;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ jobId: string }>;
}): Promise<Metadata> {
  const { jobId } = await params;
  const supabase = await createSupabaseServerClient();

  // Fetch job and related data for OG metadata
  const { data: jobData } = await supabase
    .from("analysis_jobs")
    .select("repo_id, commit_count, status")
    .eq("id", jobId)
    .maybeSingle();

  const job = jobData as AnalysisJobRow | null;

  if (!job || job.status !== "done") {
    return {
      title: "Analysis | Vibe Coding Profiler",
      description: "Analyzing your commit history to discover your Vibe Coding Profile.",
    };
  }

  // Fetch persona and repo info
  const [repoResult, vibeResult, insightsResult] = await Promise.all([
    supabase.from("repos").select("full_name").eq("id", job.repo_id).maybeSingle(),
    supabase
      .from("vibe_insights")
      .select("persona_name, persona_tagline")
      .eq("job_id", jobId)
      .maybeSingle(),
    supabase
      .from("analysis_insights")
      .select("persona_label, share_template")
      .eq("job_id", jobId)
      .maybeSingle(),
  ]);

  const repoRow = repoResult?.data as RepoRow | null;
  const vibeRow = vibeResult?.data as VibeInsightsRow | null;
  const insightsRow = insightsResult?.data as AnalysisInsightsRow | null;

  const repoName =
    repoRow?.full_name && typeof repoRow.full_name === "string"
      ? repoRow.full_name
      : "Repository";

  const personaName =
    vibeRow?.persona_name ??
    insightsRow?.persona_label ??
    "Vibe Coder";

  const personaTagline =
    vibeRow?.persona_tagline ??
    (insightsRow?.share_template as { tagline?: string } | null)?.tagline ??
    "Discover your AI coding style";

  const title = `${personaName} | ${repoName} VCP`;
  const description = `${personaTagline} — ${job.commit_count?.toLocaleString() ?? 0} commits analyzed.`;
  const ogImageUrl = `${appUrl}/api/og/analysis/${jobId}`;
  const pageUrl = `${appUrl}/analysis/${jobId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "Vibe Coding Profiler",
      type: "article",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${personaName} - Vibe Coding Profile for ${repoName}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className={`${wrappedTheme.container} py-10`}>
      <div className="mx-auto max-w-5xl">
        <AnalysisClient jobId={jobId} />
        <details className={`mt-10 rounded-[2rem] p-6 ${wrappedTheme.card}`}>
          <summary className="cursor-pointer text-sm font-semibold text-zinc-900">
            Analysis details
          </summary>
          <div className="mt-3 space-y-1 text-sm text-zinc-600">
            <p>
              Job <span className="font-mono">{jobId}</span>
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}
