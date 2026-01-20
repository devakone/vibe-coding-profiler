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
        <AnalysisClient jobId={jobId} />
        <details className={`mt-10 rounded-[2rem] p-6 ${wrappedTheme.card}`}>
          <summary className="cursor-pointer text-sm font-semibold text-zinc-900">
            Analysis details
          </summary>
          <div className="mt-3 space-y-1 text-sm text-zinc-600">
            <p>
              Job <span className="font-mono">{jobId}</span>
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}
