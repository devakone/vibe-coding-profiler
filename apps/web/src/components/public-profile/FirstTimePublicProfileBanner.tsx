"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Sparkles } from "lucide-react";

const STORAGE_KEY = "vcp_public_profile_intro_seen";

interface FirstTimePublicProfileBannerProps {
  /** Whether user's public profile is already enabled */
  profileEnabled: boolean;
  /** Whether user has claimed a username */
  hasUsername: boolean;
}

/**
 * Dismissible onboarding banner shown after first VCP generation.
 * Prompts users to enable their public profile.
 * Uses localStorage to track dismissal.
 */
export function FirstTimePublicProfileBanner({
  profileEnabled,
  hasUsername,
}: FirstTimePublicProfileBannerProps) {
  const [dismissed, setDismissed] = useState(true); // Start true to avoid flash
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const seen = localStorage.getItem(STORAGE_KEY) === "1";
    setDismissed(seen);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  };

  // Don't render during SSR or if dismissed or if profile already enabled
  if (!mounted || dismissed || profileEnabled) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-300/50 bg-gradient-to-r from-violet-100 via-indigo-50 to-violet-100 px-6 py-5 shadow-sm">
      {/* Decorative sparkle */}
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-violet-200/30 blur-2xl" />
      <div className="absolute -left-4 -bottom-4 h-20 w-20 rounded-full bg-indigo-200/30 blur-2xl" />

      <div className="relative flex items-start gap-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 shadow-sm">
          <Sparkles className="h-5 w-5 text-white" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-zinc-900">
            Your Vibe Coding Profile is ready!
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            {hasUsername
              ? "Enable your public profile to share your VCP on Twitter, LinkedIn, and more."
              : "Claim a username and enable your public profile to share your VCP with the world."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link
              href="/settings/public-profile"
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              {hasUsername ? "Enable Public Profile" : "Set Up Public Profile"}
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="text-sm font-medium text-zinc-500 hover:text-zinc-700"
            >
              Maybe later
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-200/50 hover:text-zinc-600"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
