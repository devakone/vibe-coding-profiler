import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { wrappedTheme } from "@/lib/theme";
import { PlatformConnections } from "@/components/settings/PlatformConnections";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import Link from "next/link";

export const metadata = {
  title: "Platforms · Settings · Vibe Coding Profiler",
  description: "Manage your connected code hosting platforms",
};

export default async function PlatformsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
            <span className="text-zinc-900">Platforms</span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            Connected Platforms
          </h1>
          <p className="mt-2 text-zinc-600">
            Manage your connections to GitHub, GitLab, and Bitbucket.
          </p>
        </div>

        {/* Settings Tabs */}
        <SettingsTabs activeTab="platforms" />

        {/* Main Content */}
        <div className={`${wrappedTheme.card} p-6`}>
          <PlatformConnections />
        </div>
      </div>
    </div>
  );
}
