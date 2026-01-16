import ReposClient from "./ReposClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-white">
        Repositories
      </h1>
      <p className="mt-2 text-sm text-zinc-300">
        Connect a repo, then start an analysis job.
      </p>
      <ReposClient initialConnected={initialConnected} />
    </div>
  );
}
