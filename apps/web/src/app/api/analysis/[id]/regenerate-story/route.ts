import { NextResponse } from "next/server";
import {
  assignVibeType,
  computeAnalysisInsights,
  computeAnalysisMetrics,
  getModelCandidates,
  type AnalysisReport,
  type CommitEvent,
  type LLMKeySource,
} from "@vibe-coding-profiler/core";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { generateNarrativeWithLLM, toNarrativeFallback } from "@/inngest/functions/analyze-repo";
import {
  resolveLLMConfig,
  resolveProfileLLMConfig,
  recordLLMUsage,
  getPerRepoLimit,
  countPlatformAnalysesUsed,
  countReposWithLlmReports,
  getProfileLlmRepoLimit,
} from "@/lib/llm-config";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}

function isCommitEvent(v: unknown): v is CommitEvent {
  if (!isRecord(v)) return false;
  return (
    typeof v.sha === "string" &&
    typeof v.message === "string" &&
    typeof v.author_date === "string" &&
    typeof v.committer_date === "string" &&
    typeof v.author_email === "string" &&
    typeof v.files_changed === "number" &&
    typeof v.additions === "number" &&
    typeof v.deletions === "number" &&
    Array.isArray(v.parents) &&
    v.parents.every((p) => typeof p === "string")
  );
}

function toCommitEvents(value: unknown): CommitEvent[] | null {
  if (!Array.isArray(value)) return null;
  const events: CommitEvent[] = [];
  for (const row of value) {
    if (!isCommitEvent(row)) return null;
    events.push(row);
  }
  return events;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const requestUrl = new URL(request.url);
  const requestOrigin = requestUrl.origin;
  const originHeader = request.headers.get("origin");
  const refererHeader = request.headers.get("referer");

  if (originHeader && originHeader !== requestOrigin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!originHeader && refererHeader) {
    const refererOrigin = new URL(refererHeader).origin;
    if (refererOrigin !== requestOrigin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  // Rate limiting (bypassed for localhost and admins)
  const rateLimit = await checkRateLimit({
    userId: user.id,
    action: "analysis_regenerate_story",
    windowSeconds: 60,
    maxCount: 6,
  });

  if (!rateLimit.allowed) {
    if (rateLimit.reason === "rate_limited") {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    return NextResponse.json({ error: "rate_limit_failed" }, { status: 500 });
  }

  const service = createSupabaseServiceClient();
  const { data: job, error: jobError } = await service
    .from("analysis_jobs")
    .select("id, user_id, repo_id, status")
    .eq("id", id)
    .single();

  if (jobError || !job) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (job.user_id !== user.id) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (job.status !== "done") return NextResponse.json({ error: "job_not_done" }, { status: 409 });

  const repoId = job.repo_id;

  const { data: repo, error: repoError } = await service
    .from("repos")
    .select("full_name")
    .eq("id", repoId)
    .single();

  if (repoError || !repo?.full_name) {
    return NextResponse.json({ error: "repo_not_found" }, { status: 404 });
  }

  const { data: metricsRow, error: metricsError } = await service
    .from("analysis_metrics")
    .select("events_json")
    .eq("job_id", id)
    .single();

  if (metricsError || !metricsRow) {
    return NextResponse.json({ error: "missing_metrics" }, { status: 409 });
  }

  const events = toCommitEvents(metricsRow.events_json);
  if (!events || events.length === 0) {
    return NextResponse.json({ error: "missing_events" }, { status: 409 });
  }

  const metrics = computeAnalysisMetrics(events);
  const assignment = assignVibeType(metrics);
  const insights = computeAnalysisInsights(events);

  const fallbackNarrative = toNarrativeFallback({ metrics, events });

  // Resolve LLM config (user key, platform key, or none)
  const llmResolution = await resolveLLMConfig(user.id, repoId);
  let llmNarrative: AnalysisReport["narrative"] | null = null;
  let llmModelUsed: string | null = null;
  const llmKeySource: LLMKeySource = llmResolution.source;

  if (llmResolution.config) {
    const llmConfig = llmResolution.config;
    const modelCandidates = getModelCandidates(llmConfig.provider);

    for (const candidate of modelCandidates) {
      try {
        // Use unified generateNarrativeWithLLM for all providers
        const result = await generateNarrativeWithLLM({
          provider: llmConfig.provider,
          apiKey: llmConfig.apiKey,
          model: candidate,
          repoFullName: repo.full_name,
          vibeType: assignment.vibe_type,
          confidence: assignment.confidence,
          matchedCriteria: assignment.matched_criteria,
          metrics,
          insights,
          events,
        });

        if (result) {
          llmNarrative = result.narrative;
          llmModelUsed = candidate;

          // Record successful usage with token counts
          await recordLLMUsage({
            userId: user.id,
            jobId: id,
            repoId,
            provider: llmConfig.provider,
            model: candidate,
            keySource: llmKeySource,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            success: true,
          });
          break;
        }
      } catch (error) {
        // Record failed attempt for observability
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.warn(`LLM model ${candidate} failed:`, errorMessage);

        await recordLLMUsage({
          userId: user.id,
          jobId: id,
          repoId,
          provider: llmConfig.provider,
          model: candidate,
          keySource: llmKeySource,
          success: false,
          errorMessage,
        });
        continue;
      }
    }
  }

  const llmUsed = Boolean(llmNarrative);
  const llmReason = llmResolution.reason;

  const nextNarrative = llmNarrative ?? fallbackNarrative;
  const nextGeneratedAt = new Date().toISOString();
  const nextLlmModel = llmModelUsed ?? "none";

  const { error: reportError } = await service.from("analysis_reports").upsert(
    {
      job_id: id,
      vibe_type: assignment.vibe_type,
      narrative_json: nextNarrative,
      evidence_json: assignment.matched_criteria,
      llm_model: nextLlmModel,
      llm_key_source: llmKeySource,
      generated_at: nextGeneratedAt,
    },
    { onConflict: "job_id" }
  );

  if (reportError) {
    return NextResponse.json({ error: "report_update_failed" }, { status: 500 });
  }

  // Get platform usage status for UI
  const platformUsed = await countPlatformAnalysesUsed(user.id, repoId);
  const perRepoLimit = await getPerRepoLimit();

  // Get profile LLM status for UI
  const profileLlmResolution = await resolveProfileLLMConfig(user.id);
  const reposWithLlm = await countReposWithLlmReports(user.id);
  const profileLlmRepoLimit = await getProfileLlmRepoLimit();
  const profileWillUseLlm = profileLlmResolution.config !== null;
  const profileLlmExhausted = reposWithLlm > profileLlmRepoLimit && profileLlmResolution.source !== "user";

  return NextResponse.json({
    report: {
      vibe_type: assignment.vibe_type,
      narrative_json: nextNarrative,
      evidence_json: assignment.matched_criteria,
      llm_model: nextLlmModel,
      generated_at: nextGeneratedAt,
    },
    story: {
      llm_used: llmUsed,
      llm_reason: llmReason,
      llm_source: llmKeySource,
      llm_provider: llmResolution.config?.provider ?? null,
      prompt_add_key: llmKeySource === "none" && llmReason === "limit_exhausted",
    },
    usage: {
      used: platformUsed,
      limit: perRepoLimit,
      exhausted: platformUsed >= perRepoLimit,
    },
    profile: {
      needsRebuild: true,
      willUseLlm: profileWillUseLlm,
      llmExhausted: profileLlmExhausted,
      reposWithLlm,
      repoLimit: profileLlmRepoLimit,
      llmSource: profileLlmResolution.source,
      llmReason: profileLlmResolution.reason,
    },
  });
}
