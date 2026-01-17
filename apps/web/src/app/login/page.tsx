import LoginButton from "./LoginButton";
import Link from "next/link";
import { wrappedTheme } from "@/lib/theme";

export default function LoginPage() {
  return (
    <div className={`flex min-h-screen items-center justify-center ${wrappedTheme.container}`}>
      <div className={`w-full max-w-md p-6 ${wrappedTheme.card}`}>
        <h1 className={`text-2xl font-semibold tracking-tight ${wrappedTheme.gradientText}`}>
          Vibed Coding
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Sign in to analyze your build patterns from git history.
        </p>
        <div className="mt-6">
          <LoginButton />
        </div>
        <div className="mt-6 flex items-center justify-between text-xs text-zinc-500">
          <Link href="/security" className="underline underline-offset-2">
            Security notes
          </Link>
          <Link href="/" className="underline underline-offset-2">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
