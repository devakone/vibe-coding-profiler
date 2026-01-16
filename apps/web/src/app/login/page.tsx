import LoginButton from "./LoginButton";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Bolokono
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Sign in to analyze your build patterns from git history.
        </p>
        <div className="mt-6">
          <LoginButton />
        </div>
      </div>
    </div>
  );
}

