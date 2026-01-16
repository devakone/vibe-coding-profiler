# AI-Assisted Project Kickstart Playbook

> **Copy this file to `docs/Workflow.md` in any new project.**
> Delete this notice after copying.

**Purpose:** Capture how I start and build projects so I can automate and refine the process over time.

**Living document:** This playbook evolves with each project. What starts as manual steps becomes scripts, templates, and agent prompts.

---

## Project Info

| Field | Value |
|-------|-------|
| Project Name | `<!-- PROJECT_NAME -->` |
| Type | `<!-- SaaS / CLI / API / Library / Other -->` |
| Stack | `<!-- e.g., Next.js, Supabase, Vercel -->` |
| Started | `<!-- YYYY-MM-DD -->` |
| Repo | `<!-- GitHub URL -->` |

---

## My Standard Process

### Phase 1: Ideation & Requirements

| Step | Method | Status |
|------|--------|--------|
| 1.1 Draft idea across AI tools | Perplexity → ChatGPT → Claude | ☐ |
| 1.2 Iterate and refine concept | Human judgment | ☐ |
| 1.3 Produce final PRD | Claude Code refinement | ☐ |

**Artifacts:**
- [ ] `docs/PRD.md`

---

### Phase 2: Documentation Setup

| Step | Method | Status |
|------|--------|--------|
| 2.1 Expand PRD with implementation details | Claude Code | ☐ |
| 2.2 Create Agents.md | From template + customize | ☐ |
| 2.3 Create Workflow.md | This file | ☐ |
| 2.4 Create WorkflowJournal.md | From template | ☐ |

**Artifacts:**
- [ ] `docs/PRD.md` (expanded)
- [ ] `docs/Agents.md`
- [ ] `docs/Workflow.md`
- [ ] `docs/WorkflowJournal.md`

---

### Phase 3: Infrastructure Setup

| Step | Method | Status |
|------|--------|--------|
| 3.1 Create GitHub repository | `gh repo create` or manual | ☐ |
| 3.2 Create database project | Supabase dashboard / CLI | ☐ |
| 3.3 Create hosting project | Vercel CLI or dashboard | ☐ |
| 3.4 Configure environment variables | `.env.local` from template | ☐ |
| 3.5 Link services together | Manual | ☐ |

**Artifacts:**
- [ ] GitHub repo with initial commit
- [ ] Database project created
- [ ] Hosting project linked
- [ ] `.env.local` configured

---

### Phase 4: Project Scaffolding

| Step | Method | Status |
|------|--------|--------|
| 4.1 Initialize framework | `create-next-app` / etc. | ☐ |
| 4.2 Configure styling | Tailwind, shadcn/ui | ☐ |
| 4.3 Set up database client | Supabase client | ☐ |
| 4.4 Create initial schema | From PRD data model | ☐ |
| 4.5 Set up auth flow | Template | ☐ |

**Artifacts:**
- [ ] Working app scaffold
- [ ] Database migration applied
- [ ] Auth flow functional

---

### Phase 5: Feature Implementation

| Step | Method | Status |
|------|--------|--------|
| 5.1 Create implementation tracker | From PRD | ☐ |
| 5.2 Implement features with AI agents | Iterative | ☐ |
| 5.3 Review and test | Human oversight | ☐ |
| 5.4 Deploy | CI/CD | ☐ |

**Artifacts:**
- [ ] `docs/implementation-tracker.md`
- [ ] Working features
- [ ] Deployed to production

---

## Automation Opportunities

*Track items that could be automated. Update as you learn.*

| Item | Current | Could Be | Priority |
|------|---------|----------|----------|
| GitHub repo creation | Manual | `gh repo create` | High |
| Project scaffold | Manual | Script | High |
| .gitignore | Copy/paste | Template | High |
| Agents.md | Copy/adapt | Template | High |
| Database schema | Write SQL | Generate from PRD | Medium |
| Auth setup | Copy/adapt | Template | Medium |

---

## Friction Log

*Quick notes on things that slowed you down. Details go in WorkflowJournal.md.*

- <!-- Add friction points here as you encounter them -->

---

## Decisions Made

*Key choices and why. Reference WorkflowJournal.md for details.*

| Decision | Choice | Why |
|----------|--------|-----|
| <!-- e.g., Database --> | <!-- e.g., Supabase --> | <!-- e.g., Auth + DB + Realtime in one --> |

---

## Metrics

*Fill in at project end to inform future estimates.*

| Metric | Value |
|--------|-------|
| Time: Idea to first commit | |
| Time: Setup (infra + scaffold) | |
| Time: First feature working | |
| Time: MVP complete | |
| Manual steps that should be automated | |
| Journal entries logged | |

---

## Retrospective

*Fill in at project end or major milestone.*

### What worked well?
-

### What was painful?
-

### What will I automate before next project?
-

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `docs/WorkflowJournal.md` | Real-time capture of actions |
| `docs/PRD.md` | Product requirements |
| `docs/Agents.md` | AI agent instructions |

---

*Template version: 1.0*
