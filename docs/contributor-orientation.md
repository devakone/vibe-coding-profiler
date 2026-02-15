# Contributor Orientation Guide

This guide helps new contributors understand where to look in the codebase, how the app works end-to-end, and how to make safe first contributions.

Use this alongside:
- `README.md` for quick setup
- `CONTRIBUTING.md` for contribution policy
- `docs/architecture/overview.md` for system-level architecture
- `docs/architecture/vibed-analysis-pipeline.md` for analysis internals

## 1. What This Repo Does

Vibe Coding Profiler analyzes git history and produces:
- repo-level analysis (metrics, insights, persona signals)
- user profile aggregation over time
- shareable outputs (public profile + share cards)

Core flow:
1. User connects source control and repos in the web app.
2. API creates `analysis_jobs`.
3. Inngest (primary) or worker (fallback) processes jobs.
4. Results are written to Supabase tables.
5. UI renders analysis and profile views from stored results.

## 2. Monorepo Layout

Top-level packages:
- `apps/web`: Next.js app (UI + API routes + Inngest functions)
- `apps/worker`: standalone fallback worker
- `packages/core`: shared analysis logic and persona computation
- `packages/db`: DB client helpers + generated database types
- `supabase/migrations`: schema and RLS migrations
- `docs`: product, architecture, trackers, security notes

## 3. Where To Make Changes

Use this map to find the right place quickly.

### UI and page behavior
- Pages/routes: `apps/web/src/app`
- Shared UI: `apps/web/src/components/ui`
- VCP-specific components: `apps/web/src/components/vcp`
- Share visuals: `apps/web/src/components/share`

### API behavior (web backend)
- API routes: `apps/web/src/app/api`
- Auth/provider integration: `apps/web/src/app/api/auth`, `apps/web/src/lib/platforms`
- Profile/public endpoints: `apps/web/src/app/api/profile`, `apps/web/src/app/api/public`

### Analysis logic and personas
- Metrics, persona detection, insights: `packages/core/src`
- Platform clients abstraction: `packages/core/src/platforms`
- LLM helper logic: `packages/core/src/llm`

### Job orchestration
- Primary processing: `apps/web/src/inngest/functions`
- Fallback processing: `apps/worker/src`

### Database schema and policies
- Migrations: `supabase/migrations`
- Seed and local setup: `supabase/seed.sql`, `scripts/supabase.mjs`

## 4. Local Development Loop

From repo root:

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example apps/web/.env.local
```

3. Start local Supabase:
```bash
npm run supabase:start
```

4. Start web app:
```bash
npm run dev:web
```

5. Run quality checks before PR:
```bash
npm run lint
npm run type-check
npm run build
```

Notes:
- Web default port is `8108`.
- Prefer `npm run supabase:*` scripts (not raw `npx supabase`) so env loading is consistent.

## 5. Safe First Contributions

Good first PRs:
- docs clarifications and dead-link fixes
- UI copy polish in existing pages/components
- small bug fixes in API routes with tests
- type improvements in `packages/core`

Higher-risk changes (coordinate first):
- migrations touching auth/RLS
- changes to job claim/processing flow
- provider token/encryption handling
- broad refactors across `apps/web` + `packages/core`

## 6. How To Validate a Change

### Frontend/UI changes
- Verify page renders and navigation paths.
- Check authenticated and unauthenticated flows.
- Ensure no metadata/route warnings in dev/build logs.

### API/backend changes
- Test route manually with valid and invalid inputs.
- Confirm error responses are structured and safe.
- Re-run `npm run type-check` and `npm run build`.

### Analysis logic changes
- Update/add tests under `packages/core/src/__tests__`.
- Verify output shape compatibility with web consumers.
- Validate no regressions in existing persona/metrics tests.

### DB changes
- Create new migration only (never edit applied migration files).
- Apply with `npm run supabase:migration:up`.
- Confirm RLS expectations before merge.

## 7. How Releases Flow

- `develop` is active integration branch.
- `main` is release branch.
- Release PR sync workflow keeps a `develop -> main` PR updated.
- Release notes body is generated automatically from commit history.

If release PR automation fails, check:
- `.github/workflows/release-pr.yml`
- repo Actions permissions
- `RELEASE_PR_TOKEN` secret scope

## 8. Contributor Checklist

Before opening a PR:
1. Keep your branch scoped to one concern.
2. Run lint, type-check, and build locally.
3. Update docs if behavior, setup, or architecture changed.
4. Ensure no secrets are introduced.
5. Use clear commit messages (conventional format preferred).

## 9. Security and OSS Expectations

- Never commit `.env` files or tokens.
- Run local secret scans when touching auth/secrets code.
- Follow `SECURITY.md` reporting process for vulnerabilities.
- Respect trademark policy in `README.md` and `CONTRIBUTING.md`.
