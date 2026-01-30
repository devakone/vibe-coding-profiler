/**
 * Retry all queued analysis jobs by re-sending Inngest events.
 *
 * Usage:
 *   INNGEST_EVENT_KEY=<key> node scripts/retry-queued-jobs.mjs
 *
 * The Inngest event key can be found in the Inngest dashboard or Vercel env vars.
 * Supabase credentials are loaded from apps/web/.env.local / .env automatically.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ── env loading (reused from supabase.mjs) ──────────────────────────────────

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const contents = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim().replace(/^export\s+/, "");
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && (process.env[key] === undefined || process.env[key] === "")) {
      process.env[key] = value;
    }
  }
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadDotEnvFile(path.join(repoRoot, "apps/web/.env.local"));
loadDotEnvFile(path.join(repoRoot, "apps/web/.env"));

// ── config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const INNGEST_EVENT_KEY = process.env.INNGEST_EVENT_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!INNGEST_EVENT_KEY) {
  console.error(
    "Missing INNGEST_EVENT_KEY. Get it from the Inngest dashboard or Vercel env vars.\n" +
      "Usage: INNGEST_EVENT_KEY=<key> node scripts/retry-queued-jobs.mjs"
  );
  process.exit(1);
}

// ── main ────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Fetch all queued jobs
  const url = `${SUPABASE_URL}/rest/v1/analysis_jobs?select=id,user_id,repo_id,created_at&status=eq.queued&order=created_at.asc`;
  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });

  if (!res.ok) {
    console.error("Failed to fetch queued jobs:", res.status, await res.text());
    process.exit(1);
  }

  const jobs = await res.json();

  if (jobs.length === 0) {
    console.log("No queued jobs found.");
    return;
  }

  console.log(`Found ${jobs.length} queued job(s). Re-sending Inngest events...\n`);

  // 2. Send an Inngest event for each job
  let success = 0;
  let failed = 0;

  for (const job of jobs) {
    const event = {
      name: "repo/analyze.requested",
      data: {
        jobId: job.id,
        userId: job.user_id,
        repoId: job.repo_id,
      },
    };

    try {
      const inngestRes = await fetch(`https://inn.gs/e/${INNGEST_EVENT_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });

      if (inngestRes.ok) {
        console.log(`  ✓ ${job.id} (created ${job.created_at})`);
        success++;
      } else {
        const body = await inngestRes.text();
        console.error(`  ✗ ${job.id}: ${inngestRes.status} ${body}`);
        failed++;
      }
    } catch (err) {
      console.error(`  ✗ ${job.id}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. ${success} sent, ${failed} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
