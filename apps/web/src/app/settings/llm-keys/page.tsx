import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { wrappedTheme } from "@/lib/theme";
import LLMKeysClient from "./LLMKeysClient";

import { SettingsTabs } from "@/components/settings/SettingsTabs";

export const metadata = {
  title: "LLM API Keys · Settings · Vibe Coding Profiler",
  description: "Manage your LLM API keys for AI-powered narrative generation",
};

export default async function LLMKeysPage() {
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
            <span className="text-zinc-900">Settings</span>
            <span>/</span>
            <span>LLM Keys</span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            LLM API Keys
          </h1>
          <p className="mt-2 text-zinc-600">
            Add your own API key to unlock unlimited AI-generated narratives.
            Your key is encrypted and never shared.
          </p>
        </div>

        {/* Settings Tabs */}
        <SettingsTabs activeTab="llm-keys" />

        {/* Main content */}
        <div className={`${wrappedTheme.card} p-6`}>
          <LLMKeysClient />
        </div>

        {/* Security info */}
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
          <strong className="text-zinc-700">Security:</strong> Your API keys are
          encrypted using AES-256-GCM before storage. Keys are decrypted
          server-side only when needed for API calls and are never exposed to
          the browser.
        </div>
      </div>
    </div>
  );
}
