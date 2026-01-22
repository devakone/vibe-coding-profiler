import LoginButton from "./LoginButton";
import Link from "next/link";
import { wrappedTheme } from "@/lib/theme";

export default function LoginPage() {
  return (
    <div className={`flex min-h-screen items-center justify-center ${wrappedTheme.container}`}>
      <div className={`w-full max-w-md p-6 ${wrappedTheme.card}`}>
        <h1 className={`text-2xl font-semibold tracking-tight ${wrappedTheme.gradientText}`}>
          Vibe Coding Profiler
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Sign in to analyze your build patterns from git history.
        </p>
        <div className="mt-6">
          <LoginButton />
        </div>
        <div className="mt-6 flex items-center justify-between gap-4 text-xs text-zinc-500">
          <Link href="/" className="underline underline-offset-2">
            Home
          </Link>
          <Link href="/methodology" className="underline underline-offset-2">
            Methodology
          </Link>
          <Link href="/security" className="underline underline-offset-2">
            Security notes
          </Link>
        </div>
      </div>
    </div>
  );
}
