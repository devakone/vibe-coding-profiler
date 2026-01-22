---
title: Open Source Preparedness
date: 2026-01-22
---

# Open Source Preparedness

This document summarizes the current security posture of Vibed Coding and lays out the steps taken (and still pending) before the repository is made public.

---

## 1. What we already have

- **Secrets never committed.** All API keys (Supabase, GitHub OAuth, LLM) live in environment variables; `.env.example` documents requirements.
- **Encrypted key storage.** GitHub/Supabase/LLM tokens use AES-256-GCM helpers (`apps/web/src/lib/llmKey.ts`, `apps/web/src/lib/supabase/service.ts`), and Supabase migrations define strong RLS policies (`supabase/migrations/0013_create_llm_configs.sql`, `0014_create_llm_usage.sql`, `0019_add_pull_requests.sql`).
- **Metadata-only analysis.** PR ingestion now only stores derived signals (checklists, template markers, linked issue numbers, merge commitment) and never persists bodies. The worker ingests GitHub metadata without code content.
- **Scoped GitHub workflow permissions.** `release-pr.yml` explicitly limits `contents` and `pull-requests` to `write`, and actions run with GitHub's default `GITHUB_TOKEN`, minimizing exposure.
- **Build validation in CI.** `npm run build` (Turbo) runs across all packages; the repo also supports `turbo test`, `lint`, and `type-check` for OSS CI workflows.

---

## 2. Remaining hardening tasks

| Area | Action |
|------|--------|
| **Secrets/history** | Run a tool such as `trufflehog`/`git-secrets` across the git history before making the repo public. Rotate any secrets exposed during early development. |
| **Dependency vulnerabilities** | Schedule `npm audit` (or GitHub Dependabot) as part of CI and fix or mitigate outstanding alerts before release. |
| **Documentation** | Add `README.md`, `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, and a `SECURITY.md` with reporting instructions. Document all required env vars and key rotation procedures. |
| **Security scanning** | Add an optional GitHub Action that runs `npm audit --audit-level=moderate` + `trufflehog --entropy=False` on push/pull requests. |
| **Workflow permissions** | Confirm org/repo Actions permissions allow `pull-requests: write` (needed for release workflow). Document this requirement in `README`/`SECURITY.md`. |

---

## 3. Risk profile when scanning begins

### What scanners will look for

1. **Secrets** – tools such as GitHub Secret Scanning, TruffleHog, and Gitleaks search for API keys or credentials. Keep sensitive tokens out of history and set up git hooks to block them in future commits.
2. **Vulnerabilities in dependencies** – Automated tools will flag outdated packages. Keep `package-lock.json` clean and set up Dependabot or similar.
3. **Configuration mistakes** – Look for permissive CORS, overly wide RLS, logging sensitive data, or credentials in workflows. The `release-pr` workflow already scopes permissions, but ensure no other workflow exposes secrets.
4. **Input abuse** – Review SSR/API endpoints (`/api/analysis/[id]/regenerate-story`, `/api/analysis/start`, `/api/settings/llm-keys`) for validation, rate limits, and safe error handling. Already check origin and rate limit regenerate route; keep logging aggressive errors server-side only.
5. **Data mishandling** – The product focuses on metadata. Continue documenting that raw code, PR bodies, or sensitive comments are never stored in the DB.

### Suggested mitigations

- Enforce secret scanning (pre-commit/CI).  
- Regular dependency audits (`npm audit`, GitHub Dependabot).  
- Harden API paths with rate limiting and origin checks (done for regenerate story).  
- Document how to report vulnerabilities (`SECURITY.md`), including contact channel and expected response time.  
- Retain trimmed commit history via `git filter-repo` if old secrets surface.

---

## 4. Getting ready for release

1. **Define license and governance.** Add `LICENSE` (choose MIT/Apache), `README`, `CONTRIBUTING.md`, and `CODE_OF_CONDUCT.md`. Mention required environment variables and LLM keys.
2. **Add security docs.** This file will live under `docs/security`. Include instructions for reporting vulnerabilities and how keys are stored/rotated.
3. **Revise CI.** (Optional) Add lint/test+`npm audit` workflow; include secret scans.
4. **Final checklist.** Run `npm run build`, `npm run lint`, `npm run test`, and a `trufflehog` scan. Make sure no `.env` files leak, and update docs with the open-source readiness summary above.

Once these steps are done, the repository is ready for public release while keeping security safeguards in place.
