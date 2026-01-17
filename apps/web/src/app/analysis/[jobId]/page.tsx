import AnalysisClient from "./AnalysisClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-gradient-to-b from-fuchsia-50 via-white to-cyan-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-[2rem] border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Analysis</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Job <span className="font-mono">{jobId}</span>
          </p>
        </div>
        <AnalysisClient jobId={jobId} />
      </div>
    </div>
  );
}
