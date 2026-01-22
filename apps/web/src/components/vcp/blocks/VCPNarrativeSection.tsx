import { cn } from "@/lib/utils";
import type { VCPNarrativeSectionProps } from "../types";
import { VCPSection, VCPInsightBox } from "../primitives";

/**
 * VCPNarrativeSection - LLM-generated narrative display
 *
 * Shows AI-generated summary with paragraphs and highlights.
 */
export function VCPNarrativeSection({
  headline,
  paragraphs,
  highlights,
  llmModel,
  isLoading = false,
  className,
}: VCPNarrativeSectionProps) {
  if (isLoading) {
    return (
      <VCPSection title="Narrative" badge="AI" className={className}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-3/4 rounded bg-white/10" />
          <div className="h-4 w-full rounded bg-white/10" />
          <div className="h-4 w-5/6 rounded bg-white/10" />
        </div>
      </VCPSection>
    );
  }

  if (!headline && !paragraphs?.length) {
    return null;
  }

  return (
    <VCPSection
      title="Narrative"
      badge="AI"
      action={
        llmModel && (
          <span className="text-[10px] text-white/30">via {llmModel}</span>
        )
      }
      className={className}
    >
      <VCPInsightBox type="ai">
        {headline && (
          <p className="font-medium text-white/90">{headline}</p>
        )}
        {paragraphs?.map((p, idx) => (
          <p key={idx} className="mt-2 text-white/70">
            {p}
          </p>
        ))}
      </VCPInsightBox>

      {highlights && highlights.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
            Highlights
          </p>
          <ul className="space-y-1">
            {highlights.map((h, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-white/60">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-purple-400/60" />
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}
    </VCPSection>
  );
}
