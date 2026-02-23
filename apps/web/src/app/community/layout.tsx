import Link from "next/link";

/**
 * Lightweight layout for the public community page.
 * No auth required, minimal header with app logo/link.
 */
export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#faf9fc]">
      {/* Minimal header */}
      <header className="border-b border-black/5 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-zinc-900 transition hover:text-violet-600"
          >
            Vibe Coding Profiler
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110"
          >
            Get your VCP
          </Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
