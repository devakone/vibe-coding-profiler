import AnalysisClient from "./AnalysisClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { wrappedTheme } from "@/lib/theme";

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
    <div className={`${wrappedTheme.container} py-10`}>
      <div className="mx-auto max-w-5xl">
        <div className={`rounded-[2rem] p-6 ${wrappedTheme.card}`}>
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
