"use client";

import Image from "next/image";
import { getPersonaAura } from "@/lib/persona-auras";
import type { ShareCardProps } from "./types";

/**
 * ShareCard - A reusable, visually appealing share card component
 * 
 * Used on both repo analysis and profile pages to display a shareable
 * summary of the user's vibe coding style.
 */
export function ShareCard({
  variant,
  personaId,
  persona,
  metrics,
  footer,
  colors,
  avatarUrl,
  headerLabel,
}: ShareCardProps) {
  const defaultHeader = variant === "profile" ? "My Unified VCP" : "My Repo VCP";
  const header = headerLabel ?? defaultHeader;
  const aura = getPersonaAura(personaId);

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-black/5 shadow-lg"
      style={{
        background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
      }}
    >
      {/* Aura background overlay */}
      <div className="pointer-events-none absolute inset-0">
        <Image
          src={aura.background}
          alt=""
          fill
          priority={variant === "profile"}
          className="object-cover opacity-25 mix-blend-overlay"
        />
        {/* Readability overlay */}
        <div className="absolute inset-0 bg-black/15" />
      </div>

      <div className="relative p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
              {header}
            </p>
            <h3 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
              {persona.label}
            </h3>
            <p className="mt-2 max-w-md text-base text-white/80">
              {persona.tagline}
            </p>
            {persona.confidence ? (
              <p className="mt-2 text-sm font-medium text-white/70">
                {persona.confidence} confidence
              </p>
            ) : null}
          </div>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="User avatar"
                width={48}
                height={48}
                className="rounded-full border-2 border-white/30 object-cover"
              />
            ) : null}
            <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white/10 backdrop-blur">
              <Image
                src={aura.icon}
                alt={aura.alt}
                width={48}
                height={48}
                className="h-12 w-12 object-cover"
              />
              <div className="absolute inset-0 rounded-full ring-2 ring-white/20" />
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className={`mt-6 grid gap-4 ${metrics.length <= 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
          {metrics.slice(0, 4).map((metric, idx) => (
            <div key={`${metric.label}-${idx}`} className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                {metric.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-white">
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
          <p className="text-xs font-medium text-white/50">
            {footer.left}
          </p>
          <p className="text-xs text-white/50">
            {footer.right}
          </p>
        </div>
      </div>
    </div>
  );
}
