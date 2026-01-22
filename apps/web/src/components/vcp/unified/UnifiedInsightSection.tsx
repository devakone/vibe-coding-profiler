"use client";

import { cn } from "@/lib/utils";

interface UnifiedInsightSectionProps {
  /** Main headline/insight */
  headline: string;
  /** Additional narrative paragraphs (LLM-generated) */
  paragraphs?: string[];
  /** Highlight bullet points (LLM-generated) */
  highlights?: string[];
  /** Whether the narrative is LLM-generated */
  isLLMGenerated?: boolean;
  /** LLM model used */
  llmModel?: string | null;
  /** Additional class names */
  className?: string;
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
  className,
}: UnifiedInsightSectionProps) {
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
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
