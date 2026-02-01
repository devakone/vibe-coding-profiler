import { redirect } from "next/navigation";
import Link from "next/link";
import { isCurrentUserAdmin } from "@/lib/admin";
import { wrappedTheme } from "@/lib/theme";
import { getAllJobs } from "../actions";

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    redirect("/");
  }

  const resolvedParams = (await searchParams) ?? {};
  const page = Number(resolvedParams.page) || 1;
  const status = typeof resolvedParams.status === "string" ? resolvedParams.status : undefined;
  const limit = 50;
  const offset = (page - 1) * limit;

  const { jobs, total } = await getAllJobs(limit, offset, status);
  const totalPages = Math.ceil(total / limit);

  const statusFilters = [
    { value: undefined, label: "All" },
    { value: "done", label: "Done" },
    { value: "queued", label: "Queued" },
    { value: "running", label: "Running" },
    { value: "failed", label: "Failed" },
  ];

  return (
    <div className={`${wrappedTheme.container} ${wrappedTheme.pageY}`}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/admin"
              className="text-sm text-zinc-600 hover:text-zinc-900"
            >
              ← Back to Admin
            </Link>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
              Analysis Jobs
            </h1>
            <p className="mt-1 text-zinc-600">
              {total} total jobs
            </p>
          </div>
          <Link
            href="/admin/users"
            className={wrappedTheme.secondaryButton}
          >
            View Users
          </Link>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2">
          {statusFilters.map((filter) => {
            const isActive = filter.value === status;
            const href = filter.value
              ? `/admin/jobs?status=${filter.value}`
              : "/admin/jobs";
            return (
              <Link
                key={filter.label}
                href={href}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>

        <div className={`${wrappedTheme.card} overflow-hidden`}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/50 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Repo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Commits</th>
                <th className="px-4 py-3">Profile</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-zinc-50/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${job.user_id}`}
                      className="font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      @{job.username ?? "unknown"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-900">
                    {job.repo_name ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">
                    {job.commit_count?.toLocaleString() ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    {job.profile_updated ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-700">
                        <span className="text-violet-500">✓</span>
                        {job.profile_persona ? (
                          <span title={job.profile_persona}>Updated</span>
                        ) : (
                          "Updated"
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">
                    {new Date(job.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">
                    {job.completed_at
                      ? new Date(job.completed_at).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {jobs.length === 0 && (
            <div className="p-8 text-center text-zinc-600">
              No jobs found
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-600">
              Showing {offset + 1} to {Math.min(offset + limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/jobs?page=${page - 1}${status ? `&status=${status}` : ""}`}
                  className={wrappedTheme.secondaryButton}
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/jobs?page=${page + 1}${status ? `&status=${status}` : ""}`}
                  className={wrappedTheme.secondaryButton}
                >
                  Next
                </Link>
              )}
            </div>
          </div>
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
