import { NextResponse } from "next/server";
import { assignVibeType, computeAnalysisInsights, computeAnalysisMetrics, type CommitEvent } from "@vibed/core";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { generateNarrativeWithClaude, toNarrativeFallback } from "@/inngest/functions/analyze-repo";

export const runtime = "nodejs";

type RateLimitRpcLike = {
  rpc: (
    fn: string,
    args: {
      p_user_id: string;
      p_action: string;
      p_window_seconds: number;
      p_max_count: number;
    }
  ) => Promise<{ data: unknown; error: unknown }>;
};

async function probeAnthropicKey(params: { anthropicApiKey: string }): Promise<number | null> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": params.anthropicApiKey,
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1,
        temperature: 0,
        system: "Return a single character.",
        messages: [{ role: "user", content: "ping" }],
      }),
    });
    return res.status;
  } catch {
    return null;
  }
}

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

  const service = createSupabaseServiceClient();
  const { data: allowedData, error: rateLimitError } = await (service as unknown as RateLimitRpcLike).rpc(
    "consume_user_action_rate_limit",
    {
      p_user_id: user.id,
      p_action: "analysis_regenerate_story",
      p_window_seconds: 60,
      p_max_count: 6,
    }
  );

  if (rateLimitError) {
    return NextResponse.json({ error: "rate_limit_failed" }, { status: 500 });
  }

  if (allowedData !== true && allowedData !== false) {
    return NextResponse.json({ error: "rate_limit_failed" }, { status: 500 });
  }

  if (allowedData === false) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { data: job, error: jobError } = await service
    .from("analysis_jobs")
    .select("id, user_id, repo_id, status")
    .eq("id", id)
    .single();

  if (jobError || !job) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (job.user_id !== user.id) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (job.status !== "done") return NextResponse.json({ error: "job_not_done" }, { status: 409 });

  const { data: repo, error: repoError } = await service
    .from("repos")
    .select("full_name")
    .eq("id", job.repo_id)
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
  const llmKey = process.env.ANTHROPIC_API_KEY;
  const llmKeyValue = llmKey?.trim() ?? "";
  const llmKeyPresent = llmKeyValue.length > 0;

  const preferredModel = process.env.ANTHROPIC_MODEL?.trim() ?? "";
  const modelCandidates = [
    preferredModel.length > 0 ? preferredModel : "claude-sonnet-4-20250514",
    "claude-3-haiku-20240307",
  ];

  let llmNarrative: Awaited<ReturnType<typeof generateNarrativeWithClaude>> = null;
  let llmModelUsed: string | null = null;

  if (llmKeyPresent) {
    for (const candidate of modelCandidates) {
      const attempt = await generateNarrativeWithClaude({
        anthropicApiKey: llmKeyValue,
        model: candidate,
        repoFullName: repo.full_name,
        vibeType: assignment.vibe_type,
        confidence: assignment.confidence,
        matchedCriteria: assignment.matched_criteria,
        metrics,
        insights,
        events,
      });
      if (attempt) {
        llmNarrative = attempt;
        llmModelUsed = candidate;
        break;
      }
    }
  }

  const llmUsed = Boolean(llmNarrative);
  const llmReason = await (async (): Promise<string> => {
    if (llmUsed) return "ok";
    if (!llmKeyPresent) return "missing_api_key";
    const status = await probeAnthropicKey({ anthropicApiKey: llmKeyValue });
    if (typeof status === "number") return `anthropic_http_${status}`;
    return "anthropic_unreachable";
  })();

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
      generated_at: nextGeneratedAt,
    },
    { onConflict: "job_id" }
  );

  if (reportError) {
    return NextResponse.json({ error: "report_update_failed" }, { status: 500 });
  }

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
    },
  });
}
