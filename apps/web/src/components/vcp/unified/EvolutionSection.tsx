import { cn } from "@/lib/utils";

interface EvolutionSectionProps {
  /** Number of completed repo VCPs */
  repoVcpCount: number;
  /** Number of persona shifts detected */
  vibeShifts: number;
  /** Dominant persona name (short) */
  dominantVibe: string | null;
  /** Helper text explaining shift history */
  shiftHelper?: string;
  /** Additional class names */
  className?: string;
}

/**
 * EvolutionSection - Shows how the user's vibe has developed over time
 *
 * Displays: Repo VCPs count, Vibe shifts, Dominant vibe
 */
export function EvolutionSection({
  repoVcpCount,
  vibeShifts,
  dominantVibe,
  shiftHelper,
  className,
}: EvolutionSectionProps) {
  return (
    <div className={cn("border-t border-black/5 p-8 sm:p-10", className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500">
        Evolution
      </p>
      <p className="mt-1 text-sm text-zinc-600">
        How your vibe has developed over time
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/5 bg-zinc-50/50 p-4 text-center">
          <p className="text-3xl font-bold text-zinc-900">{repoVcpCount}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Repo VCPs
          </p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-zinc-50/50 p-4 text-center">
          <p className="text-3xl font-bold text-zinc-900">{vibeShifts}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Vibe Shifts
          </p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-zinc-50/50 p-4 text-center">
          <p className="text-3xl font-bold text-zinc-900">
            {dominantVibe ?? "—"}
          </p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Dominant Vibe
          </p>
        </div>
      </div>

      {shiftHelper ? (
        <p className="mt-4 text-xs text-zinc-500">{shiftHelper}</p>
      ) : null}
    </div>
  );
}
