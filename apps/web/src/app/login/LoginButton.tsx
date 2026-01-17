"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useState } from "react";

export default function LoginButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function computeRedirectTo(): string {
    const baseUrl = window.location.origin.replace(/\/$/, "");
    const url = new URL(baseUrl);
    return `${url.origin}/auth/callback`;
  }

  async function signIn() {
    setIsLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const redirectTo = computeRedirectTo();

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo },
    });

    if (signInError) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const extra = [
        typeof (signInError as unknown as { status?: unknown }).status === "number"
          ? `status ${(signInError as unknown as { status: number }).status}`
          : null,
        typeof (signInError as unknown as { code?: unknown }).code === "string"
          ? (signInError as unknown as { code: string }).code
          : null,
      ]
        .filter(Boolean)
        .join(" · ");

      const baseMessage = extra ? `${signInError.message} (${extra})` : signInError.message;

      const hints: string[] = [];

      if (supabaseUrl?.includes("supabase.co") && redirectTo.includes("localhost")) {
        hints.push(
          "Your Supabase URL looks hosted, but redirectTo is localhost. Use local Supabase keys, or allowlist this redirect URL in Supabase."
        );
      }

      if (!supabaseUrl) {
        hints.push("Missing NEXT_PUBLIC_SUPABASE_URL in env.");
      }

      hints.push(`redirectTo: ${redirectTo}`);
      if (supabaseUrl) hints.push(`supabaseUrl: ${supabaseUrl}`);

      setError([baseMessage, ...hints].join("\n"));
    }
    setIsLoading(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
        onClick={signIn}
        disabled={isLoading}
      >
        {isLoading ? "Signing in..." : "Sign in with GitHub"}
      </button>
      {error ? <p className="whitespace-pre-wrap text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
