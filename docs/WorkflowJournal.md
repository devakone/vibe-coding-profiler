# Workflow Journal: Bolokono

**Purpose:** Real-time capture of manual, repetitive, and noteworthy actions during development. This feeds back into improving the Workflow Playbook.

---

## How to Use This Journal

Agents and humans add entries when:
- **[MANUAL]** - Did something by hand that could be automated
- **[REPETITIVE]** - Did something we've done before in other projects
- **[FRICTION]** - Hit a snag, workaround, or unexpected complexity
- **[INSIGHT]** - Learned something worth remembering
- **[DECISION]** - Made a choice between alternatives (capture the why)

Format:
```markdown
### YYYY-MM-DD HH:MM - [TAG] Short title
**Context:** What were you trying to do?
**Action:** What did you actually do?
**Time spent:** Estimate
**Automation opportunity:** None | Low | Medium | High
**Notes:** Any additional context
```

---

## Journal Entries

### 2025-01-16 - [MANUAL] Created GitHub repository
**Context:** Needed a repo for the project
**Action:** Manually created https://github.com/devakone/bolokonon via GitHub web UI
**Time spent:** 2 minutes
**Automation opportunity:** High - `gh repo create devakone/bolokonon --public --description "Analyze git history to reveal developer craftsmanship patterns"`
**Notes:** Could be part of a kickstart script

---

### 2025-01-16 - [MANUAL] Created Supabase project
**Context:** Need database and auth for the app
**Action:** Manually created project via Supabase dashboard
**Time spent:** 3 minutes
**Automation opportunity:** Medium - Supabase Management API can create projects, but requires org setup
**Notes:** Need to capture the project ref once created

---

### 2025-01-16 - [REPETITIVE] Wrote .gitignore
**Context:** Every project needs a .gitignore
**Action:** Created standard Next.js/Supabase .gitignore
**Time spent:** 1 minute (AI generated)
**Automation opportunity:** High - Should be in project template
**Notes:** Same patterns used in most projects

---

### 2025-01-16 - [REPETITIVE] Created Agents.md structure
**Context:** Need agent instructions for AI-assisted development
**Action:** Adapted from previous project (Sabati) with Bolokono-specific changes
**Time spent:** 10 minutes
**Automation opportunity:** High - Base template exists, just needs project-specific customization
**Notes:** Core sections are the same: Database Access, Migrations, Commits, Quality Checklist

---

### 2025-01-16 - [INSIGHT] PRD iteration across multiple AI tools
**Context:** Drafting the initial product concept
**Action:** Used Perplexity → ChatGPT → Claude to iterate on the idea
**Time spent:** Variable
**Automation opportunity:** Low - The value is in the different perspectives
**Notes:** Each tool has strengths. Perplexity for research, ChatGPT for broad exploration, Claude for implementation detail. Worth keeping this multi-tool approach.

---

### 2025-01-16 - [DECISION] Edge Functions vs External Worker
**Context:** Need to run analysis jobs
**Action:** Initially chose Supabase Edge Functions for Phase 0-1, with option to move to external worker for Phase 2+
**Time spent:** N/A (part of PRD)
**Automation opportunity:** None
**Notes:** Edge Functions have 60s timeout. Fine for < 1000 commits. Will need worker for large repos.

**UPDATE (2026-01):** Migrated to **Inngest** as primary job processor with standalone worker as fallback. Inngest provides better observability, automatic retries, and serverless scaling. See `docs/architecture/inngest-integration.md`.

---

### 2025-01-16 - [INSIGHT] Workflow templates should be portable
**Context:** Realized the workflow capture system could help other projects
**Action:** Created `templates/` directory with generic versions of Workflow.md, WorkflowJournal.md, and Agents.md that can be copied to any repo
**Time spent:** 10 minutes
**Automation opportunity:** High - Could be a `kickstart` CLI command or GitHub template repo
**Notes:** Each project using these templates contributes learnings. This is the start of a personal development automation toolkit.

---

### 2025-01-16 - [DECISION] Monorepo structure with Turborepo
**Context:** Needed to support web app + worker + shared packages
**Action:** Restructured project as Turborepo monorepo:
- `apps/web` - Next.js web app (Vercel)
- `apps/worker` - Background job processor (Fly.io/Render)
- `packages/core` - Shared analysis logic and types
- `packages/db` - Supabase client and generated types
**Time spent:** 15 minutes
**Automation opportunity:** High - This structure could be a project template
**Notes:** Key insight from architecture review: don't do heavy git analysis in Vercel functions. Use external worker for cloning and compute. Supabase Edge Functions only for lightweight GitHub API-based analysis.

---

### 2025-01-16 - [REPETITIVE] Created shared package structure
**Context:** Need shared types and utilities across web and worker
**Action:** Created @bolokono/core with analysis types, classification logic, and utilities. Created @bolokono/db with Supabase client and type exports.
**Time spent:** 10 minutes
**Automation opportunity:** High - Package templates with standard structure
**Notes:** Same pattern used in other monorepos. Could be a generator script.

---

## Pending Entries

*Add items here during development, then format them properly:*

- [ ] Vercel project creation
- [ ] Environment variable setup
- [ ] Next.js initialization
- [ ] Supabase local setup
- [ ] First migration creation
- [ ] OAuth configuration

---

## Summary Statistics

*Updated periodically:*

| Tag | Count | Total Time | High Automation |
|-----|-------|------------|-----------------|
| MANUAL | 2 | ~5 min | 2 |
| REPETITIVE | 2 | ~11 min | 2 |
| FRICTION | 0 | - | - |
| INSIGHT | 1 | - | - |
| DECISION | 1 | - | - |

---

## Patterns Emerging

*Observations that might inform the playbook:*

1. **Documentation setup is highly templatable** - PRD structure, Agents.md base, Workflow.md are all reusable
2. **Infrastructure creation is manual but scriptable** - GitHub, Supabase, Vercel all have CLIs/APIs
3. **Multi-tool ideation is valuable** - Different AI tools contribute differently; keep this human-driven

---

*Last updated: 2025-01-16*
