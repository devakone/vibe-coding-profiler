"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

interface PublicProfileCTABannerProps {
  /** Whether user has claimed a username */
  hasUsername: boolean;
  /** Visual variant */
  variant?: "card" | "inline";
  /** Optional username to show preview link */
  username?: string | null;
}

/**
 * CTA banner prompting users to enable their public profile.
 * Shows on VCP pages when public profile is not enabled.
 */
export function PublicProfileCTABanner({
  hasUsername,
  variant = "card",
  username,
}: PublicProfileCTABannerProps) {
  if (variant === "inline") {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
        <span>
          {hasUsername
            ? "Enable your public profile to share on social media."
            : "Claim a username to share your VCP publicly."}
        </span>
        <Link
          href="/settings/public-profile"
          className="inline-flex items-center gap-1 font-medium text-violet-600 hover:text-violet-800"
        >
          {hasUsername ? "Enable" : "Set up"} public profile
          <ExternalLink size={12} />
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-200/50 bg-gradient-to-r from-violet-50 to-indigo-50 px-6 py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-zinc-900">
            {hasUsername
              ? "Share your VCP publicly"
              : "Create your public VCP profile"}
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            {hasUsername
              ? "Enable your public profile so others can see your Vibe Coding Profile."
              : "Claim a username and enable your public profile to share on social media."}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          {username && (
            <Link
              href={`/u/${username}`}
              className="text-sm font-medium text-zinc-500 hover:text-zinc-700"
              target="_blank"
            >
              Preview
            </Link>
          )}
          <Link
            href="/settings/public-profile"
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
          >
            {hasUsername ? "Enable Public Profile" : "Set Up Profile"}
          </Link>
        </div>
      </div>
    </div>
  );
}
