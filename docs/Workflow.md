# AI-Assisted Project Kickstart Playbook

**Purpose:** Capture how I start new projects so I can automate and refine the process over time.

**Living document:** This playbook evolves with each project. What starts as manual steps becomes scripts, templates, and agent prompts.

---

## Current Process (v1)

### Phase 1: Ideation & Requirements

| Step | Current Method | Automation Potential |
|------|---------------|---------------------|
| 1.1 | Draft idea across multiple AI tools (Perplexity, ChatGPT, Claude) | Medium - could create a structured prompt template |
| 1.2 | Iterate on concept, compare outputs | Low - human judgment needed |
| 1.3 | Consolidate into final PRD | High - PRD template + refinement prompt |

**Time spent:** Variable (hours to days)

**Artifacts produced:**
- Initial concept notes
- PRD draft (from preferred AI)
- Final PRD (refined in Claude Code)

---

### Phase 2: Documentation Setup

| Step | Current Method | Automation Potential |
|------|---------------|---------------------|
| 2.1 | Refine PRD in Claude Code with implementation details | Medium - PRD expansion prompt |
| 2.2 | Create Agents.md with project-specific rules | High - base template + customization |
| 2.3 | Create Workflow.md (this file) | High - template |

**Time spent:** ~30 minutes

**Artifacts produced:**
- `docs/PRD.md`
- `docs/Agents.md`
- `docs/Workflow.md`

---

### Phase 3: Infrastructure Setup

| Step | Current Method | Automation Potential |
|------|---------------|---------------------|
| 3.1 | Create GitHub repository (manual) | High - `gh repo create` |
| 3.2 | Create Supabase project (manual) | Medium - Supabase CLI or API |
| 3.3 | Create Vercel project (manual) | High - `vercel` CLI |
| 3.4 | Configure environment variables (manual) | High - `.env.example` + script |
| 3.5 | Link services together | Medium - scripted setup |

**Time spent:** ~20-30 minutes

**Artifacts produced:**
- GitHub repo with initial commit
- Supabase project (dev environment)
- Vercel project linked to repo
- `.env.local` configured

---

### Phase 4: Project Scaffolding

| Step | Current Method | Automation Potential |
|------|---------------|---------------------|
| 4.1 | Initialize Next.js project | High - `create-next-app` with preset |
| 4.2 | Configure Tailwind, shadcn/ui | High - scripted |
| 4.3 | Set up Supabase client | High - template files |
| 4.4 | Create initial database schema | Medium - from PRD data model |
| 4.5 | Set up auth flow | High - template |

**Time spent:** ~1-2 hours

**Artifacts produced:**
- Working Next.js app
- Database schema migration
- Auth flow working

---

### Phase 5: Feature Implementation

| Step | Current Method | Automation Potential |
|------|---------------|---------------------|
| 5.1 | Create implementation tracker from PRD | High - extraction prompt |
| 5.2 | Work with AI agents on each phase | Low - human oversight needed |
| 5.3 | Review, test, iterate | Low - human judgment |
| 5.4 | Deploy to preview/production | High - CI/CD |

**Time spent:** Variable (days to weeks)

---

## Automation Targets

### High Priority (Automate First)

1. **Project scaffold script**
   - Create GitHub repo
   - Initialize Next.js with my preferred config
   - Set up Supabase locally
   - Generate `.env.example` and `.env.local` templates
   - Create initial file structure

2. **Documentation templates**
   - PRD template with standard sections
   - Agents.md base template
   - Workflow.md template

3. **Environment setup**
   - Vercel project creation + linking
   - Environment variable scaffolding

### Medium Priority (Template + Customize)

1. **PRD expansion prompt** - Take rough idea → full PRD
2. **Database schema generator** - PRD data model → SQL migration
3. **Supabase project creation** - Via management API

### Low Priority (Keep Manual)

1. Initial ideation across AI tools
2. Final human review of generated code
3. Product decisions and tradeoffs

---

## Metrics to Track

As I build projects, capture:

| Metric | Why It Matters |
|--------|---------------|
| Time from idea to first commit | Overall efficiency |
| Time on manual setup tasks | Automation opportunities |
| Number of AI agent turns per feature | Prompt quality |
| Errors caught in review | Agent reliability |
| Steps repeated across projects | Template candidates |

---

## Future Vision

**Goal:** Reduce project kickstart from hours to minutes.

```
Input: Project idea + type (SaaS, CLI, API, etc.)
Output:
  - GitHub repo with scaffold
  - Supabase project configured
  - Vercel project linked
  - PRD + Agents.md generated
  - First migration ready
  - Ready for feature implementation
```

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| v1 | 2025-01-16 | Initial process capture from Bolokono kickstart |

---

*This document is the source of truth for how I start projects. Update it as the process improves.*
