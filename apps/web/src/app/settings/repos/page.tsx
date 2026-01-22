import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { wrappedTheme } from "@/lib/theme";
import RepoSettingsClient from "./RepoSettingsClient";

export const runtime = "nodejs";

export const metadata = {
  title: "Repos · Settings · Vibe Coding Profile",
  description: "Manage your connected GitHub repositories",
};

export default async function RepoSettingsPage() {
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
    <div className={`${wrappedTheme.container} ${wrappedTheme.pageY}`}>
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <Link href="/settings/llm-keys" className="hover:text-zinc-900">
              Settings
            </Link>
            <span>/</span>
            <span className="text-zinc-900">Repos</span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            Connected Repos
          </h1>
          <p className="mt-2 text-zinc-600">
            Manage the GitHub repositories connected to your Vibe Coding Profile.
          </p>
        </div>

        {/* Settings Tabs */}
        <div className="flex gap-1 rounded-xl bg-zinc-100 p-1">
          <Link
            href="/settings/llm-keys"
            className="flex-1 rounded-lg px-4 py-2 text-center text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
          >
            LLM Keys
          </Link>
          <span className="flex-1 rounded-lg bg-white px-4 py-2 text-center text-sm font-medium text-zinc-900 shadow-sm">
            Repos
          </span>
        </div>

        {/* Main Content */}
        <RepoSettingsClient userId={user.id} initialConnected={initialConnected} />
      </div>
    </div>
  );
}
