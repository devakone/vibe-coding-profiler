import Link from "next/link";
import { cn } from "@/lib/utils";
import type { VCPMethodologyLinkProps } from "../types";

/**
 * VCPMethodologyLink - Link to methodology page
 *
 * Consistent call-to-action for learning more about how VCP works.
 */
export function VCPMethodologyLink({
  variant = "inline",
  text = "How we calculate your vibe",
  className,
}: VCPMethodologyLinkProps) {
  if (variant === "block") {
    return (
      <Link
        href="/methodology"
        className={cn(
          "block rounded-xl bg-white/5 p-4 text-center text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white/80",
          className
        )}
      >
        {text} →
      </Link>
    );
  }

  return (
    <Link
      href="/methodology"
      className={cn(
        "text-sm text-white/50 underline decoration-white/20 underline-offset-2 transition-colors hover:text-white/70 hover:decoration-white/40",
        className
      )}
    >
      {text}
    </Link>
  );
}
