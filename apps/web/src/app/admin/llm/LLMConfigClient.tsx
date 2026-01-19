"use client";

import { useEffect, useMemo, useState } from "react";
import { wrappedTheme } from "@/lib/theme";

type ProviderOption = {
  id: string;
  name: string;
  keyUrl: string;
  defaultModel: string;
};

type LLMConfig = {
  provider: string;
  model: string;
  maskedKey: string;
  hasKey: boolean;
  perRepoLimit: number;
  llmDisabled: boolean;
  updatedAt: string | null;
};

type UsageSummary = {
  totals: { calls: number; inputTokens: number; outputTokens: number };
  bySource: Record<string, number>;
  windowDays: number;
};

export default function LLMConfigClient() {
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [form, setForm] = useState({
    provider: "anthropic",
    model: "",
    apiKey: "",
    perRepoLimit: 1,
    llmDisabled: false,
  });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedProvider = useMemo(
    () => providers.find((p) => p.id === form.provider),
    [providers, form.provider]
  );

  async function loadConfig() {
    setError(null);
    const res = await fetch("/api/admin/llm-config");
    const data = (await res.json()) as { config?: LLMConfig; providers?: ProviderOption[]; error?: string };
    if (!res.ok || !data.config) {
      setError(data.error || "Failed to load LLM config");
      return;
    }
    setConfig(data.config);
    setProviders(data.providers ?? []);
    setForm({
      provider: data.config.provider,
      model: data.config.model,
      apiKey: "",
      perRepoLimit: data.config.perRepoLimit,
      llmDisabled: data.config.llmDisabled,
    });
  }

  async function loadUsage() {
    const res = await fetch("/api/admin/llm-usage");
    const data = (await res.json()) as UsageSummary & { error?: string };
    if (!res.ok) {
      setError(data.error || "Failed to load usage");
      return;
    }
    setUsage(data);
  }

  useEffect(() => {
    void loadConfig();
    void loadUsage();
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/llm-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { config?: LLMConfig; error?: string };
      if (!res.ok || !data.config) {
        setError(data.error || "Failed to save");
        return;
      }
      setConfig(data.config);
      setForm((prev) => ({ ...prev, apiKey: "" }));
      setStatus("Saved");
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className={`${wrappedTheme.card} p-6`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950">Platform default</h2>
            <p className="text-sm text-zinc-600">
              Configure the platform key and provider used for AI narratives.
            </p>
          </div>
          {config?.updatedAt ? (
            <p className="text-xs text-zinc-500">
              Updated {new Date(config.updatedAt).toLocaleDateString()}
            </p>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm text-zinc-700">
            Provider
            <select
              className="w-full rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-sm"
              value={form.provider}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  provider: e.target.value,
                  model: selectedProvider?.defaultModel ?? prev.model,
                }))
              }
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-zinc-700">
            Model
            <input
              className="w-full rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-sm"
              value={form.model}
              onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
              placeholder={selectedProvider?.defaultModel ?? "Model"}
            />
          </label>
          <label className="space-y-2 text-sm text-zinc-700">
            API Key
            <input
              className="w-full rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-sm"
              value={form.apiKey}
              onChange={(e) => setForm((prev) => ({ ...prev, apiKey: e.target.value }))}
              placeholder={config?.maskedKey || "Paste a new key to rotate"}
              type="password"
            />
            {selectedProvider?.keyUrl ? (
              <span className="block text-xs text-zinc-500">
                Get a key at {selectedProvider.keyUrl}
              </span>
            ) : null}
          </label>
          <label className="space-y-2 text-sm text-zinc-700">
            AI narratives per repo
            <input
              className="w-full rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-sm"
              type="number"
              min={0}
              value={form.perRepoLimit}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, perRepoLimit: Number(e.target.value) }))
              }
            />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={form.llmDisabled}
              onChange={(e) => setForm((prev) => ({ ...prev, llmDisabled: e.target.checked }))}
            />
            Disable LLM narratives (metrics-only mode)
          </label>
          <div className="flex items-center gap-3">
            {status ? <span className="text-xs text-emerald-600">{status}</span> : null}
            {error ? <span className="text-xs text-red-600">{error}</span> : null}
            <button
              type="button"
              className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </section>

      {usage ? (
        <section className={`${wrappedTheme.card} p-6`}>
          <h2 className="text-lg font-semibold text-zinc-950">Usage (last {usage.windowDays} days)</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Total calls: {usage.totals.calls} · Input tokens: {usage.totals.inputTokens} · Output tokens: {usage.totals.outputTokens}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {Object.entries(usage.bySource).map(([source, count]) => (
              <div key={source} className="rounded-xl border border-black/5 bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  {source}
                </p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950">{count}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
