import ReposClient from "./ReposClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { wrappedTheme } from "@/lib/theme";

export const runtime = "nodejs";

export default async function ReposPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("user_repos")
    .select("repo_id, repos(full_name)")
    .eq("user_id", user.id)
    .is("disconnected_at", null);

  const rows = (data ?? []) as unknown as Array<{
    repo_id: string;
    repos: { full_name: string } | null;
  }>;

  const initialConnected = rows
    .filter((r) => Boolean(r.repos?.full_name))
    .map((r) => ({ repo_id: r.repo_id, full_name: r.repos!.full_name }));

  return (
    <div className={`${wrappedTheme.container} py-10`}>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
        Repositories
        </h1>
        <p className="mt-2 text-sm text-zinc-700">
        Connect a repo, then start an analysis job.
        </p>
        <ReposClient initialConnected={initialConnected} />
      </div>
    </div>
  );
}
