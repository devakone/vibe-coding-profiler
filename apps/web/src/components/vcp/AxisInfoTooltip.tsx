import { Info } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AxisMetadata } from "./constants";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type AxisInfoTooltipVariant = "light" | "dark";

interface AxisInfoTooltipProps {
  meta: AxisMetadata;
  variant?: AxisInfoTooltipVariant;
  className?: string;
}

const VARIANT_STYLES: Record<AxisInfoTooltipVariant, string> = {
  light: "text-zinc-400 hover:text-zinc-600",
  dark: "text-white/40 hover:text-white/70",
};

export function AxisInfoTooltip({
  meta,
  variant = "light",
  className,
}: AxisInfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`${meta.name} details`}
          className={cn(
            "inline-flex items-center justify-center rounded-full transition",
            VARIANT_STYLES[variant],
            className
          )}
        >
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-xs">
        <p className="text-xs font-semibold">{meta.name}</p>
        <p className="mt-1 text-xs text-background/85">{meta.longDescription}</p>
        <p className="mt-2 text-[11px] text-background/70">
          Score is 0-100. Lower means {meta.lowLabel}, higher means {meta.highLabel}.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
