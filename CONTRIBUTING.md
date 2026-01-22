# Contributing to Vibe Coding Profiler

Thanks for helping improve Vibe Coding Profiler! We welcome new contributors—here’s how to get started safely and respectfully.

## 1. Pick your workstream

- **Bug/issue:** Open an issue describing the behaviour, steps to reproduce, and expected outcome.
- **New feature:** Link to the relevant PRD or tracker under `docs/prd/` and coordinate in `docs/implementation-trackers/`.
- **Docs or security improvements:** Target the `docs/` tree (architecture, security readiness, workflow notes).

Before working, confirm nobody else is already tackling it (add a comment or label the issue). If you’re unsure, open a discussion issue and tag `@devakone`.

## 2. Local setup

1. `npm install`
2. Copy `.env.example` → `apps/web/.env.local` and fill Supabase/GitHub/Claude values.
3. `npm run lint`, `npm run build`, `npm run test` to ensure your machine matches CI standards.
4. `npm run dev:web` for the frontend (Next.js listens on 8108).

Database migrations run via `npm run supabase:migration:up`; avoid manual schema changes unless coordinated with the team.

## 3. Workflow

1. Work on a branch named `feat/...` or `fix/...`.
2. Run `turbo lint`/`npm run lint` before pushing.
3. Rebase on `develop` and keep commits tidy (conventional commits if you plan to merge).
4. Push, then open a PR against `develop`. The PR template will check that:
   - Tests/lint/build pass locally.
   - No secrets are leaked (run `git status`, never stage `.env` files).
   - The README/SECURITY docs are up to date if your change affects onboarding or security.
5. After PR review, squash/fixups if needed and merge via “rebase and merge.”

## 4. Communication

- Use Slack/email for urgent ship-blockers.
- Report vulnerabilities via `security@bolokonon.dev` (see `SECURITY.md`).
- Tag `@devakone` on docs or backend changes requiring clarification.

## 5. Trademark reminder

The code is Apache 2.0 open-source, but **Vibe Coding Profiler**, **Vibed Coding**, **Vibe Coding Profile**, and **VCP** are trademarks. Keep the brand names within this repo; if you fork for commercial use, rename your project accordingly.
