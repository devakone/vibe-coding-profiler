"use client";

import { cn } from "@/lib/utils";

// Highlight can be a simple string or a rich object
type HighlightItem = 
  | string 
  | { label: string; value: string | number; interpretation?: string };

interface UnifiedInsightSectionProps {
  /** Main headline/insight */
  headline: string;
  /** Additional narrative paragraphs (LLM-generated) */
  paragraphs?: string[];
  /** Highlight bullet points (LLM-generated) - can be strings or objects */
  highlights?: HighlightItem[];
  /** Whether the narrative is LLM-generated */
  isLLMGenerated?: boolean;
  /** LLM model used */
  llmModel?: string | null;
  /** Source of LLM key used for this narrative */
  llmKeySource?: string | null;
  /** Additional class names */
  className?: string;
}

/**
 * Render a highlight item - handles both string and object formats
 */
function renderHighlight(item: HighlightItem): string {
  if (typeof item === "string") {
    return item;
  }
  // Object format: { label, value, interpretation }
  const parts = [`${item.label}: ${item.value}`];
  if (item.interpretation) {
    parts.push(`— ${item.interpretation}`);
  }
  return parts.join(" ");
}

/**
 * UnifiedInsightSection - Displays the main insight and LLM narrative
 *
 * Styled with violet left border to indicate AI-generated content
 */
export function UnifiedInsightSection({
  headline,
  paragraphs = [],
  highlights = [],
  isLLMGenerated = false,
  llmModel,
  llmKeySource,
  className,
}: UnifiedInsightSectionProps) {
  const modelLabel = llmModel?.trim() || null;
  const providerLabel = modelLabel?.startsWith("gpt-")
    ? "OpenAI"
    : modelLabel?.startsWith("claude-")
      ? "Anthropic"
      : modelLabel?.startsWith("gemini-")
        ? "Google"
        : null;
  const sourceLabel =
    llmKeySource === "user"
      ? "User key"
      : llmKeySource === "platform"
        ? "Platform key"
        : llmKeySource === "sponsor"
          ? "Sponsor key"
          : "Deterministic fallback";
  const generatedWithLabel =
    isLLMGenerated && modelLabel
      ? `${providerLabel ? `${providerLabel} ` : ""}${modelLabel}`
      : null;

  return (
    <div className={cn("border-t border-black/5 px-8 py-6 sm:px-10", className)}>
      <div className="rounded-xl border-l-4 border-l-violet-500 bg-violet-50 px-5 py-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-600">
            Insight
          </p>
          {isLLMGenerated && llmModel ? (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-600">
              AI-generated
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-base font-medium leading-relaxed text-slate-800 sm:text-lg">
          {headline}
        </p>
        {paragraphs.length > 0 ? (
          <div className="mt-4 space-y-3">
            {paragraphs.map((paragraph, idx) => (
              <p key={idx} className="text-sm leading-relaxed text-slate-700">
                {paragraph}
              </p>
            ))}
          </div>
        ) : null}
        {highlights.length > 0 ? (
          <ul className="mt-4 space-y-1">
            {highlights.map((highlight, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-1 text-violet-400">•</span>
                <span>{renderHighlight(highlight)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-4 text-xs text-slate-500">
          Narrative source: {sourceLabel}
          {generatedWithLabel ? ` (${generatedWithLabel})` : ""}
        </p>
      </div>
    </div>
  );
}
