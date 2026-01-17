import Link from "next/link";

const dataWeStore = [
  "Repo identifiers you connect (owner/name + GitHub IDs).",
  "Commit metadata used for analysis: SHA, commit message, timestamps, parent SHAs.",
  "Commit-level summary stats from GitHub: file count, additions, deletions.",
  "Derived outputs: metrics, events, and narrative/insight JSON tied to a job.",
];

const recommendations = [
  "Do not connect work, client, or NDA repositories.",
  "Treat commit messages as sensitive; avoid secrets in commits.",
  "Use a separate GitHub account for experiments if needed.",
  "Only connect repos you are comfortable analyzing and storing.",
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 px-6 py-12 sm:px-10 lg:px-20">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">
              Security notes
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              How we handle your data (and what you should not share)
            </h1>
            <p className="max-w-2xl text-base text-white/70 sm:text-lg">
              This page is written to be defensible: it describes what the product does today, not
              aspirational guarantees. No system is foolproof—please read the recommendations if
              you are a solo builder experimenting with real repos.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full border border-white/20 px-6 py-2 text-sm font-semibold text-white/90 transition hover:border-white/40"
            >
              Home
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-zinc-900"
            >
              Sign in
            </Link>
          </div>
        </header>

        <div className="mt-12 grid gap-6">
          <section className="rounded-3xl border border-white/10 bg-zinc-900/40 p-8 shadow-[0_20px_60px_rgba(2,6,23,0.7)]">
            <h2 className="text-xl font-semibold text-white">What we do</h2>
            <p className="mt-3 text-sm text-white/70">
              Bolokono connects to GitHub, fetches commit history, computes metrics, and stores the
              results in Supabase Postgres. Access to rows is scoped to your authenticated account
              via Supabase Row Level Security (RLS) policies for user-facing reads.
            </p>
            <p className="mt-3 text-sm text-white/70">
              The worker that performs analysis uses a server-side Supabase key (service role) and
              is able to write job outputs. This is powerful by design; it is kept server-side and
              is not intended to be exposed to browsers.
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-zinc-900/40 p-8 shadow-[0_20px_60px_rgba(2,6,23,0.7)]">
            <h2 className="text-xl font-semibold text-white">What we store</h2>
            <p className="mt-3 text-sm text-white/70">
              Today, the analysis pipeline persists both raw-ish inputs and derived outputs so we
              can reproduce charts and narratives for a completed job.
            </p>
            <ul className="mt-5 space-y-3 text-sm text-white/70">
              {dataWeStore.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-300/70" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-white/70">
              Note: when fetching commit details from GitHub, the API response can include file
              paths and diff snippets. Bolokono’s current worker extracts and stores counts/stats
              (like number of files and additions/deletions), not file contents.
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-zinc-900/40 p-8 shadow-[0_20px_60px_rgba(2,6,23,0.7)]">
            <h2 className="text-xl font-semibold text-white">How credentials are handled</h2>
            <p className="mt-3 text-sm text-white/70">
              GitHub OAuth tokens are encrypted before being stored in the database using
              application-layer encryption (AES-256-GCM). Decryption happens server-side when the
              backend needs to call GitHub on your behalf.
            </p>
            <p className="mt-3 text-sm text-white/70">
              If you are self-hosting, treat the encryption key and Supabase service role key like
              production secrets. If those secrets are compromised, an attacker could potentially
              decrypt tokens or bypass row-level restrictions.
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/70 to-cyan-500/50 p-8">
            <h2 className="text-xl font-semibold text-white">Recommendations</h2>
            <p className="mt-3 text-sm text-white/80">
              Bolokono is designed for personal insight. Keep the blast radius small.
            </p>
            <ul className="mt-5 space-y-3 text-sm text-white/80">
              {recommendations.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-white/80" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-white/80">
              If your repository contains sensitive information (secrets, customer details,
              private code under agreement), do not connect it.
            </p>
          </section>
        </div>

        <footer className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>Bolokono</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/" className="transition hover:text-white">
              Home
            </Link>
            <Link href="/login" className="transition hover:text-white">
              Sign in
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

