import { wrappedTheme } from "@/lib/theme";

export const runtime = "nodejs";

export default async function MethodologyPage() {
  return (
    <div className={`${wrappedTheme.container} ${wrappedTheme.pageY}`}>
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-600">
            Methodology
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950">
            How we compute your persona
          </h1>
          <p className="max-w-2xl text-lg text-zinc-700">
            Vibe Coding Profile infers your Vibe Coding persona by spotting AI-assisted engineering patterns in the
            Git history of repos you connect.
          </p>
          <p className="max-w-2xl text-sm text-zinc-700">
            We do not use your prompts, IDE workflow, PR comments, or any private chats. We also do
            not read your code content. We only use Git/PR metadata that helps us infer patterns.
          </p>
        </header>

        <section className={`${wrappedTheme.card} space-y-4 p-6`}>
          <h2 className="text-lg font-semibold text-zinc-950">1) What we look at (and what we don’t)</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-700">
            <li>Commit metadata: timestamps, files changed, additions/deletions.</li>
            <li>Commit message subjects: lightweight patterns like feat/fix/test/docs.</li>
            <li>Changed file paths when available (to infer which subsystems changed together).</li>
            <li>PR metadata when available: changed-files counts, issue linking, checklists.</li>
          </ul>
          <p className="text-sm text-zinc-700">
            In Phase 0 (GitHub API), we analyze a time-distributed sample of commits per repo (up to
            300) to better reflect long-lived evolution without pulling the entire history.
          </p>
          <p className="text-sm text-zinc-700">
            We do not read code content or prompts. Any “AI-assisted” language here is an inference
            from Git/PR patterns, not proof.
          </p>
        </section>

        <section className={`${wrappedTheme.card} space-y-4 p-6`}>
          <h2 className="text-lg font-semibold text-zinc-950">2) The six axes (A–F)</h2>
          <p className="text-sm text-zinc-700">
            Each axis is a 0–100 score computed from simple, deterministic signals. Higher scores
            mean the pattern shows up more often in your history.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                id: "A",
                name: "Automation",
                description:
                  "Large, wide changes: high files-changed per commit, big commits, big PRs.",
              },
              {
                id: "B",
                name: "Guardrails",
                description:
                  "Safety signals: tests/docs/CI showing up early, plus checklists and hygiene commits.",
              },
              {
                id: "C",
                name: "Iteration",
                description:
                  "Fast feedback loops: fix-after-feature sequences, high fix ratio, fix-heavy sessions.",
              },
              {
                id: "D",
                name: "Planning",
                description:
                  "Up-front structure: conventional commits, issue-linked PRs, docs before features.",
              },
              {
                id: "E",
                name: "Surface Area",
                description:
                  "Breadth across subsystems: how many areas (ui/api/db/infra/tests/docs) change together.",
              },
              {
                id: "F",
                name: "Rhythm",
                description:
                  "Shipping cadence: burstiness and how big your typical work sessions look.",
              },
            ].map((axis) => (
              <div
                key={axis.id}
                className="rounded-2xl border border-black/5 bg-white/70 p-4 text-sm text-zinc-700"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-600">
                  {axis.id}
                </p>
                <p className="mt-1 font-semibold text-zinc-950">{axis.name}</p>
                <p className="mt-1 text-sm text-zinc-700">{axis.description}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-zinc-700">
            These axes are designed to reflect how AI-assisted engineering often shows up in Git: a
            bias toward bigger generated chunks (A), stronger test/checklist habits to stay safe (B),
            rapid fix cycles while iterating (C), structured progress signals (D), broader cross-area
            edits (E), and bursty “session” work patterns (F).
          </p>
        </section>

        <section className={`${wrappedTheme.card} space-y-4 p-6`}>
          <h2 className="text-lg font-semibold text-zinc-950">3) Persona selection</h2>
          <p className="text-sm text-zinc-700">
            Each persona is defined by a small set of thresholds on the axes (e.g., “A ≥ 70” and “D
            &lt; 45”). We select:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-700">
            <li>A strict match if a persona’s full rule set is satisfied.</li>
            <li>Otherwise, a nearest-fit match if you satisfy enough of a persona’s conditions.</li>
          </ul>
          <p className="text-sm text-zinc-700">
            The “Matched signals” list in your profile shows the exact thresholds that were used.
          </p>
        </section>

        <section className={`${wrappedTheme.card} space-y-4 p-6`}>
          <h2 className="text-lg font-semibold text-zinc-950">4) Score and confidence</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-700">
            <li>
              <span className="font-semibold text-zinc-950">Persona score</span> is a 0–100 match
              score derived from the axes involved in the persona’s rule.
            </li>
            <li>
              <span className="font-semibold text-zinc-950">Confidence</span> is a separate label
              based on coverage and data quality (more repos + more commits usually increases it).
            </li>
          </ul>
          <p className="text-sm text-zinc-700">
            Your profile is aggregated across repos using commit-weighted averaging, so repos with
            more commits influence your persona more.
          </p>
        </section>

        <section className={`${wrappedTheme.card} space-y-4 p-6`}>
          <h2 className="text-lg font-semibold text-zinc-950">5) Why it can be wrong</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-700">
            <li>GitHub only shows what’s pushed; local work and private repos may be missing.</li>
            <li>Some repos have incomplete metadata (e.g., missing file paths).</li>
            <li>
              Some insights are based on a representative sample of commits, so rare patterns may be
              missed in very large histories.
            </li>
            <li>
              We can’t see how you collaborate with an agent in your editor (prompts, iterations,
              copy/paste, refactors between commits), so we infer from what lands in Git.
            </li>
            <li>
              Different projects can pull you into different modes; aggregation may “average you
              out”.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
