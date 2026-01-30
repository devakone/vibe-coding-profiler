import Link from "next/link";

type TabName = "llm-keys" | "platforms" | "repos" | "public-profile";

export function SettingsTabs({ activeTab }: { activeTab: TabName }) {
  return (
    <div className="flex gap-1 rounded-xl bg-zinc-100 p-1">
      <Tab href="/settings/repos" label="Repos" isActive={activeTab === "repos"} />
      <Tab href="/settings/platforms" label="Platforms" isActive={activeTab === "platforms"} />
      <Tab href="/settings/llm-keys" label="LLM Keys" isActive={activeTab === "llm-keys"} />
      <Tab href="/settings/public-profile" label="Public Profile" isActive={activeTab === "public-profile"} />
    </div>
  );
}

function Tab({ href, label, isActive }: { href: string; label: string; isActive: boolean }) {
  if (isActive) {
    return (
      <span className="flex-1 rounded-lg bg-white px-4 py-2 text-center text-sm font-medium text-zinc-900 shadow-sm">
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="flex-1 rounded-lg px-4 py-2 text-center text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
    >
      {label}
    </Link>
  );
}
