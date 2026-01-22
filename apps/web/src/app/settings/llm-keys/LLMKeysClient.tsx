"use client";

import { useState, useEffect } from "react";
import { wrappedTheme } from "@/lib/theme";

interface LLMKey {
  id: string;
  provider: string;
  providerName: string;
  label: string | null;
  maskedKey: string;
  model: string | null;
  isActive: boolean;
  createdAt: string;
}

interface SupportedProvider {
  id: string;
  name: string;
  keyUrl: string;
}

interface LLMKeysResponse {
  keys: LLMKey[];
  platformLimits?: {
    perRepoLimit: number;
    description: string;
  };
  supportedProviders: SupportedProvider[];
}

export default function LLMKeysClient() {
  const [keys, setKeys] = useState<LLMKey[]>([]);
  const [providers, setProviders] = useState<SupportedProvider[]>([]);
  const [platformLimits, setPlatformLimits] = useState<LLMKeysResponse["platformLimits"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // LLM opt-in state
  const [llmOptIn, setLlmOptIn] = useState(false);
  const [optInLoading, setOptInLoading] = useState(true);
  const [optInUpdating, setOptInUpdating] = useState(false);

  // Add key form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addProvider, setAddProvider] = useState<string>("");
  const [addApiKey, setAddApiKey] = useState("");
  const [addLabel, setAddLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Delete/test state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; valid: boolean; error?: string } | null>(null);

  useEffect(() => {
    fetchKeys();
    fetchOptInStatus();
  }, []);

  async function fetchOptInStatus() {
    setOptInLoading(true);
    try {
      const res = await fetch("/api/settings/llm-opt-in");
      if (res.ok) {
        const data = await res.json();
        setLlmOptIn(data.optedIn);
      }
    } catch {
      // Ignore - default to false
    } finally {
      setOptInLoading(false);
    }
  }

  async function handleOptInToggle() {
    const newValue = !llmOptIn;
    setOptInUpdating(true);
    try {
      const res = await fetch("/api/settings/llm-opt-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optIn: newValue }),
      });
      if (res.ok) {
        setLlmOptIn(newValue);
      }
    } catch {
      // Revert on error
    } finally {
      setOptInUpdating(false);
    }
  }

  async function fetchKeys() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/llm-keys");
      if (!res.ok) {
        throw new Error("Failed to fetch keys");
      }
      const data: LLMKeysResponse = await res.json();
      setKeys(data.keys);
      setProviders(data.supportedProviders);
      setPlatformLimits(data.platformLimits);
      if (data.supportedProviders.length > 0 && !addProvider) {
        setAddProvider(data.supportedProviders[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddKey(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError(null);

    try {
      const res = await fetch("/api/settings/llm-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: addProvider,
          apiKey: addApiKey,
          label: addLabel || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to add key");
      }

      // Success - refresh keys and reset form
      await fetchKeys();
      setShowAddForm(false);
      setAddApiKey("");
      setAddLabel("");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this API key? You can add it again later.")) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/settings/llm-keys/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete key");
      }
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleTest(id: string) {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await fetch(`/api/settings/llm-keys/${id}/test`, {
        method: "POST",
      });
      const data = await res.json();
      setTestResult({ id, valid: data.valid, error: data.error });
    } catch {
      setTestResult({ id, valid: false, error: "Failed to test key" });
    } finally {
      setTestingId(null);
    }
  }

  const selectedProvider = providers.find((p) => p.id === addProvider);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* LLM Opt-in Toggle */}
      <div className="rounded-2xl border border-black/5 bg-gradient-to-br from-violet-50/50 via-indigo-50/30 to-violet-50/50 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-base font-semibold text-zinc-900">
              AI-Generated Narratives
            </h3>
            <p className="mt-1 text-sm text-zinc-600">
              Enable LLM-powered narratives about your development process — commit rhythm, iteration style, and how you approach building software.
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              When enabled, your commit messages and metadata are processed by an LLM.
              We focus on <em>how</em> you build (patterns, process, rhythm), not <em>what</em> you build (product details).
            </p>
          </div>
          <button
            onClick={handleOptInToggle}
            disabled={optInLoading || optInUpdating}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 ${
              llmOptIn ? "bg-indigo-600" : "bg-zinc-200"
            }`}
            role="switch"
            aria-checked={llmOptIn}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                llmOptIn ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              llmOptIn
                ? "bg-green-100 text-green-800"
                : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {optInLoading ? "Loading..." : llmOptIn ? "Enabled" : "Disabled"}
          </span>
          {!llmOptIn && !optInLoading && (
            <span className="text-xs text-zinc-500">
              Your analyses will use metrics-only narratives
            </span>
          )}
        </div>
      </div>


      {/* Existing keys */}
      {keys.length > 0 && (
        <div className="space-y-3">
          {keys.map((key) => (
            <div
              key={key.id}
              className={`${wrappedTheme.cardInner} p-4`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900">{key.providerName}</span>
                    {key.label && (
                      <span className="text-sm text-zinc-500">· {key.label}</span>
                    )}
                  </div>
                  <div className="mt-1 font-mono text-sm text-zinc-600">
                    {key.maskedKey}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    Added {new Date(key.createdAt).toLocaleDateString()}
                  </div>
                  {testResult?.id === key.id && (
                    <div
                      className={`mt-2 text-sm ${testResult.valid ? "text-green-600" : "text-red-600"}`}
                    >
                      {testResult.valid ? "✓ Key is valid" : `✗ ${testResult.error || "Key is invalid"}`}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTest(key.id)}
                    disabled={testingId === key.id}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {testingId === key.id ? "Testing..." : "Test"}
                  </button>
                  <button
                    onClick={() => handleDelete(key.id)}
                    disabled={deletingId === key.id}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === key.id ? "Removing..." : "Remove"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add key button/form */}
      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          className={wrappedTheme.primaryButton}
        >
          + Add API Key
        </button>
      ) : (
        <form onSubmit={handleAddKey} className={`${wrappedTheme.cardInner} space-y-4 p-4`}>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Provider</label>
            <select
              value={addProvider}
              onChange={(e) => setAddProvider(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {selectedProvider && (
              <a
                href={selectedProvider.keyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-sm text-indigo-600 hover:underline"
              >
                Get your key at {selectedProvider.name} →
              </a>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">API Key</label>
            <input
              type="password"
              value={addApiKey}
              onChange={(e) => setAddApiKey(e.target.value)}
              placeholder="sk-..."
              required
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Label <span className="text-zinc-400">(optional)</span>
            </label>
            <input
              type="text"
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
              placeholder="My API Key"
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {addError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {addError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={adding || !addApiKey.trim()}
              className={`${wrappedTheme.primaryButton} disabled:opacity-50`}
            >
              {adding ? "Adding..." : "Test & Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setAddError(null);
                setAddApiKey("");
                setAddLabel("");
              }}
              className={wrappedTheme.secondaryButton}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Supported providers info */}
      <div className="pt-4 text-sm text-zinc-500">
        Supported providers: {providers.map((p) => p.name).join(", ")}
      </div>
    </div>
  );
}
