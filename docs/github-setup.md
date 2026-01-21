# GitHub Setup

This document summarizes what you need to do before you can authenticate via GitHub and analyze repositories in Vibed Coding.

## 1. Create a GitHub OAuth App

1. Open GitHub → Settings → Developer settings → OAuth Apps → **New OAuth App**.
2. Fill in the required URLs for local development:
   - **Application name:** e.g., `Vibed Coding Local`
   - **Homepage URL:** `http://localhost:8108`
   - **Authorization callback URL:** `http://localhost:54421/auth/v1/callback`
3. Save the Client ID and Client Secret; you will store both in your local environment file (`.env.local`).

## 2. Enable GitHub as a Supabase Auth Provider

This project relies on Supabase Auth using GitHub OAuth (see `docs/PRD.md`).

1. Start your local Supabase stack if it is not running: `npm run supabase:start`.
2. Open Supabase Studio at `http://127.0.0.1:54323` and navigate to **Authentication → Providers → GitHub**.
3. Paste the Client ID and Client Secret from the OAuth app you created above.
4. Select scopes required for private repo access (at least `repo` and `read:user`).

## 3. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in the required values (see `docs/Agents.md` for the list). At minimum for GitHub/Supabase auth locally:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54421
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from `npx supabase status`>
SUPABASE_SERVICE_ROLE_KEY=<from `npx supabase status`>
GITHUB_CLIENT_ID=<from GitHub OAuth app>
GITHUB_CLIENT_SECRET=<from GitHub OAuth app>
NEXT_PUBLIC_APP_URL=http://localhost:8108
```

Add `ANTHROPIC_API_KEY` only when you intend to run the worker that generates narratives.

## 4. Workflow Notes

- **Start the Next.js dev server manually** when asked (`npm run dev`).
- **Don't store GitHub tokens in your code**; Supabase stores them encrypted in `github_accounts` (see schema in the PRD).
- **Before touching auth** always confirm Supabase is running (`npx supabase status`).

Once Supabase GitHub auth is enabled and your `.env.local` matches, the app can redirect to Supabase’s OAuth flow, persist the encrypted token, and allow repo sync/analysis.

## 5. Suggested Fields When Registering Integrations

When you create a new OAuth app or Supabase account (GitHub, Supabase service credentials, Claude API, etc.), capture the following metadata so operations are reproducible:

| Integration | Field | Suggested value / tip |
|-------------|-------|-----------------------|
| GitHub OAuth App | Application name | "Vibed Coding Local" or "Vibed Coding Dev" |
|  | Homepage URL | `http://localhost:8108` (local) / production URL when ready |
|  | Authorization callback URL | `http://localhost:54421/auth/v1/callback` |
|  | Client ID / Client Secret | Store securely (env file, vault) |
| Supabase Auth provider | Client ID / Secret | Same values as above |
|  | Scopes | `repo`, `read:user`, `user:email` (minimum for repo access) |
| Supabase Service Role | Project ref | `ljxvzqjkwwwsgdnvgpgm` for dev/preview, `idjewtwnfrufbxoxulmq` for prod |
|  | Key name | e.g., `service_role_key` (copy to `SUPABASE_SERVICE_ROLE_KEY`) |
| Claude / Anthropic | API key | Store securely; only worker needs access |
| GitHub Repository | Name / slug | Record `owner/name` when connecting (match Supabase `repos.full_name`) |
| Local env file | File path | `.env.local` (ignored by git) |

Keep a secure note of each value and indicate whether it is tied to local, dev, or prod so you can update `.env.local`, Supabase settings, or deployment secrets consistently. If your workflow involves creating additional apps (e.g., for CI/CD), follow similar conventions for naming, callback URLs, and storage location.
