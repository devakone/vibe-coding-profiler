# Vibe Coding Profiler

Vibe Coding Profiler is an open-source “Vibe Coding Profile” experience that analyzes Git history to surface craftsmanship patterns, persona signals, and shareable narratives tailored for developers who build with AI assistance. The source code is released under the Apache License 2.0, but **Vibe Coding Profiler**, **Vibed Coding**, **Vibe Coding Profile**, and **VCP** are our trademarks—please don’t use those names, logos, or service descriptions in commercial products without written permission.

## Quick start

1. `npm install`
2. Copy `.env.example` to `apps/web/.env.local` and populate Supabase, GitHub, and Claude API keys.
3. `npm run dev:web` (runs Next.js on port 8108 by default)
4. `npm run lint`, `npm run build`, `npm run test` (via turbo) verify the workspace.

## Structure

- `apps/web`: Next.js app (App Router, API routes, share endpoints)
- `apps/worker`: standalone Supabase worker (GitHub ingestion + analysis)
- `packages/core`: analysis and persona logic used by the worker and web app
- `packages/db`: Supabase helper library + generated types
- `supabase/migrations`: Postgres schema + security policies
- `docs/`: requirements, architecture, security, workflow trackers

## Security / brand notes

- Secrets are protected with AES-256-GCM helpers and Supabase RLS (see `apps/web/src/lib/llmKey.ts`, `supabase/migrations/0013_create_llm_configs.sql`).
- `trufflehog`/`git-secrets` should run before every public release; rotate any detected keys.
- The repository runs `.github/workflows/security.yml`, which executes `npm audit --audit-level=moderate` and a `trufflehog` git scan on every push/PR to `develop`/`main`.
- `Vibed Coding`, `Vibe Coding Profile`, `Vibe Coding Profiler`, and `VCP` are brand assets; you may fork and build on the code, but please rename your fork if it’s used commercially or redistributed.

## Documentation

- `docs/security/open-source-preparedness.md`: release readiness + remaining hardening steps
- `docs/PRD.md`: product requirements driving the interface
- `docs/architecture/`: pipeline, LLM, share experiences
- `docs/implementation-trackers/`: phase-oriented trackers for UI/API work
- `CONTRIBUTING.md`: how to collaborate
- `CODE_OF_CONDUCT.md`: behavioral expectations

## Contribution

See `CONTRIBUTING.md` for workflow expectations and the trademark reminder.
