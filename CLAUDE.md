# Claude Instructions

Follow the instructions in [Agents.md](./Agents.md) for all project work.

This file ensures Claude Code automatically loads the agent-agnostic instructions that work with any AI assistant.

## Claude-Specific Notes

- Use `CLAUDE.local.md` for personal configuration (gitignored)
- The `.claude/settings.local.json` file contains permission overrides

## Local Overrides

Create a `CLAUDE.local.md` file (gitignored) for:
- Specific Supabase project references
- Test credentials
- Personal workflow preferences
- MCP tool configurations

See `CLAUDE.local.example.md` for a template.
