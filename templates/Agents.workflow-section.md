# Workflow Capture Section for Agents.md

> **Add this section to your project's `docs/Agents.md` file.**
> Delete this notice after copying.

---

## Workflow Capture

**IMPORTANT:** This project tracks the development process to improve future workflows.

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
| `docs/Workflow.md` | The playbook—how projects are started |
| `docs/WorkflowJournal.md` | Real-time capture during this project |

The journal feeds insights back into the playbook. Over time, high-automation-opportunity items become scripts or templates.
