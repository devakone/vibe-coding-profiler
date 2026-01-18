import { redirect } from "next/navigation";
import Link from "next/link";
import { isCurrentUserAdmin } from "@/lib/admin";
import { wrappedTheme } from "@/lib/theme";
import { getPlatformLLMConfigFull } from "@/lib/llm-config";
import { PROVIDER_INFO, LLM_PROVIDERS, type LLMProvider } from "@vibed/core";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

interface LLMUsageStats {
  total: number;
  byProvider: Record<LLMProvider, number>;
  bySource: {
    platform: number;
    user: number;
    sponsor: number;
  };
  successRate: number;
}

async function getLLMUsageStats(): Promise<LLMUsageStats | null> {
  try {
    const service = createSupabaseServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const llmUsage = (service as any).from("llm_usage");

    // Get all usage records
    const { data, error } = await llmUsage.select("provider, key_source, success");

    if (error) {
      console.error("Error fetching LLM usage:", error);
      return null;
    }

    const records = (data ?? []) as Array<{
      provider: LLMProvider;
      key_source: string;
      success: boolean;
    }>;

    const byProvider: Record<LLMProvider, number> = {
      anthropic: 0,
      openai: 0,
      gemini: 0,
    };

    const bySource = {
      platform: 0,
      user: 0,
      sponsor: 0,
    };

    let successCount = 0;

    for (const record of records) {
      if (record.provider in byProvider) {
        byProvider[record.provider]++;
      }

      if (record.key_source === "platform") bySource.platform++;
      else if (record.key_source === "user") bySource.user++;
      else if (record.key_source === "sponsor") bySource.sponsor++;

      if (record.success) successCount++;
    }

    return {
      total: records.length,
      byProvider,
      bySource,
      successRate: records.length > 0 ? (successCount / records.length) * 100 : 0,
    };
  } catch {
    return null;
  }
}

export default async function AdminLLMStatusPage() {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    redirect("/");
  }

  const platformConfigFull = await getPlatformLLMConfigFull();
  const platformConfig = platformConfigFull.config;
  const stats = await getLLMUsageStats();

  // Check which providers are configured (database takes precedence, then env vars)
  const providerStatus = LLM_PROVIDERS.map((provider) => {
    const envKey = `${provider.toUpperCase()}_API_KEY`;
    const hasEnvKey = Boolean(
      provider === "anthropic" ? process.env.ANTHROPIC_API_KEY :
      provider === "openai" ? process.env.OPENAI_API_KEY :
      provider === "gemini" ? process.env.GEMINI_API_KEY : null
    );
    const isDbConfigured = platformConfig?.provider === provider;

    return {
      provider,
      name: PROVIDER_INFO[provider].name,
      isConfigured: isDbConfigured || hasEnvKey,
      isDbConfigured,
      envKey,
      isPrimary: platformConfig?.provider === provider,
    };
  });

  return (
    <div className={`${wrappedTheme.container} ${wrappedTheme.pageY}`}>
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <Link href="/admin" className="text-sm text-zinc-600 hover:text-zinc-900">
            ← Back to Admin
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            LLM Configuration Status
          </h1>
          <p className="mt-2 text-zinc-600">
            View platform LLM configuration and usage statistics.
          </p>
        </div>

        {/* Platform Configuration */}
        <section className={`${wrappedTheme.card} p-6`}>
          <h2 className="text-lg font-semibold text-zinc-950">Platform Configuration</h2>
          <p className="mt-1 text-sm text-zinc-600">
            LLM providers configured via database or environment variables
          </p>

          {/* Platform Settings from Database */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-white/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600">Free Tier Limit</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-950">{platformConfigFull.freeTierLimit}</p>
              <p className="text-xs text-zinc-500">per repo per user</p>
            </div>
            <div className="rounded-xl bg-white/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600">Profile LLM Limit</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-950">{platformConfigFull.profileLlmRepoLimit}</p>
              <p className="text-xs text-zinc-500">repos for LLM profile</p>
            </div>
            <div className="rounded-xl bg-white/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600">LLM Status</p>
              <p className={`mt-1 text-2xl font-semibold ${platformConfigFull.llmDisabled ? "text-amber-600" : "text-green-600"}`}>
                {platformConfigFull.llmDisabled ? "Disabled" : "Enabled"}
              </p>
            </div>
            <div className="rounded-xl bg-white/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600">Config Source</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-950">
                {platformConfig ? "Database" : "Env Vars"}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {providerStatus.map((status) => (
              <div
                key={status.provider}
                className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                  status.isConfigured ? "bg-green-50" : "bg-zinc-50"
                }`}
              >
                <div>
                  <span className="font-medium text-zinc-900">{status.name}</span>
                  {status.isPrimary && (
                    <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      Primary
                    </span>
                  )}
                  {status.isDbConfigured && (
                    <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Database
                    </span>
                  )}
                  <p className="text-xs text-zinc-500">{status.envKey}</p>
                </div>
                <span
                  className={`text-sm font-medium ${
                    status.isConfigured ? "text-green-700" : "text-zinc-400"
                  }`}
                >
                  {status.isConfigured ? "Configured" : "Not Set"}
                </span>
              </div>
            ))}
          </div>

          {!platformConfig && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              No LLM provider is configured. Go to{" "}
              <Link href="/admin/llm" className="underline">Admin → LLM Settings</Link>{" "}
              to configure platform keys, or set environment variables as a fallback.
            </div>
          )}
        </section>

        {/* Usage Statistics */}
        {stats && (
          <section className={`${wrappedTheme.card} p-6`}>
            <h2 className="text-lg font-semibold text-zinc-950">Usage Statistics</h2>
            <p className="mt-1 text-sm text-zinc-600">LLM API usage across the platform</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total Calls" value={stats.total} />
              <StatCard label="Success Rate" value={`${stats.successRate.toFixed(1)}%`} />
              <StatCard label="Platform Key" value={stats.bySource.platform} />
              <StatCard label="User Keys" value={stats.bySource.user} />
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-medium text-zinc-700">Usage by Provider</h3>
              <div className="mt-2 space-y-2">
                {LLM_PROVIDERS.map((provider) => {
                  const count = stats.byProvider[provider];
                  const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  return (
                    <div key={provider} className="flex items-center gap-3">
                      <span className="w-20 text-sm text-zinc-600">
                        {PROVIDER_INFO[provider].name}
                      </span>
                      <div className="flex-1">
                        <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full bg-gradient-to-r from-fuchsia-500 to-indigo-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="w-16 text-right text-sm font-medium text-zinc-900">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Encryption Status */}
        <section className={`${wrappedTheme.card} p-6`}>
          <h2 className="text-lg font-semibold text-zinc-950">Security Configuration</h2>
          <p className="mt-1 text-sm text-zinc-600">Encryption settings for user API keys</p>

          <div className="mt-4 space-y-3">
            <div
              className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                process.env.LLM_KEY_ENCRYPTION_SECRET ? "bg-green-50" : "bg-amber-50"
              }`}
            >
              <div>
                <span className="font-medium text-zinc-900">User Key Encryption</span>
                <p className="text-xs text-zinc-500">LLM_KEY_ENCRYPTION_SECRET</p>
              </div>
              <span
                className={`text-sm font-medium ${
                  process.env.LLM_KEY_ENCRYPTION_SECRET ? "text-green-700" : "text-amber-600"
                }`}
              >
                {process.env.LLM_KEY_ENCRYPTION_SECRET ? "Enabled" : "Not Configured"}
              </span>
            </div>
          </div>

          {!process.env.LLM_KEY_ENCRYPTION_SECRET && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              User API key storage is disabled. Set LLM_KEY_ENCRYPTION_SECRET to enable users to
              store their own API keys securely.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-white/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-950">{value}</p>
    </div>
  );
}
