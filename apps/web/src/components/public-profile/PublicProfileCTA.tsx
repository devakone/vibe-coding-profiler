import Link from "next/link";

/**
 * Footer CTA for public profile pages.
 * Encourages visitors to create their own VCP.
 */
export function PublicProfileCTA() {
  return (
    <div className="mt-8 rounded-2xl border border-violet-200/50 bg-gradient-to-r from-violet-50 to-indigo-50 px-8 py-6 text-center">
      <p className="text-lg font-semibold text-zinc-900">
        Discover your AI coding style
      </p>
      <p className="mt-1 text-sm text-zinc-600">
        Analyze your commit history and get your own Vibe Coding Profile.
      </p>
      <Link
        href="/login"
        className="mt-4 inline-block rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
      >
        Get your own VCP
      </Link>
    </div>
  );
}
