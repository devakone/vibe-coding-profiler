# Workflow Templates

Portable templates for AI-assisted development workflow capture. Copy these to any project to track and improve your development process.

## Quick Start

```bash
# Copy templates to your new project
cp templates/Workflow.template.md your-project/docs/Workflow.md
cp templates/WorkflowJournal.template.md your-project/docs/WorkflowJournal.md
cp templates/Agents.template.md your-project/docs/Agents.md

# Or use curl if templates are in a repo
curl -o docs/Workflow.md https://raw.githubusercontent.com/devakone/bolokonon/main/templates/Workflow.template.md
```

## Templates

| Template | Purpose | Copy To |
|----------|---------|---------|
| `Workflow.template.md` | Project kickstart playbook | `docs/Workflow.md` |
| `WorkflowJournal.template.md` | Real-time action capture | `docs/WorkflowJournal.md` |
| `Agents.template.md` | AI agent instructions | `docs/Agents.md` |
| `Agents.workflow-section.md` | Just the workflow section | Append to existing `Agents.md` |

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    During Development                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   You/Agent does work                                        │
│         │                                                    │
│         ▼                                                    │
│   Is it MANUAL / REPETITIVE / FRICTION / INSIGHT / DECISION?│
│         │                                                    │
│         ▼                                                    │
│   Add entry to WorkflowJournal.md                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    After Project                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Review WorkflowJournal.md patterns                         │
│         │                                                    │
│         ▼                                                    │
│   Update Workflow.md playbook with learnings                │
│         │                                                    │
│         ▼                                                    │
│   Create scripts/templates for high-automation items        │
│         │                                                    │
│         ▼                                                    │
│   Next project starts faster                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Tags Reference

| Tag | When to Use | Example |
|-----|-------------|---------|
| `[MANUAL]` | Did something by hand that could be scripted | Created GitHub repo via web UI |
| `[REPETITIVE]` | Same thing done in other projects | Wrote .gitignore for Next.js |
| `[FRICTION]` | Hit a snag or needed workaround | Supabase CLI version mismatch |
| `[INSIGHT]` | Learned something valuable | Edge Functions have 60s timeout |
| `[DECISION]` | Chose between alternatives | Picked Supabase over Firebase |

## Customization

After copying templates:

1. **Workflow.md** - Fill in project info, check off steps as you complete them
2. **WorkflowJournal.md** - Start logging entries immediately
3. **Agents.md** - Customize the `<!-- CUSTOMIZE -->` sections for your stack

## Entry Format

```markdown
### YYYY-MM-DD HH:MM - [TAG] Short title
**Context:** What were you trying to do?
**Action:** What did you actually do?
**Time spent:** Estimate
**Automation opportunity:** None | Low | Medium | High
**Notes:** Any additional context
```

## Best Practices

1. **Log in real-time** - Don't wait until end of day
2. **Be specific** - "Created .gitignore" not "setup stuff"
3. **Rate automation potential** - This prioritizes what to script next
4. **Review weekly** - Look for patterns across entries
5. **Update playbook** - When you automate something, update Workflow.md

## Future Vision

These templates are step one. The goal is to build toward:

```bash
# Eventually...
kickstart new-project --type saas --stack "nextjs,supabase,vercel"

# Automatically:
# - Creates GitHub repo
# - Scaffolds Next.js with your preferred config
# - Creates Supabase project
# - Links Vercel
# - Generates docs from templates
# - Ready to implement features
```

Each project that uses these templates contributes learnings toward that goal.

---

*Version: 1.0*
*Origin: Bolokono project (github.com/devakone/bolokonon)*
