import Link from "next/link";

export default function AppFooter() {
  return (
    <footer className="mt-auto border-t border-black/5">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-20">
        <p className="text-zinc-700">Vibe Coding Profiler</p>
        <nav className="flex flex-wrap items-center gap-4">
          <Link
            href="/methodology"
            className="transition hover:text-zinc-900"
          >
            Methodology
          </Link>
          <Link href="/security" className="transition hover:text-zinc-900">
            Security
          </Link>
        </nav>
      </div>
    </footer>
  );
}
