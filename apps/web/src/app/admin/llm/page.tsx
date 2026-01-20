import { redirect } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/admin";
import { wrappedTheme } from "@/lib/theme";
import LLMConfigClient from "./LLMConfigClient";

export default async function AdminLlmPage() {
  const isAdmin = await isCurrentUserAdmin();

  if (!isAdmin) {
    redirect("/");
  }

  return (
    <div className={`${wrappedTheme.container} ${wrappedTheme.pageY}`}>
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-600">
            Admin
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950">
            LLM Configuration
          </h1>
          <p className="max-w-2xl text-lg text-zinc-700">
            Set the platform LLM defaults and monitor usage.
          </p>
        </header>

        <LLMConfigClient />
      </div>
    </div>
  );
}
