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
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-white">Analysis</h1>
      <p className="mt-2 text-sm text-zinc-300">
        Job <span className="font-mono">{jobId}</span>
      </p>
      <AnalysisClient jobId={jobId} />
    </div>
  );
}
