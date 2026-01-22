---
title: Open Source Preparedness
date: 2026-01-22
---

# Open Source Preparedness

This doc captures where Vibed Coding stands security-wise today and tracks the remaining steps before we flip the repository to public.

---

## 1. Hardened foundations

- **Secrets never committed.** All API keys (Supabase, GitHub OAuth, LLM, release automation) are stored only in environment variables (`apps/web/.env.example` documents the required list) and encrypted at rest (`apps/web/src/lib/llmKey.ts`, `apps/web/src/lib/supabase/service.ts`).
- **Encrypted key storage + RLS.** Sensitive tokens sit behind AES-256-GCM helpers, while Supabase migrations add row-level security on `llm_configs`, `llm_usage`, and `analysis_*` tables (`supabase/migrations/0013_create_llm_configs.sql`, `0014_create_llm_usage.sql`, `0017_add_profile_narrative.sql`, `0007_require_outputs_before_done.sql`).
- **Metadata-only analytics.** The worker writes only derived metrics/insights (no PR bodies or source files); PR ingestion extracts checklist markers, template usage, and linked issue numbers for signals.
- **Scoped workflows.** `.github/workflows/release-pr.yml` requests only `contents: write` and `pull-requests: write` and runs under the default `GITHUB_TOKEN`, minimizing token privileges.
- **CI gating.** `turbo lint`, `npm run lint`, `npm run build`, `npm run type-check`, and the worker build (via `turbo`) run under CI so every push checks typings, lint and builds before merges.

---

## 2. Outstanding hardening work

| Task | Target | Status |
| --- | --- | --- |
| Secret history sweep | Run `trufflehog`/`git-secrets` over the full git history; rotate anything flagged before release | 🟡 `trufflehog` attempted locally but fetch step failed on macOS (`.git/FETCH_HEAD` permission); CI job runs successfully |
| Dependency audit | Add `npm audit` (or Dependabot) stage to CI and resolve alerts before GA | 🟢 `npm audit --audit-level=moderate` added; esbuild moderate vulnerability still open (no fix yet) |
| Core OSS docs | Create `README.md`, `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md` with install/build/attack paths and env var/key rotation notes | ✅ Done |
| Security workflow | Run `npm audit --audit-level=moderate` + `trufflehog --entropy False` on every PR | ✅ `.github/workflows/security.yml` now executes both jobs |
| Workflow scopes | Verify repository permissions allow `pull-requests: write` (needed by `release-pr.yml`); document ticket in `SECURITY.md` | ✅ Already scoped; documented in README/SECURITY |

---

## 3. Risk profile when scanners run

### Focus areas they will highlight

1. **Secrets.** Scan tools (GitHub Secret Scanning, TruffleHog, Gitleaks) hunt for pasted keys. We already commit no credentials; the next step is the aforementioned history sweep plus optional git hooks to block secrets moving forward.
2. **Dependency vulnerabilities.** `npm audit`/Dependabot will flag outdated transitive packages; keep `package-lock.json` clean and run `npm audit --audit-level=moderate` in CI before release. Currently the audit flags the moderate `esbuild` advisory (Vite dependency) and there is no upstream fix yet, so we monitor it before every release.
3. **Configuration mistakes.** Scanners expect permissive CORS or RLS misconfigurations. Our RLS policies (e.g., `supabase/migrations/0007_require_outputs_before_done.sql`, `0013_create_llm_configs.sql`, `0014_create_llm_usage.sql`) already tighten access; document the contract in `SECURITY.md`.
4. **Input abuse.** API surface areas such as `/api/analysis/[id]/regenerate-story`, `/api/analysis/start`, `/api/settings/llm-keys`, `/api/share/story/[userId]` are rate-limited and origin checked in the server routes; continue logging only to server side and keep error messages generic.
5. **Data mishandling.** The worker never persists file contents; explain this in `README.md` and `SECURITY.md` so reviewers know commit data remains metadata-only.

### Suggested mitigations

- Maintain secret scanning via git hooks and the new security workflow.
- Run dependency audits (`npm audit`, Dependabot) regularly and treat high/critical findings as blockers.
- Keep API hardening (rate limits, origin checks) in place for endpoints noted above.
- Publish `SECURITY.md` with reporting instructions, expected SLAs, and contact channels.
- Be prepared to trim history with `git filter-repo` if a past secret resurfaces.
-
_Local `trufflehog` runs on macOS currently fail due to `git fetch` complaining about `.git/FETCH_HEAD` permissions; the CI job uses the same command but runs in a clean container and succeeds, so rely on that for release gating. If you need to rerun locally, activate the Python venv (`python3 -m venv .venv && .venv/bin/pip install trufflehog`) and ensure `git fetch` can write to `.git/FETCH_HEAD`._

---

## 4. Getting release ready

1. **Define legal/governance docs.** Add `README.md`, `LICENSE` (MIT/Apache), `CONTRIBUTING.md`, and `CODE_OF_CONDUCT.md` that call out required env vars, LLM key handling, and release governance.
2. **Complete security docs.** Publish `docs/security/` (this file included) plus an author-facing `SECURITY.md` with vulnerability reporting, contact info, and SLA expectations.
3. **Revise CI.** Add a dedicated OSS workflow that chains `turbo lint`, `npm run build`, `npm run type-check`, `npm audit --audit-level=moderate`, and optional `trufflehog`/`git-secrets` checks.
4. **Final checklist.** Before flipping public, run `npm run build`, `npm run lint`, `npm run test`, and a history audit (`trufflehog`/`git-secrets`). Verify `.env` files remain untracked and update this doc with final readiness notes.

Once the checklist is green and the documentation is complete, the repo can be published with confidence that the security posture meets open-source expectations.
