import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { wrappedTheme } from "@/lib/theme";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { UsernameEditor } from "@/components/settings/UsernameEditor";
import { PublicProfileSettingsPanel } from "@/components/settings/PublicProfileSettings";
import Link from "next/link";

export const metadata = {
  title: "Public Profile · Settings · Vibe Coding Profiler",
  description: "Manage your public profile and privacy settings",
};

export default async function PublicProfilePage() {
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
            <Link href="/settings/repos" className="hover:text-zinc-900">
              Settings
            </Link>
            <span>/</span>
            <span className="text-zinc-900">Public Profile</span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            Public Profile
          </h1>
          <p className="mt-2 text-zinc-600">
            Control what&apos;s visible on your public profile page.
          </p>
        </div>

        {/* Settings Tabs */}
        <SettingsTabs activeTab="public-profile" />

        {/* Username */}
        <div className={`${wrappedTheme.card} p-6`}>
          <h2 className="text-lg font-semibold text-zinc-900">Username</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Your username determines your public profile URL.
          </p>
          <div className="mt-4">
            <UsernameEditor />
          </div>
        </div>

        {/* Privacy Settings */}
        <div className={`${wrappedTheme.card} p-6`}>
          <h2 className="text-lg font-semibold text-zinc-900">Privacy Settings</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Choose what information is visible on your public profile.
          </p>
          <div className="mt-4">
            <PublicProfileSettingsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
