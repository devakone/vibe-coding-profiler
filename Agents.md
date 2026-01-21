# Agent Instructions for Vibed Coding

This document provides instructions for AI agents working on the Vibed Coding codebase. Read this before making any changes.

---

## Project Overview

**Vibed Coding** analyzes git history to reveal developer craftsmanship patterns. The stack is:

- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js Route Handlers (Vercel)
- **Auth:** Supabase Auth with GitHub OAuth
- **Database:** Supabase Postgres with Row Level Security
- **Background Jobs:** Inngest (primary) or standalone worker (fallback)
- **LLM:** Anthropic Claude, OpenAI, or Google Gemini (server-side only, configurable)

See `docs/PRD.md` for full product requirements and `docs/architecture/inngest-integration.md` for job processing details.

**Key Reference Docs:**
- [How Vibed Works](docs/how-vibed-works.md) — Product-friendly explanation of analysis
- [Vibed Analysis Pipeline](docs/architecture/vibed-analysis-pipeline.md) — Technical architecture with algorithms and data flow

---

## Development Environment

### Prerequisites

- Node.js 18+
- Docker (for local Supabase)
- Supabase CLI (`npm install -g supabase`)
- GitHub OAuth App credentials

### Starting the Dev Environment

**IMPORTANT:** Do not start the dev server automatically. The user typically runs it themselves in a separate terminal.

Before running any server commands, check if the server is already running:

```bash
# Check if Next.js dev server is running
lsof -i :8108

# Check if Supabase is running
npm run supabase:status
```

**If Supabase is not running:**
```bash
npm run supabase:start
```

**CRITICAL:** Always use the `npm run supabase:*` scripts instead of `npx supabase` directly. The npm scripts load environment variables (like `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`) from `apps/web/.env.local` before invoking Supabase commands. Using `npx supabase` directly will cause OAuth to fail with 400 errors.

**If Next.js is not running and user asks you to start it:**
```bash
npm run dev
```

### Environment Variables

Copy the example env file and fill in values:

```bash
cp .env.example .env.local
```

Required variables:
```bash
# Supabase (from `npm run supabase:status` for local)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase status>
SUPABASE_SERVICE_ROLE_KEY=<from supabase status>

# GitHub OAuth (create at https://github.com/settings/developers)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Claude API
ANTHROPIC_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:8108
```

---

## Database Access

### Local Dev Database

The local Supabase runs in Docker. Always develop against local first.

**1. Get the database URL:**
```bash
npm run supabase:status
# Look for "DB URL: postgresql://postgres:postgres@127.0.0.1:XXXXX/postgres"
```

**2. Run SQL using psql:**
```bash
psql "postgresql://postgres:postgres@127.0.0.1:XXXXX/postgres" -c "YOUR SQL HERE"
```

**CRITICAL for AI Agents:**
- Do NOT use MCP Supabase tools for local dev operations—they connect to remote projects
- Always use `psql` with the local DB URL from `npm run supabase:status`
- The MCP Supabase tools are for remote database operations only

### Supabase Project References

| Environment | Project Ref | Dashboard URL | Branch |
|-------------|-------------|---------------|--------|
| Local | N/A | `npm run supabase:start` → http://127.0.0.1:54423 | - |
| Development | `ljxvzqjkwwwsgdnvgpgm` | https://supabase.com/dashboard/project/ljxvzqjkwwwsgdnvgpgm | `develop` |
| Production | `idjewtwnfrufbxoxulmq` | https://supabase.com/dashboard/project/idjewtwnfrufbxoxulmq | `main` |

**Default remote:** Development (`ljxvzqjkwwwsgdnvgpgm`)

### Switching Between Environments

By default, the Supabase CLI points to the **development** remote. You only need to explicitly link when switching to production.

```bash
# Check which environment is currently linked
npm run supabase:which

# Link to production (CAUTION: only for production deployments)
npm run supabase:link:prod

# Link back to development (restore default)
npm run supabase:link:dev
```

Add these scripts to `package.json`:
```json
{
  "scripts": {
    "supabase:which": "npx supabase projects list",
    "supabase:link:dev": "npx supabase link --project-ref <DEV_PROJECT_REF>",
    "supabase:link:prod": "npx supabase link --project-ref <PROD_PROJECT_REF>"
  }
}
```

**When to use each:**
- **Local:** Default for all development work
- **Development remote (default):** Testing against shared dev data, deploying previews, pushing migrations
- **Production remote:** Only for production deployments or critical debugging

---

## Database Migrations

### Golden Rules

1. **Never modify existing migration files** that have been applied
2. **Never reset the database** unless absolutely necessary
3. **Always create new migration files** for schema changes
4. **Test locally first** before pushing to remote

### Creating a New Migration

```bash
# Create a new migration file
npm run supabase:migration:new <migration_name>

# This creates: supabase/migrations/<timestamp>_<migration_name>.sql
```

### Applying Migrations

**Local (default approach):**
```bash
# Apply pending migrations (preserves data)
npm run supabase:migration:up

# Check migration status
npm run supabase:status
```

**Remote:**
```bash
# Push migrations to linked remote project (use npx for remote operations)
npx supabase db push
```

### When to Use `db reset`

Only use `npm run supabase:reset` when:
- You need to completely rebuild the schema from scratch
- There are migration conflicts that cannot be resolved
- Explicitly requested by the user

**WARNING:** `db reset` destroys all local data including test users and analysis results.

### Migration Best Practices

```sql
-- Use gen_random_uuid() for UUID defaults (built-in)
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- NOT uuid_generate_v4() which requires uuid-ossp extension

-- Always include IF NOT EXISTS for safety
CREATE TABLE IF NOT EXISTS users (...);

-- Use explicit schema references
CREATE TABLE public.users (...);

-- Add RLS policies in the same migration as the table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select ON public.users
  FOR SELECT USING (auth.uid() = id);
```

### Checking Migration Status

```bash
# Local
npm run supabase:status

# Remote (after linking) - use npx for remote operations
npx supabase migration list --linked
```

---

## Test Credentials

### Local Dev Test User

For testing authenticated flows locally, create this test user:

| Field | Value |
|-------|-------|
| Email | `testuser@vibed.coding` |
| Password | `TestPass123!` |

**To create the test user:**

1. Start local Supabase: `npm run supabase:start`
2. Go to local Supabase Studio: `http://127.0.0.1:54323`
3. Navigate to Authentication → Users
4. Click "Add User" and enter the credentials above

**Alternative via SQL:**
```bash
# Get DB URL first
npm run supabase:status

# Create user (replace XXXXX with actual port)
psql "postgresql://postgres:postgres@127.0.0.1:XXXXX/postgres" -c "
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'testuser@vibed.coding',
  crypt('TestPass123!', gen_salt('bf')),
  now(),
  now(),
  now()
);
"
```

### GitHub OAuth Testing

For GitHub OAuth testing locally:
1. Create a GitHub OAuth App at https://github.com/settings/developers
2. Set callback URL to `http://localhost:54421/auth/v1/callback`
3. Add credentials to `.env.local`

---

## Coding Conventions

### TypeScript

- No `any` types—use proper typing or `unknown` with type guards
- Use interfaces for object shapes, types for unions/primitives
- Export types from dedicated `types.ts` files

### Date/Time Handling

- Store all timestamps as `TIMESTAMPTZ` in Postgres (UTC)
- Use `date-fns` for date manipulation
- Convert to user's timezone only for display

```typescript
import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

// Formatting for display
const displayDate = formatInTimeZone(
  parseISO(commit.author_date),
  userTimezone,
  'MMM d, yyyy HH:mm'
);
```

### Component Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth-related routes (grouped)
│   ├── (dashboard)/       # Authenticated routes (grouped)
│   └── api/               # Route handlers
├── components/
│   ├── ui/                # shadcn/ui components
│   └── [feature]/         # Feature-specific components
├── lib/
│   ├── supabase/          # Supabase client utilities
│   ├── github/            # GitHub API client
│   ├── analysis/          # Analysis logic
│   └── utils/             # Shared utilities
└── types/                 # TypeScript type definitions
```

### Imports

```typescript
// External imports first
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Internal imports (absolute paths)
import { Button } from '@/components/ui/button';
import { analyzeCommits } from '@/lib/analysis';
import type { CommitEvent } from '@/types';
```

### Error Handling

```typescript
// API routes: return proper error responses
export async function POST(request: Request) {
  try {
    // ... logic
  } catch (error) {
    console.error('Analysis failed:', error);
    return Response.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}

// Client: use error boundaries and loading states
```

---

## AI Agent Workflow

### Execution Order (Critical)

```
1. PRD → 2. Implementation Tracker → 3. Database → 4. Backend → 5. UI → 6. Test → 7. Document
```

**Database migrations MUST be applied before any other implementation.**

### Before Starting Any Task

1. Read `docs/PRD.md` for product context
2. Check `docs/implementation-trackers/` for current progress
3. Verify local Supabase is running: `npm run supabase:status`
4. Check for pending migrations: `npm run supabase:status`

### Task Specification Format

When creating implementation tasks, use this format:

```markdown
### F1. Database Schema
**Task:** Create users and repos tables with RLS policies
**Deliverables:**
- [ ] Migration file created
- [ ] Tables created with all columns
- [ ] RLS policies applied
- [ ] Indexes added
**Files:** `supabase/migrations/XXXXXX_create_users_repos.sql`
**Success Criteria:** `npm run supabase:migration:up` succeeds, RLS tests pass
**Dependencies:** None
**Blocks:** F2, P1, P2
```

### Phasing Standard

#### Foundational Phases (Sequential)

Work that must complete before parallel work can begin:
- Database migrations
- Shared types and utilities
- Auth guards and middleware

Each task must declare what it **blocks** and what it **depends on**.

#### Independent Phases (Parallel)

After foundation, work can proceed in parallel:
- Each phase is self-contained
- Clear inputs/outputs defined
- Minimal shared dependencies

---

## Commits

### Commit Conventions

- Use conventional commit format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Keep commits focused—one logical change per commit

```bash
# Good
feat(auth): implement GitHub OAuth flow
fix(analysis): handle repos with no commits
chore(deps): update supabase-js to 2.39.0

# Bad
update stuff
fix bugs
WIP
```

### Before Committing

1. Only commit files you directly worked on for the current task
2. Verify staged files:
   ```bash
   git status --short
   git diff --stat --cached
   ```
3. Run type check: `npm run type-check`
4. Run lint: `npm run lint`

### Co-Author Attribution

When AI assists with code, include co-author:
```
feat(analysis): implement commit classification

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Quality Checklist

Before marking any task complete:

- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Migrations apply cleanly (`npm run supabase:migration:up`)
- [ ] RLS policies tested (query as different users)
- [ ] Loading states implemented
- [ ] Error states handled
- [ ] No `console.log` left in production code
- [ ] No hardcoded secrets or credentials

---

## Troubleshooting

### Supabase Won't Start

```bash
# Check Docker is running
docker ps

# Reset Supabase (destroys local data)
npm run supabase:stop
npm run supabase:start
```

### Migration Conflicts

```bash
# Check current state
npm run supabase:status

# If stuck, repair migration history (careful!) - use npx for advanced operations
npx supabase migration repair --status applied <version>
```

### GitHub OAuth Not Working

1. **Most common cause:** Supabase was started without env vars. Restart with `npm run supabase:stop && npm run supabase:start`
2. **Stale browser state:** Clear cookies and site data for `localhost` in your browser, then try again
3. Check callback URL in GitHub OAuth App matches: `http://localhost:54421/auth/v1/callback`
4. Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set in `apps/web/.env.local`
5. Check Supabase Auth settings in local Studio: `http://127.0.0.1:54423`
6. Use `localhost:8108` consistently (not `127.0.0.1:8108`) to avoid OAuth state mismatches

### MCP Tools Not Connecting

MCP Supabase tools connect to remote projects, not local. For local development:
- Use `psql` with local DB URL
- Use Supabase Studio at `http://127.0.0.1:54323`

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run supabase:start` | Start local Supabase (loads env vars) |
| `npm run supabase:stop` | Stop local Supabase |
| `npm run supabase:status` | Show local URLs and keys |
| `npm run supabase:migration:new <name>` | Create migration |
| `npm run supabase:migration:up` | Apply migrations |
| `npm run supabase:reset` | Reset database (destroys data) |
| `npm run dev` | Start Next.js dev server |
| `npm run dev:web` | Start only the web app |
| `npm run type-check` | TypeScript check |
| `npm run lint` | ESLint check |

---

## Documentation Policy

- **Minimize new docs**—update existing files instead
- **Update implementation tracker** when completing tasks
- **Keep PRD.md current** if requirements change
- **This file (Agents.md)** is the source of truth for agent behavior

---

## Workflow Capture

**IMPORTANT:** This project is also a learning tool for improving the development process.

### When to Log

Add entries to `docs/WorkflowJournal.md` when you observe:

| Tag | When to Use |
|-----|-------------|
| `[MANUAL]` | User or agent did something by hand that could be scripted |
| `[REPETITIVE]` | Did something that's been done in other projects |
| `[FRICTION]` | Hit a snag, needed a workaround, or found unexpected complexity |
| `[INSIGHT]` | Learned something worth remembering for future projects |
| `[DECISION]` | Made a choice between alternatives (capture the reasoning) |

### Entry Format

```markdown
### YYYY-MM-DD HH:MM - [TAG] Short title
**Context:** What were you trying to do?
**Action:** What did you actually do?
**Time spent:** Estimate
**Automation opportunity:** None | Low | Medium | High
**Notes:** Any additional context
```

### Examples of What to Capture

**Do log:**
- Creating a new file that follows a pattern from other projects
- Running a manual command that could be in a script
- Discovering a gotcha or workaround
- Choosing between libraries, approaches, or patterns
- Anything that took longer than expected

**Don't log:**
- Routine code edits
- Standard git operations
- Things already documented elsewhere

### Proactive Capture

When completing a task, briefly consider:
1. Was any part of this manual when it could be automated?
2. Have I done this exact thing in another project?
3. Did I learn something that would help next time?

If yes to any, add a journal entry before moving on.

---

## Related Workflow Documents

| Document | Purpose |
|----------|---------|
| `docs/Workflow.md` | The playbook—how projects are started (template for future) |
| `docs/WorkflowJournal.md` | Real-time capture during this project |
| `docs/PRD.md` | Product requirements |
| `docs/Agents.md` | This file—agent instructions |

The journal feeds insights back into the playbook. Over time, high-automation-opportunity items become scripts or templates.

---

*Last updated: Phase 0 initialization*
