# Inngest Integration

Background job processing for Vibe Coding Profile using [Inngest](https://www.inngest.com/).

## Why Inngest?

| Problem | Old Approach | Inngest Solution |
|---------|--------------|------------------|
| Long-running jobs | Polling worker (always-on VM) | Serverless functions with 2hr timeout |
| GitHub rate limits | Manual retry logic | Built-in backoff and retries |
| Job visibility | Logs only | Real-time dashboard |
| Failure handling | Try/catch + manual DB updates | Automatic `onFailure` hooks |
| Scaling | Manual VM scaling | Auto-scales with Vercel |

**Free tier**: 25,000 function runs/month (more than enough to start).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Vercel                                   │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │ /api/analysis/  │    │ /api/inngest    │◀────────────────┐   │
│  │ start           │    │ (webhook)       │                 │   │
│  └────────┬────────┘    └────────┬────────┘                 │   │
│           │                      │                          │   │
│           │ 1. Create job        │ 3. Execute function      │   │
│           │ 2. Send event        │    (in steps)            │   │
│           ▼                      ▼                          │   │
└───────────┼──────────────────────┼──────────────────────────┼───┘
            │                      │                          │
            ▼                      │                          │
     ┌──────────────┐              │                   ┌──────┴──────┐
     │   Supabase   │◀─────────────┼───────────────────│   Inngest   │
     │   (jobs DB)  │              │                   │   Cloud     │
     └──────────────┘              │                   └─────────────┘
                                   │
                                   ▼
                            ┌──────────────┐
                            │   GitHub     │
                            │   API        │
                            └──────────────┘
```

## Files

```
apps/web/src/
├── inngest/
│   ├── client.ts                    # Inngest client + event types
│   └── functions/
│       ├── index.ts                 # Function exports
│       └── analyze-repo.ts          # Main analysis function
├── app/api/
│   ├── inngest/route.ts             # Inngest webhook endpoint
│   └── analysis/start/route.ts      # Triggers Inngest on job creation
```

## Functions

### `analyze-repo`

Processes a repository analysis job in 5 durable steps:

| Step | Description | Retries on failure? |
|------|-------------|---------------------|
| `load-job-context` | Load job, repo, decrypt GitHub token | Yes |
| `fetch-commit-list` | Get commit list (paginated) | Yes |
| `fetch-commit-details` | Get commits with file paths (compare endpoint) | Yes |
| `compute-analysis` | Run metrics + vibe computation | Yes |
| `save-results` | Write to Supabase, mark job done | Yes |

Each step is **checkpointed** - if the function crashes mid-way, it resumes from the last completed step.

## Event Schema

```typescript
// Defined in apps/web/src/inngest/client.ts
type Events = {
  "repo/analyze.requested": {
    data: {
      jobId: string;
      userId: string;
      repoId: string;
    };
  };
};
```

## Setup

### 1. Vercel Integration (Production)

The easiest way - handles env vars automatically:

1. Go to [Vercel Integrations](https://vercel.com/integrations/inngest)
2. Click **Add Integration**
3. Select your project
4. Done - `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` are auto-configured

### 2. Sync Your App

After deploying, tell Inngest where to find your functions:

1. Go to [app.inngest.com](https://app.inngest.com)
2. Select your app → **Syncs** tab
3. Click **Sync App**
4. Enter your URL: `https://your-app.vercel.app/api/inngest`

### 3. Local Development

Run the Inngest dev server alongside your Next.js app:

```bash
# Terminal 1: Next.js
cd apps/web
npm run dev

# Terminal 2: Inngest dev server
npx inngest-cli@latest dev
```

Open http://localhost:8288 to see the local Inngest dashboard.

The dev server:
- Auto-discovers functions at `http://localhost:8108/api/inngest`
- Provides a UI to view/replay events
- No cloud connection needed

## Environment Variables

| Variable | Required | Set by |
|----------|----------|--------|
| `INNGEST_EVENT_KEY` | Yes | Vercel integration |
| `INNGEST_SIGNING_KEY` | Yes | Vercel integration |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your config |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Your config |
| `GITHUB_TOKEN_ENCRYPTION_KEY` | Yes | Your config |

## Triggering Jobs

Jobs are triggered from `/api/analysis/start`:

```typescript
// After creating the job in Supabase...
await inngest.send({
  name: "repo/analyze.requested",
  data: {
    jobId: row.id,
    userId: user.id,
    repoId: body.repo_id,
  },
});
```

## Monitoring

### Inngest Dashboard

- **Events**: See all events sent
- **Functions**: See function runs, steps, and logs
- **Failures**: Automatic alerts on failures

### Debugging Failed Jobs

1. Go to Inngest dashboard → **Runs**
2. Find the failed run
3. Click to see which step failed and the error
4. Click **Replay** to retry from the failed step

## Error Handling

The function has an `onFailure` hook that marks the job as errored in Supabase:

```typescript
onFailure: async ({ error, event }) => {
  await supabase
    .from("analysis_jobs")
    .update({
      status: "error",
      error_message: error.message,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}
```

## Fallback Worker

The standalone worker (`apps/worker`) serves as a fallback for self-hosted deployments:

| Feature | Inngest | Worker |
|---------|---------|--------|
| Processing model | Event-driven | Polling (5s interval) |
| Platform LLM keys | ✅ | ✅ |
| User API keys (BYOK) | ✅ | ❌ |
| Free tier tracking | ✅ | ❌ |
| LLM usage recording | ✅ | ❌ |
| Automatic retries | ✅ (up to 5) | ❌ |
| Checkpoint/resume | ✅ | ❌ |

**When to use the worker:**
- Self-hosted deployments without Inngest
- Development/testing without Inngest dev server
- Backup if Inngest is unavailable

**Important:** User API keys (BYOK) only work with Inngest. The worker uses platform keys from environment variables exclusively. See [LLM Setup Guide](../llm-setup.md#processing-architecture) for details.

## Rate Limiting

GitHub API calls include rate limit detection:

```typescript
if (res.status === 403) {
  const resetTime = res.headers.get("X-RateLimit-Reset");
  throw new Error(`RATE_LIMITED:${waitMs}`);
}
```

Inngest will automatically retry with backoff when this error is thrown.

## Adding New Functions

1. Create a new file in `apps/web/src/inngest/functions/`
2. Export the function from `index.ts`
3. Add to the serve config in `/api/inngest/route.ts`:

```typescript
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [analyzeRepo, newFunction], // Add here
});
```

4. Sync your app in the Inngest dashboard

## Cost Estimation

| Usage | Runs/Month | Free Tier? |
|-------|------------|------------|
| 100 analyses/day | ~3,000 | Yes |
| 500 analyses/day | ~15,000 | Yes |
| 800 analyses/day | ~24,000 | Yes |
| 1000+ analyses/day | ~30,000+ | Upgrade needed |

Each analysis = 1 function run (steps don't count separately).
