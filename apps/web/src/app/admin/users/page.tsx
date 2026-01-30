import { redirect } from "next/navigation";
import Link from "next/link";
import { isCurrentUserAdmin } from "@/lib/admin";
import { wrappedTheme } from "@/lib/theme";
import { getAdminUsers } from "../actions";

export default async function AdminUsersPage({
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
  const limit = 25;
  const offset = (page - 1) * limit;

  const { users, total } = await getAdminUsers(limit, offset);
  const totalPages = Math.ceil(total / limit);

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
              Users
            </h1>
            <p className="mt-1 text-zinc-600">
              {total} total users
            </p>
          </div>
          <Link
            href="/admin/jobs"
            className={wrappedTheme.secondaryButton}
          >
            View All Jobs
          </Link>
        </div>

        <div className={`${wrappedTheme.card} overflow-hidden`}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/50 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Persona</th>
                <th className="px-4 py-3">Commits</th>
                <th className="px-4 py-3">Repos</th>
                <th className="px-4 py-3">Jobs</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element -- admin page, external avatar URL */
                        <img
                          src={user.avatar_url}
                          alt=""
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-600">
                          {user.github_username?.[0]?.toUpperCase() ?? "?"}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-zinc-900">
                          @{user.github_username ?? "unknown"}
                          {user.is_admin && (
                            <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-700">
                              Admin
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-zinc-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {user.profile ? (
                      <div>
                        <p className="text-sm font-medium text-zinc-900">
                          {user.profile.persona_name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {user.profile.persona_confidence} confidence
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-400">No profile</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">
                    {user.profile?.total_commits?.toLocaleString() ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">
                    {user.profile?.total_repos ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    {user.jobCounts ? (
                      <div className="flex items-center gap-1 text-xs">
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700">
                          {user.jobCounts.done} done
                        </span>
                        {user.jobCounts.queued > 0 && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700">
                            {user.jobCounts.queued} queued
                          </span>
                        )}
                        {user.jobCounts.failed > 0 && (
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700">
                            {user.jobCounts.failed} failed
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                  href={`/admin/users?page=${page - 1}`}
                  className={wrappedTheme.secondaryButton}
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/users?page=${page + 1}`}
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
