import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isCurrentUserAdmin } from "@/lib/admin";
import { wrappedTheme } from "@/lib/theme";
import { getAdminUserDetail } from "../../actions";

const axisMeta: Record<string, { name: string; letter: string }> = {
  automation_heaviness: { name: "Automation", letter: "A" },
  guardrail_strength: { name: "Guardrails", letter: "B" },
  iteration_loop_intensity: { name: "Iteration", letter: "C" },
  planning_signal: { name: "Planning", letter: "D" },
  surface_area_per_change: { name: "Surface Area", letter: "E" },
  shipping_rhythm: { name: "Rhythm", letter: "F" },
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    redirect("/");
  }

  const { userId } = await params;
  const { success, user } = await getAdminUserDetail(userId);

  if (!success || !user) {
    notFound();
  }

  return (
    <div className={`${wrappedTheme.container} ${wrappedTheme.pageY}`}>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div>
          <Link
            href="/admin/users"
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            ← Back to Users
          </Link>
          <div className="mt-4 flex items-center gap-4">
            {user.avatar_url ? (
              /* eslint-disable-next-line @next/next/no-img-element -- admin page, external avatar URL */
              <img
                src={user.avatar_url}
                alt=""
                className="h-16 w-16 rounded-full"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200 text-xl font-medium text-zinc-600">
                {user.github_username?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-semibold text-zinc-950">
                @{user.github_username ?? "unknown"}
                {user.is_admin && (
                  <span className="ml-3 rounded bg-indigo-100 px-2 py-1 text-sm font-medium text-indigo-700">
                    Admin
                  </span>
                )}
              </h1>
              <p className="text-zinc-600">{user.email}</p>
              <p className="text-sm text-zinc-500">
                Joined {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Summary */}
        {user.profile ? (
          <section className={`${wrappedTheme.card} p-6`}>
            <h2 className="text-lg font-semibold text-zinc-950">Profile</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-sm text-zinc-600">Persona</p>
                <p className="text-lg font-semibold text-zinc-950">
                  {user.profile.persona_name}
                </p>
                <p className="text-sm text-zinc-500">
                  {user.profile.persona_confidence} confidence
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-600">Total Commits</p>
                <p className="text-lg font-semibold text-zinc-950">
                  {user.profile.total_commits.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-600">Total Repos</p>
                <p className="text-lg font-semibold text-zinc-950">
                  {user.profile.total_repos}
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-600">Last Updated</p>
                <p className="text-sm text-zinc-950">
                  {user.profile.updated_at
                    ? new Date(user.profile.updated_at).toLocaleString()
                    : "Never"}
                </p>
              </div>
            </div>

            {/* Axes */}
            {user.profileAxes && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-zinc-700">Axes</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {Object.entries(axisMeta).map(([key, meta]) => {
                    const axis = user.profileAxes?.[key];
                    return (
                      <div
                        key={key}
                        className="rounded-lg bg-white/50 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-zinc-700">
                            {meta.name} ({meta.letter})
                          </span>
                          <span className="text-lg font-semibold text-zinc-950">
                            {axis?.score ?? "-"}
                          </span>
                        </div>
                        <div className="mt-2 h-2 w-full rounded-full bg-zinc-200">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                            style={{ width: `${axis?.score ?? 0}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        ) : (
          <section className={`${wrappedTheme.card} p-6`}>
            <p className="text-zinc-600">No profile data yet</p>
          </section>
        )}

        {/* Connected Repos */}
        <section className={`${wrappedTheme.card} p-6`}>
          <h2 className="text-lg font-semibold text-zinc-950">
            Connected Repos ({user.repos.length})
          </h2>
          {user.repos.length > 0 ? (
            <div className="mt-4 divide-y divide-zinc-100">
              {user.repos.map((repo) => (
                <div
                  key={repo.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="font-medium text-zinc-900">{repo.full_name}</p>
                    <p className="text-sm text-zinc-500">
                      Connected {new Date(repo.connected_at).toLocaleDateString()}
                    </p>
                  </div>
                  {repo.disconnected_at && (
                    <span className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600">
                      Disconnected
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-zinc-600">No repos connected</p>
          )}
        </section>

        {/* Analysis Jobs */}
        <section className={`${wrappedTheme.card} p-6`}>
          <h2 className="text-lg font-semibold text-zinc-950">
            Analysis Jobs ({user.jobs.length})
          </h2>
          {user.jobs.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                    <th className="pb-2 pr-4">Repo</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Commits</th>
                    <th className="pb-2 pr-4">Created</th>
                    <th className="pb-2 pr-4">Completed</th>
                    <th className="pb-2">Persona</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {user.jobs.map((job) => {
                    const insight = user.vibeInsights.find(
                      (v) => v.job_id === job.id
                    );
                    return (
                      <tr key={job.id}>
                        <td className="py-3 pr-4 text-sm text-zinc-900">
                          {job.repo_name ?? "-"}
                        </td>
                        <td className="py-3 pr-4">
                          <StatusBadge status={job.status} />
                        </td>
                        <td className="py-3 pr-4 text-sm text-zinc-600">
                          {job.commit_count?.toLocaleString() ?? "-"}
                        </td>
                        <td className="py-3 pr-4 text-sm text-zinc-600">
                          {new Date(job.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 pr-4 text-sm text-zinc-600">
                          {job.completed_at
                            ? new Date(job.completed_at).toLocaleString()
                            : "-"}
                        </td>
                        <td className="py-3 text-sm">
                          {insight ? (
                            <span className="font-medium text-zinc-900">
                              {insight.persona_name}
                            </span>
                          ) : (
                            <span className="text-zinc-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-zinc-600">No analysis jobs</p>
          )}
        </section>

        {/* Vibe Insights */}
        {user.vibeInsights.length > 0 && (
          <section className={`${wrappedTheme.card} p-6`}>
            <h2 className="text-lg font-semibold text-zinc-950">
              Vibe Insights ({user.vibeInsights.length})
            </h2>
            <div className="mt-4 space-y-4">
              {user.vibeInsights.map((insight) => {
                const job = user.jobs.find((j) => j.id === insight.job_id);
                return (
                  <div
                    key={insight.job_id}
                    className="rounded-lg bg-white/50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-zinc-900">
                          {insight.persona_name}
                        </p>
                        <p className="text-sm text-zinc-500">
                          {job?.repo_name ?? "Unknown repo"} •{" "}
                          {insight.persona_confidence} confidence
                        </p>
                      </div>
                    </div>
                    {insight.axes && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(axisMeta).map(([key, meta]) => {
                          const score = insight.axes?.[key]?.score;
                          return (
                            <span
                              key={key}
                              className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-700"
                            >
                              {meta.letter}={score ?? "-"}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    done: "bg-emerald-100 text-emerald-700",
    queued: "bg-amber-100 text-amber-700",
    running: "bg-indigo-100 text-indigo-700",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`rounded px-2 py-1 text-xs font-medium ${styles[status] ?? "bg-zinc-100 text-zinc-700"}`}
    >
      {status}
    </span>
  );
}
