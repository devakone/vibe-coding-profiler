"use client";

import Image from "next/image";
import type { ShareCardProps } from "./types";

/**
 * ShareCard - A reusable, visually appealing share card component
 * 
 * Used on both repo analysis and profile pages to display a shareable
 * summary of the user's vibe coding style.
 */
export function ShareCard({
  variant,
  persona,
  metrics,
  footer,
  colors,
  avatarUrl,
  headerLabel,
}: ShareCardProps) {
  const defaultHeader = variant === "profile" ? "My Vibed Coding Profile" : "My Vibe Coding Style";
  const header = headerLabel ?? defaultHeader;

  return (
    <div
      className="overflow-hidden rounded-3xl border border-black/5 shadow-lg"
      style={{
        background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
      }}
    >
      <div className="p-6 sm:p-8">
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
          <div className="hidden shrink-0 sm:block">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="User avatar"
                width={48}
                height={48}
                className="rounded-full border-2 border-white/30 object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                <span className="text-lg font-bold text-white">V</span>
              </div>
            )}
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
