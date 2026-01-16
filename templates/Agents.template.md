# Agent Instructions

> **Copy this file to `docs/Agents.md` in any new project.**
> Customize sections marked with `<!-- CUSTOMIZE -->`.
> Delete this notice and all `<!-- CUSTOMIZE -->` comments after setup.

This document provides instructions for AI agents working on this codebase.

---

## Project Overview

<!-- CUSTOMIZE: Replace with your project details -->

**Project:** `PROJECT_NAME`
**Description:** Brief description of what this project does

**Stack:**
- Frontend: <!-- e.g., Next.js 14+, TypeScript, Tailwind CSS, shadcn/ui -->
- Backend: <!-- e.g., Next.js Route Handlers -->
- Auth: <!-- e.g., Supabase Auth -->
- Database: <!-- e.g., Supabase Postgres -->
- Hosting: <!-- e.g., Vercel -->

See `docs/PRD.md` for full product requirements.

---

## Development Environment

### Prerequisites

<!-- CUSTOMIZE: List your prerequisites -->

- Node.js 18+
- Docker (if using local database)
- <!-- Other tools -->

### Starting the Dev Environment

**IMPORTANT:** Do not start the dev server automatically. The user typically runs it in a separate terminal.

Before running server commands, check if already running:

```bash
# Check if dev server is running
lsof -i :3000

# Check if local database is running (if applicable)
<!-- CUSTOMIZE: e.g., npx supabase status -->
```

### Environment Variables

```bash
cp .env.example .env.local
```

<!-- CUSTOMIZE: List required variables -->

Required:
```bash
# Database
DATABASE_URL=

# Auth
# ...

# API Keys
# ...
```

---

## Database Access

<!-- CUSTOMIZE: Adapt for your database setup -->

### Local Development

<!-- Example for Supabase: -->
```bash
# Get database URL
npx supabase status

# Run SQL
psql "postgresql://postgres:postgres@127.0.0.1:XXXXX/postgres" -c "YOUR SQL"
```

### Remote Environments

| Environment | Reference | Notes |
|-------------|-----------|-------|
| Development | `<!-- DEV_REF -->` | Default for CLI |
| Production | `<!-- PROD_REF -->` | Use with caution |

### Switching Environments

```bash
# Check current environment
npm run db:which

# Switch to production (careful!)
npm run db:link:prod

# Switch back to development
npm run db:link:dev
```

---

## Database Migrations

### Golden Rules

1. **Never modify existing migration files** that have been applied
2. **Never reset the database** unless absolutely necessary
3. **Always create new migration files** for schema changes
4. **Test locally first** before pushing to remote

### Creating Migrations

<!-- CUSTOMIZE: Adapt for your migration tool -->

```bash
# Create new migration
npx supabase migration new <name>

# Apply migrations
npx supabase migration up

# Check status
npx supabase migration list
```

### Best Practices

```sql
-- Use built-in UUID generation
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- Include IF NOT EXISTS for safety
CREATE TABLE IF NOT EXISTS users (...);

-- Enable RLS in same migration as table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
```

---

## Coding Conventions

### TypeScript

- No `any` types—use proper typing or `unknown`
- Use interfaces for object shapes
- Export types from dedicated `types.ts` files

### File Structure

<!-- CUSTOMIZE: Define your project structure -->

```
src/
├── app/                    # Pages/routes
├── components/
│   ├── ui/                # Reusable UI components
│   └── [feature]/         # Feature-specific
├── lib/                   # Utilities and clients
└── types/                 # TypeScript definitions
```

### Imports

```typescript
// External imports first
import { useState } from 'react';

// Internal imports (absolute paths)
import { Button } from '@/components/ui/button';
import type { User } from '@/types';
```

---

## AI Agent Workflow

### Execution Order

```
1. PRD → 2. Database → 3. Backend → 4. UI → 5. Test → 6. Document
```

**Database migrations MUST be applied before any other implementation.**

### Before Starting Any Task

1. Read `docs/PRD.md` for context
2. Check for any implementation tracker
3. Verify dev environment is ready
4. Check for pending migrations

### Task Format

```markdown
### Task Name
**Goal:** What needs to be done
**Deliverables:**
- [ ] Item 1
- [ ] Item 2
**Files:** `path/to/files`
**Success Criteria:** How to verify
**Dependencies:** What must be done first
```

---

## Commits

### Format

Use conventional commits:

```bash
feat(scope): add new feature
fix(scope): fix bug
docs(scope): update documentation
chore(scope): maintenance task
```

### Before Committing

1. Only commit files for the current task
2. Verify staged files: `git status --short`
3. Run checks: `npm run type-check && npm run lint`

### Co-Author Attribution

```
feat: implement feature

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Quality Checklist

Before marking any task complete:

- [ ] TypeScript compiles (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Migrations apply cleanly
- [ ] Error states handled
- [ ] Loading states implemented
- [ ] No console.log in production code
- [ ] No hardcoded secrets

---

## Workflow Capture

**IMPORTANT:** This project tracks the development process to improve future workflows.

### When to Log

Add entries to `docs/WorkflowJournal.md` when you observe:

| Tag | When to Use |
|-----|-------------|
| `[MANUAL]` | Something done by hand that could be scripted |
| `[REPETITIVE]` | Something done in other projects too |
| `[FRICTION]` | Snag, workaround, or unexpected complexity |
| `[INSIGHT]` | Something worth remembering |
| `[DECISION]` | Choice between alternatives |

### Entry Format

```markdown
### YYYY-MM-DD HH:MM - [TAG] Short title
**Context:** What were you trying to do?
**Action:** What did you actually do?
**Time spent:** Estimate
**Automation opportunity:** None | Low | Medium | High
**Notes:** Any additional context
```

### Proactive Capture

After completing a task, consider:
1. Was any part manual when it could be automated?
2. Have I done this in another project?
3. Did I learn something useful?

If yes, add a journal entry.

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `docs/PRD.md` | Product requirements |
| `docs/Workflow.md` | Development process playbook |
| `docs/WorkflowJournal.md` | Real-time action capture |

---

## Quick Reference

<!-- CUSTOMIZE: Add your common commands -->

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run type-check` | TypeScript check |
| `npm run lint` | Linting |

---

*Template version: 1.0*
