/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

interface PublicIdentityHeaderProps {
  username: string;
  personaName: string | null;
  personaTagline: string | null;
  personaConfidence: string | null;
  avatarUrl: string | null;
  totalRepos: number | null;
  totalCommits: number | null;
  className?: string;
}

/**
 * Public identity header for public profile pages.
 * Adapted from UnifiedIdentitySection without action buttons.
 */
export function PublicIdentityHeader({
  username,
  personaName,
  personaTagline,
  personaConfidence,
  avatarUrl,
  totalRepos,
  totalCommits,
  className,
}: PublicIdentityHeaderProps) {
  return (
    <div
      className={cn(
        "relative bg-gradient-to-br from-violet-500/8 via-indigo-500/5 to-violet-500/8 p-8 sm:p-10",
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.06),transparent_50%)]" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500">
              @{username}&apos;s VCP
            </p>
          </div>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${username}'s avatar`}
              className="h-14 w-14 rounded-full border-2 border-white shadow-sm"
            />
          ) : null}
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl">
          {personaName ?? "Profile"}
        </h1>
        {personaTagline ? (
          <p className="mt-3 text-lg text-zinc-700">
            &ldquo;{personaTagline}&rdquo;
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-600">
          {personaConfidence ? (
            <span className="rounded-full bg-white/80 px-3 py-1 font-medium text-zinc-800 shadow-sm">
              {personaConfidence} confidence
            </span>
          ) : null}
          {totalRepos != null ? <span>{totalRepos} repos</span> : null}
          {totalRepos != null && totalCommits != null ? <span>&middot;</span> : null}
          {totalCommits != null ? (
            <span>{totalCommits.toLocaleString()} commits</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
