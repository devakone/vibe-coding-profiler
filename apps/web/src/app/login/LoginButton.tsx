"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useState } from "react";

export default function LoginButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setIsLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo },
    });

    if (signInError) setError(signInError.message);
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
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

