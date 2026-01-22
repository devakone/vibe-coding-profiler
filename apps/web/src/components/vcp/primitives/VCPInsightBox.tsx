import { cn } from "@/lib/utils";
import type { VCPInsightBoxProps } from "../types";

/**
 * VCPInsightBox - Highlighted insight/callout box
 *
 * Used for AI-generated insights, key highlights, etc.
 */
export function VCPInsightBox({
  type = "default",
  label,
  children,
  bullets,
  className,
}: VCPInsightBoxProps) {
  const typeClasses = {
    default: "border-l-4 border-white/20 bg-white/5",
    ai: "border-l-4 border-purple-400/50 bg-purple-500/10",
    highlight: "border-l-4 border-blue-400/50 bg-blue-500/10",
  };

  return (
    <div className={cn("rounded-r-lg p-4", typeClasses[type], className)}>
      {label && (
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
            {label}
          </span>
          {type === "ai" && (
            <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-medium text-purple-300">
              AI-Generated
            </span>
          )}
        </div>
      )}
      <div className="text-sm leading-relaxed text-white/80">{children}</div>
      {bullets && bullets.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {bullets.map((bullet, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-white/70">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/40" />
              {bullet}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
