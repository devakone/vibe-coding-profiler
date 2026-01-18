import { redirect } from "next/navigation";
import Link from "next/link";
import { isCurrentUserAdmin } from "@/lib/admin";
import { wrappedTheme } from "@/lib/theme";
import { getCoverageReports } from "../actions";
import AdminClient from "../AdminClient";

export default async function AdminDiagnosticsPage() {
  const isAdmin = await isCurrentUserAdmin();

  if (!isAdmin) {
    redirect("/");
  }

  const reportsResult = await getCoverageReports(10);

  return (
    <div className={`${wrappedTheme.container} ${wrappedTheme.pageY}`}>
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <Link
            href="/admin"
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            ← Back to Admin
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            Persona Diagnostics
          </h1>
          <p className="mt-1 text-zinc-600">
            Test persona rule coverage and identify patterns that need new rules.
          </p>
        </div>

        <AdminClient initialReports={reportsResult.reports} />
      </div>
    </div>
  );
}
