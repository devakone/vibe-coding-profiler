# Personal Claude Configuration (Template)

Copy this file to `CLAUDE.local.md` and fill in your personal configuration.
The `CLAUDE.local.md` file is gitignored and will not be committed.

---

## Supabase Project References

| Environment | Project Ref | Dashboard URL | Branch |
|-------------|-------------|---------------|--------|
| Local | N/A | `npm run supabase:start` → http://127.0.0.1:54323 | - |
| Development | `<YOUR_DEV_PROJECT_REF>` | https://supabase.com/dashboard/project/<YOUR_DEV_PROJECT_REF> | `develop` |
| Production | `<YOUR_PROD_PROJECT_REF>` | https://supabase.com/dashboard/project/<YOUR_PROD_PROJECT_REF> | `main` |

### Quick Link Commands

```bash
# Link to development
npx supabase link --project-ref <YOUR_DEV_PROJECT_REF>

# Link to production
npx supabase link --project-ref <YOUR_PROD_PROJECT_REF>
```

---

## Test Credentials

### Local Dev Test User

| Field | Value |
|-------|-------|
| Email | `your-test-email@example.com` |
| Password | `YourTestPassword123!` |

---

## Personal Workflow Preferences

Add any personal workflow preferences here, such as:
- Preferred editor settings
- Custom scripts you use
- Personal reminders or notes

---

## MCP Tool Configurations

If you have specific MCP tools configured, document them here for reference.
