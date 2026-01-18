import { redirect } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/admin";
import { wrappedTheme } from "@/lib/theme";
import { getAdminStats, getCoverageReports } from "./actions";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const isAdmin = await isCurrentUserAdmin();

  if (!isAdmin) {
    redirect("/");
  }

  const [stats, reportsResult] = await Promise.all([
    getAdminStats(),
    getCoverageReports(10),
  ]);

  return (
    <div className={`${wrappedTheme.container} ${wrappedTheme.pageY}`}>
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-600">
            Admin Dashboard
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950">
            Persona Diagnostics
          </h1>
          <p className="max-w-2xl text-lg text-zinc-700">
            Monitor persona rule coverage and identify patterns that need new rules.
          </p>
        </header>

        {stats && (
          <section className="grid gap-4 md:grid-cols-4">
            <StatCard label="Total Users" value={stats.totalUsers} />
            <StatCard label="Users with Profiles" value={stats.usersWithProfiles} />
            <StatCard label="Completed Jobs" value={stats.completedJobs} />
            <StatCard label="Coverage Reports" value={stats.coverageReports} />
          </section>
        )}

        {stats && Object.keys(stats.personaDistribution).length > 0 && (
          <section className={`${wrappedTheme.card} p-6`}>
            <h2 className="text-lg font-semibold text-zinc-950">Persona Distribution</h2>
            <p className="mt-1 text-sm text-zinc-600">Current user persona breakdown</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(stats.personaDistribution)
                .sort((a, b) => b[1] - a[1])
                .map(([personaId, count]) => (
                  <div
                    key={personaId}
                    className="flex items-center justify-between rounded-xl bg-white/50 px-4 py-3"
                  >
                    <span className="text-sm font-medium text-zinc-700">
                      {formatPersonaId(personaId)}
                    </span>
                    <span className="text-sm font-semibold text-zinc-950">{count}</span>
                  </div>
                ))}
            </div>
          </section>
        )}

        <AdminClient initialReports={reportsResult.reports} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className={`${wrappedTheme.card} p-5`}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-zinc-950">{value}</p>
    </div>
  );
}

function formatPersonaId(id: string): string {
  return id
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
