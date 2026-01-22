import Image from "next/image";
import { cn } from "@/lib/utils";
import type { VCPIdentityHeaderProps } from "../types";
import { VCPBadge } from "../primitives";
import { CONFIDENCE_LABELS, getPersonaIcon } from "../constants";

/**
 * VCPIdentityHeader - Main identity display for VCP cards
 *
 * Shows persona name, tagline, confidence, and optional avatar/icon.
 */
export function VCPIdentityHeader({
  label,
  persona,
  statsLine,
  avatarUrl,
  personaIconUrl,
  actions,
  className,
}: VCPIdentityHeaderProps) {
  const iconUrl = personaIconUrl ?? getPersonaIcon(persona.id);
  const confidenceLabel = CONFIDENCE_LABELS[persona.confidence] ?? persona.confidence;

  return (
    <div className={cn("px-6 py-5", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header label */}
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
            {label}
          </p>

          {/* Persona name */}
          <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            {persona.name}
          </h2>

          {/* Tagline */}
          <p className="mt-2 max-w-md text-base leading-relaxed text-white/70">
            {persona.tagline}
          </p>

          {/* Confidence + stats line */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/50">
            <VCPBadge
              variant={
                persona.confidence === "high"
                  ? "success"
                  : persona.confidence === "medium"
                    ? "warning"
                    : "muted"
              }
              size="sm"
            >
              {confidenceLabel}
            </VCPBadge>
            {statsLine && (
              <>
                <span className="text-white/30">·</span>
                <span>{statsLine}</span>
              </>
            )}
          </div>
        </div>

        {/* Right side: avatar + persona icon */}
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          {avatarUrl && (
            <Image
              src={avatarUrl}
              alt="User avatar"
              width={48}
              height={48}
              className="rounded-full border-2 border-white/20 object-cover"
            />
          )}
          <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white/10 backdrop-blur">
            <Image
              src={iconUrl}
              alt={persona.name}
              width={48}
              height={48}
              className="h-12 w-12 object-cover"
            />
            <div className="absolute inset-0 rounded-full ring-2 ring-white/20" />
          </div>
        </div>
      </div>

      {/* Actions */}
      {actions && (
        <div className="mt-4 flex items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
