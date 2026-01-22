# PRD: LLM Provider Abstraction & User API Keys

**Status:** Draft
**Author:** Claude
**Date:** 2026-01-18
**Implementer:** AI Agent (Claude Code)

---

## Overview

Vibe Coding Profile uses LLM (currently Anthropic Claude) to generate narrative reports from commit analysis. Currently, the platform bears all LLM costs using a single hardcoded API key. This PRD introduces:

1. **Provider-agnostic LLM layer** - Support multiple LLM providers (Anthropic, OpenAI, etc.)
2. **User-provided API keys** - Users can supply their own keys to unlock LLM features
3. **Free tier limits** - 1 free LLM-generated report per repo, then metrics-only or BYOK
4. **Admin-configurable defaults** - Admins can set platform-wide LLM provider/key
5. **Sponsored credits** - Future support for companies sponsoring LLM credits

---

## Goals

| Goal | Description |
|------|-------------|
| **Cost control** | Platform doesn't bear unlimited LLM costs |
| **User choice** | Users can bring their own keys for unlimited LLM access |
| **Provider flexibility** | Not locked to Anthropic; can switch/add providers |
| **Security** | API keys encrypted at rest, never exposed to client |
| **Open source ready** | Self-hosters can configure their own LLM providers |

### Non-Goals (v1)

- Usage metering/billing (future)
- Multiple simultaneous providers per request
- Fine-tuned/custom models
- Streaming responses

---

## User Stories

### Free Tier

1. **As a new user**, I get 1 free LLM-generated narrative per repo so I can see the full experience.

2. **As a user who has used my free analysis**, subsequent "Regenerate Story" calls fall back to metrics-only narrative with a prompt to add my API key.

3. **As a user**, I can see how many free LLM analyses I have remaining.

### Bring Your Own Key (BYOK)

4. **As a user**, I can add my Anthropic API key in settings to unlock unlimited LLM narratives.

5. **As a user**, I can add my OpenAI API key as an alternative provider.

6. **As a user**, my API key is stored securely and never shown in full after saving.

7. **As a user**, I can remove/rotate my API key at any time.

8. **As a user**, I can choose which provider to use if I have multiple keys configured.

### Admin Configuration

9. **As an admin**, I can configure the platform's default LLM provider and API key.

10. **As an admin**, I can set the free tier limit (default: 1 per repo).

11. **As an admin**, I can disable LLM features entirely (metrics-only mode).

12. **As an admin**, I can view LLM usage stats (calls, tokens, errors) without seeing keys.

### Future: Sponsored Credits

13. **As a company**, I can sponsor LLM credits for users (tracked separately).

---

## LLM Provider Abstraction

### Supported Providers (v1)

| Provider | Models | Notes |
|----------|--------|-------|
| **Anthropic** | claude-sonnet-4-*, claude-haiku-* | Current default |
| **OpenAI** | gpt-4o, gpt-4o-mini | Popular alternative |
| **Google Gemini** | gemini-2.0-flash, gemini-1.5-pro | Cost-effective option |

### Provider Interface

```typescript
// packages/core/src/llm/types.ts

export type LLMProvider = "anthropic" | "openai" | "gemini";

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  finishReason: "stop" | "length" | "error";
}

export interface LLMClient {
  chat(messages: LLMMessage[]): Promise<LLMResponse>;
  validateKey(): Promise<{ valid: boolean; error?: string }>;
}
```

### Provider Implementations

```typescript
// packages/core/src/llm/anthropic.ts
export class AnthropicClient implements LLMClient {
  constructor(private config: LLMConfig) {}

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    // POST https://api.anthropic.com/v1/messages
    // Convert messages to Anthropic format (system separate from messages)
  }

  async validateKey(): Promise<{ valid: boolean; error?: string }> {
    // Minimal API call to verify key works
  }
}

// packages/core/src/llm/openai.ts
export class OpenAIClient implements LLMClient {
  constructor(private config: LLMConfig) {}

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    // POST https://api.openai.com/v1/chat/completions
    // Messages format matches OpenAI natively
  }

  async validateKey(): Promise<{ valid: boolean; error?: string }> {
    // Minimal API call to verify key works
  }
}

// packages/core/src/llm/gemini.ts
export class GeminiClient implements LLMClient {
  constructor(private config: LLMConfig) {}

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    // POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
    // Convert messages to Gemini "contents" format
    // System message → systemInstruction field
  }

  async validateKey(): Promise<{ valid: boolean; error?: string }> {
    // GET https://generativelanguage.googleapis.com/v1beta/models?key={key}
  }
}

// packages/core/src/llm/index.ts
export function createLLMClient(config: LLMConfig): LLMClient {
  switch (config.provider) {
    case "anthropic": return new AnthropicClient(config);
    case "openai": return new OpenAIClient(config);
    case "gemini": return new GeminiClient(config);
    default: throw new Error(`Unknown provider: ${config.provider}`);
  }
}
```

### Model Mapping

```typescript
// packages/core/src/llm/models.ts

export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  anthropic: "claude-sonnet-4-20250514",
  openai: "gpt-4o",
  gemini: "gemini-2.0-flash",
};

export const FALLBACK_MODELS: Record<LLMProvider, string[]> = {
  anthropic: ["claude-3-haiku-20240307"],
  openai: ["gpt-4o-mini"],
  gemini: ["gemini-1.5-flash"],
};

export const PROVIDER_INFO: Record<LLMProvider, { name: string; keyPrefix: string; keyUrl: string }> = {
  anthropic: {
    name: "Anthropic",
    keyPrefix: "sk-ant-",
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  openai: {
    name: "OpenAI",
    keyPrefix: "sk-",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  gemini: {
    name: "Google Gemini",
    keyPrefix: "AIza",
    keyUrl: "https://aistudio.google.com/app/apikey",
  },
};
```

---

## Data Model

### New: `llm_configs` table (Admin settings)

```sql
CREATE TABLE llm_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Config scope
  scope TEXT NOT NULL CHECK (scope IN ('platform', 'user', 'sponsor')),
  scope_id UUID, -- user_id for 'user' scope, sponsor_id for 'sponsor', NULL for 'platform'

  -- Provider settings
  provider TEXT NOT NULL CHECK (provider IN ('anthropic', 'openai', 'gemini')),
  api_key_encrypted TEXT NOT NULL,
  model TEXT,

  -- Metadata
  label TEXT, -- User-friendly name, e.g., "My Anthropic Key"
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (scope, scope_id, provider)
);

-- RLS: Users can only see/manage their own keys
ALTER TABLE llm_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own llm_configs"
  ON llm_configs FOR SELECT
  USING (
    scope = 'user' AND scope_id = auth.uid()
    OR scope = 'platform' -- Platform config visible to all (not the key itself)
  );

CREATE POLICY "Users can insert own llm_configs"
  ON llm_configs FOR INSERT
  WITH CHECK (scope = 'user' AND scope_id = auth.uid());

CREATE POLICY "Users can update own llm_configs"
  ON llm_configs FOR UPDATE
  USING (scope = 'user' AND scope_id = auth.uid());

CREATE POLICY "Users can delete own llm_configs"
  ON llm_configs FOR DELETE
  USING (scope = 'user' AND scope_id = auth.uid());
```

### New: `llm_usage` table (Tracking)

```sql
CREATE TABLE llm_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES analysis_jobs(id) ON DELETE SET NULL,
  repo_id UUID REFERENCES repos(id) ON DELETE SET NULL,

  -- What was used
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  key_source TEXT NOT NULL CHECK (key_source IN ('platform', 'user', 'sponsor')),

  -- Token counts
  input_tokens INTEGER,
  output_tokens INTEGER,

  -- Status
  success BOOLEAN NOT NULL,
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX llm_usage_user_id_idx ON llm_usage(user_id);
CREATE INDEX llm_usage_repo_id_idx ON llm_usage(repo_id);
CREATE INDEX llm_usage_created_at_idx ON llm_usage(created_at);

-- RLS: Users see own usage, admins see all
ALTER TABLE llm_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own llm_usage"
  ON llm_usage FOR SELECT
  USING (user_id = auth.uid());
```

### Modified: `analysis_reports` table

```sql
-- Track which key source was used
ALTER TABLE analysis_reports ADD COLUMN llm_key_source TEXT
  CHECK (llm_key_source IN ('platform', 'user', 'sponsor', 'none'));

-- Track token usage
ALTER TABLE analysis_reports ADD COLUMN llm_input_tokens INTEGER;
ALTER TABLE analysis_reports ADD COLUMN llm_output_tokens INTEGER;
```

---

## Free Tier Logic

### Counting Free Analyses

```typescript
async function countFreeAnalysesUsed(userId: string, repoId: string): Promise<number> {
  const { count } = await supabase
    .from("analysis_reports")
    .select("*", { count: "exact", head: true })
    .eq("job_id.user_id", userId) // Via join
    .eq("job_id.repo_id", repoId)
    .eq("llm_key_source", "platform")
    .neq("llm_model", "none");

  return count ?? 0;
}

async function canUseFreeAnalysis(userId: string, repoId: string): Promise<boolean> {
  const used = await countFreeAnalysesUsed(userId, repoId);
  const limit = await getPlatformSetting("free_llm_analyses_per_repo") ?? 1;
  return used < limit;
}
```

### Key Resolution Order

When generating a narrative, resolve the LLM config in this order:

```typescript
async function resolveLLMConfig(userId: string, repoId: string): Promise<{
  config: LLMConfig | null;
  source: "user" | "platform" | "sponsor" | "none";
  reason: string;
}> {
  // 1. Check if user has their own key configured
  const userConfig = await getUserLLMConfig(userId);
  if (userConfig) {
    return { config: userConfig, source: "user", reason: "user_key" };
  }

  // 2. Check if user has free tier remaining for this repo
  const canUseFree = await canUseFreeAnalysis(userId, repoId);
  if (canUseFree) {
    const platformConfig = await getPlatformLLMConfig();
    if (platformConfig) {
      return { config: platformConfig, source: "platform", reason: "free_tier" };
    }
  }

  // 3. Check for sponsored credits (future)
  // const sponsorConfig = await getSponsorConfig(userId);
  // if (sponsorConfig) { ... }

  // 4. No LLM available - will use metrics fallback
  return {
    config: null,
    source: "none",
    reason: canUseFree ? "no_platform_key" : "free_tier_exhausted"
  };
}
```

---

## API Design

### User API Key Management

```
GET    /api/settings/llm-keys           # List user's configured keys (masked)
POST   /api/settings/llm-keys           # Add new key
DELETE /api/settings/llm-keys/[id]      # Remove key
POST   /api/settings/llm-keys/[id]/test # Test key validity
```

#### Request/Response Examples

**POST /api/settings/llm-keys**
```json
// Request
{
  "provider": "anthropic",
  "apiKey": "sk-ant-...",
  "label": "My Anthropic Key"
}

// Response
{
  "id": "uuid",
  "provider": "anthropic",
  "label": "My Anthropic Key",
  "maskedKey": "sk-ant-...XXXX",
  "isActive": true,
  "createdAt": "2026-01-18T..."
}
```

**GET /api/settings/llm-keys**
```json
{
  "keys": [
    {
      "id": "uuid",
      "provider": "anthropic",
      "label": "My Anthropic Key",
      "maskedKey": "sk-ant-...XXXX",
      "isActive": true,
      "createdAt": "2026-01-18T..."
    }
  ],
  "freeTierStatus": {
    "perRepoLimit": 1,
    "description": "1 free LLM analysis per repo"
  }
}
```

### Admin LLM Configuration

```
GET  /api/admin/llm-config              # Get platform LLM config
POST /api/admin/llm-config              # Set platform LLM config
GET  /api/admin/llm-usage               # Get usage stats
```

### Analysis Endpoints (Modified)

**POST /api/analysis/start** - No change, but internally uses key resolution

**POST /api/analysis/[id]/regenerate-story**
```json
// Response now includes key source info
{
  "report": { ... },
  "story": {
    "llm_used": true,
    "llm_reason": "ok",
    "llm_source": "user",        // NEW: "user" | "platform" | "none"
    "llm_provider": "anthropic", // NEW
    "llm_model": "claude-sonnet-4-20250514"
  }
}

// If free tier exhausted and no user key
{
  "report": { ... },
  "story": {
    "llm_used": false,
    "llm_reason": "free_tier_exhausted",
    "llm_source": "none",
    "prompt_add_key": true  // NEW: UI hint to prompt user
  }
}
```

---

## UI Changes

### Settings Page: LLM Keys

```
┌─────────────────────────────────────────────────────────────────┐
│ Settings > LLM API Keys                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Add your own API key to unlock unlimited LLM-generated reports.  │
│ Your key is encrypted and never shared.                          │
│                                                                  │
│ Free tier: 1 LLM analysis per repo (then metrics-only)          │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Anthropic                                                    │ │
│ │ sk-ant-...7X4m                                    [Remove]   │ │
│ │ Added Jan 18, 2026 · Last used: 2 hours ago                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ [+ Add API Key]                                                  │
│                                                                  │
│ Supported providers: Anthropic, OpenAI, Google Gemini           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Add Key Modal

```
┌─────────────────────────────────────────────────────────────────┐
│ Add API Key                                              [×]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Provider                                                         │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Anthropic ▾]                                               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ API Key                                                          │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ sk-ant-...                                                  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ Get your key at console.anthropic.com                           │
│                                                                  │
│ Label (optional)                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ My Anthropic Key                                            │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│                              [Cancel]  [Test & Save]             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Analysis Page: Free Tier Exhausted

```
┌─────────────────────────────────────────────────────────────────┐
│ Story                                                            │
│                                                                  │
│ ⚠️ LLM narrative unavailable                                     │
│                                                                  │
│ You've used your free LLM analysis for this repo.               │
│ Add your own API key to regenerate with LLM, or continue with   │
│ the metrics-based summary below.                                │
│                                                                  │
│ [Add API Key]  [Use Metrics Only]                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Admin: LLM Configuration

```
┌─────────────────────────────────────────────────────────────────┐
│ Admin > LLM Configuration                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Platform Default                                                 │
│ ────────────────────────────────────────────────────────────    │
│ Provider: [Anthropic ▾]                                         │
│ API Key:  [sk-ant-...XXXX]  [Change]                            │
│ Model:    [claude-sonnet-4-20250514 ▾]                          │
│                                                                  │
│ Free Tier                                                        │
│ ────────────────────────────────────────────────────────────    │
│ Free LLM analyses per repo: [1]                                 │
│ □ Disable LLM features (metrics-only mode)                      │
│                                                                  │
│ Usage (Last 30 days)                                            │
│ ────────────────────────────────────────────────────────────    │
│ Total calls: 1,234                                              │
│ Platform key: 456 (37%)                                         │
│ User keys: 778 (63%)                                            │
│ Total tokens: ~2.4M input, ~890K output                         │
│ Est. cost (platform): $12.34                                    │
│                                                                  │
│                                              [Save Changes]      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Requirements

### API Key Storage

1. **Encryption**: AES-256-GCM (same as GitHub tokens)
2. **Key derivation**: Use separate encryption key from GitHub tokens
3. **Environment variable**: `LLM_KEY_ENCRYPTION_SECRET`

```typescript
// apps/web/src/lib/encryption.ts

// Existing
export function encryptToken(plaintext: string): string { ... }
export function decryptToken(ciphertext: string): string { ... }

// New - separate key for LLM keys
export function encryptLLMKey(plaintext: string): string {
  const secret = process.env.LLM_KEY_ENCRYPTION_SECRET;
  if (!secret) throw new Error("LLM_KEY_ENCRYPTION_SECRET not set");
  // AES-256-GCM encryption
}

export function decryptLLMKey(ciphertext: string): string {
  const secret = process.env.LLM_KEY_ENCRYPTION_SECRET;
  if (!secret) throw new Error("LLM_KEY_ENCRYPTION_SECRET not set");
  // AES-256-GCM decryption
}
```

### Key Masking

```typescript
export function maskApiKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 7) + "..." + key.slice(-4);
}

// "sk-ant-api03-abc123xyz789" → "sk-ant-...x789"
```

### Access Controls

1. **User keys**: Only accessible by the owning user (RLS enforced)
2. **Platform key**: Only readable by service role (server-side)
3. **Admin viewing**: Admins see masked keys only, never plaintext
4. **Audit logging**: Log key additions/removals (not the keys themselves)

### Open Source Considerations

1. **No default keys in code**: All keys via environment variables
2. **Clear documentation**: How to set up your own keys
3. **.env.example**: Document required variables
4. **Fail gracefully**: If no keys configured, metrics-only mode

---

## Implementation Plan (AI Agent Instructions)

### Phase 1: LLM Abstraction Layer

**Goal:** Create provider-agnostic LLM client without changing current behavior.

#### Step 1.1: Create LLM types

**File to create:** `packages/core/src/llm/types.ts`

```typescript
export type LLMProvider = "anthropic" | "openai";

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  finishReason: "stop" | "length" | "error";
}

export interface LLMClient {
  chat(messages: LLMMessage[]): Promise<LLMResponse>;
  validateKey(): Promise<{ valid: boolean; error?: string }>;
}
```

#### Step 1.2: Create Anthropic client

**File to create:** `packages/core/src/llm/anthropic.ts`

Implement `AnthropicClient` class matching the interface.

#### Step 1.3: Create OpenAI client

**File to create:** `packages/core/src/llm/openai.ts`

Implement `OpenAIClient` class matching the interface.

#### Step 1.4: Create Gemini client

**File to create:** `packages/core/src/llm/gemini.ts`

Implement `GeminiClient` class matching the interface.

**Key Gemini API differences:**
- Auth via `?key=` query param, not header
- System message via `systemInstruction` field
- Messages are `contents` with `parts` array
- Response in `candidates[0].content.parts[0].text`

```typescript
// Request format
{
  "systemInstruction": { "parts": [{ "text": "system prompt" }] },
  "contents": [
    { "role": "user", "parts": [{ "text": "user message" }] }
  ],
  "generationConfig": {
    "maxOutputTokens": 1300,
    "temperature": 0.3
  }
}
```

#### Step 1.5: Create factory and exports

**File to create:** `packages/core/src/llm/index.ts`

```typescript
export * from "./types";
export * from "./models";
export { AnthropicClient } from "./anthropic";
export { OpenAIClient } from "./openai";
export { GeminiClient } from "./gemini";

export function createLLMClient(config: LLMConfig): LLMClient {
  switch (config.provider) {
    case "anthropic": return new AnthropicClient(config);
    case "openai": return new OpenAIClient(config);
    case "gemini": return new GeminiClient(config);
    default: throw new Error(`Unknown provider: ${config.provider}`);
  }
}
```

#### Step 1.6: Refactor narrative generation

**File to modify:** `apps/web/src/inngest/functions/analyze-repo.ts`

Update `generateNarrativeWithClaude` to use the abstracted LLM client.

**Acceptance Criteria - Phase 1:**
- [ ] LLM types defined
- [ ] Anthropic client works (same behavior as before)
- [ ] OpenAI client works (new capability)
- [ ] Gemini client works (new capability)
- [ ] Factory function creates correct client for all three providers
- [ ] Existing analysis still works

---

### Phase 2: Database & API for User Keys

**Goal:** Users can add/remove their own API keys.

#### Step 2.1: Create migration for llm_configs

**File to create:** `supabase/migrations/XXXX_create_llm_configs.sql`

#### Step 2.2: Create migration for llm_usage

**File to create:** `supabase/migrations/XXXX_create_llm_usage.sql`

#### Step 2.3: Add encryption utilities

**File to modify:** `apps/web/src/lib/encryption.ts`

Add `encryptLLMKey` and `decryptLLMKey` functions.

#### Step 2.4: Create settings API routes

**Files to create:**
- `apps/web/src/app/api/settings/llm-keys/route.ts` (GET, POST)
- `apps/web/src/app/api/settings/llm-keys/[id]/route.ts` (DELETE)
- `apps/web/src/app/api/settings/llm-keys/[id]/test/route.ts` (POST)

#### Step 2.5: Create settings UI

**File to create:** `apps/web/src/app/settings/llm-keys/page.tsx`

**Acceptance Criteria - Phase 2:**
- [ ] Migrations apply successfully
- [ ] Users can add API keys
- [ ] Keys are encrypted in database
- [ ] Users can test keys before saving
- [ ] Users can remove keys
- [ ] Keys display masked in UI

---

### Phase 3: Free Tier & Key Resolution

**Goal:** Implement free tier limits and key resolution logic.

#### Step 3.1: Create key resolution utilities

**File to create:** `apps/web/src/lib/llm-config.ts`

```typescript
export async function resolveLLMConfig(userId: string, repoId: string): Promise<{
  config: LLMConfig | null;
  source: "user" | "platform" | "sponsor" | "none";
  reason: string;
}>;

export async function canUseFreeAnalysis(userId: string, repoId: string): Promise<boolean>;
export async function countFreeAnalysesUsed(userId: string, repoId: string): Promise<number>;
```

#### Step 3.2: Modify analysis_reports table

**File to create:** `supabase/migrations/XXXX_add_llm_tracking_to_reports.sql`

#### Step 3.3: Update analysis job processing

**File to modify:** `apps/web/src/inngest/functions/analyze-repo.ts`

Use `resolveLLMConfig` instead of hardcoded key.

#### Step 3.4: Update regenerate-story route

**File to modify:** `apps/web/src/app/api/analysis/[id]/regenerate-story/route.ts`

Use `resolveLLMConfig` and track usage.

#### Step 3.5: Update analysis UI

**File to modify:** `apps/web/src/app/analysis/[jobId]/AnalysisClient.tsx`

Show free tier status and prompt to add key when exhausted.

**Acceptance Criteria - Phase 3:**
- [ ] First analysis per repo uses platform key
- [ ] Subsequent analyses require user key or fall back to metrics
- [ ] Usage is tracked in llm_usage table
- [ ] UI shows appropriate messaging

---

### Phase 4: Admin Configuration

**Goal:** Admins can configure platform LLM settings.

#### Step 4.1: Create admin LLM config API

**Files to create:**
- `apps/web/src/app/api/admin/llm-config/route.ts`
- `apps/web/src/app/api/admin/llm-usage/route.ts`

#### Step 4.2: Create admin LLM settings page

**File to create:** `apps/web/src/app/admin/llm/page.tsx`

#### Step 4.3: Add admin navigation

**File to modify:** `apps/web/src/app/admin/page.tsx`

Add link to LLM configuration.

**Acceptance Criteria - Phase 4:**
- [ ] Admins can set platform LLM provider and key
- [ ] Admins can adjust free tier limit
- [ ] Admins can view usage stats
- [ ] Non-admins cannot access admin LLM routes

---

### Phase 5: Polish & Documentation

**Goal:** Production-ready with documentation.

#### Step 5.1: Add environment variable documentation

**File to update:** `apps/web/.env.example`

```env
# LLM Configuration
# Platform default LLM (optional - can be set in admin UI)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=

# Default provider and model (optional - can be set in admin UI)
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-20250514

# Encryption key for user-provided LLM keys (required if users can add keys)
# Generate with: openssl rand -base64 32
LLM_KEY_ENCRYPTION_SECRET=
```

#### Step 5.2: Add setup documentation

**File to create:** `docs/llm-setup.md`

Document how to:
- Set up platform LLM key
- Configure encryption secret
- Self-host without LLM features

#### Step 5.3: Error handling polish

Ensure all LLM errors are user-friendly and don't leak sensitive info.

**Acceptance Criteria - Phase 5:**
- [ ] All env vars documented
- [ ] Setup guide complete
- [ ] Works in metrics-only mode when no keys configured
- [ ] No sensitive data in error messages

---

## Testing Checklist

```bash
# After each phase
npx tsc --noEmit
npx supabase db reset

# Manual tests:
# 1. Existing analysis works (no user key, platform key)
# 2. User can add Anthropic key
# 3. User can add OpenAI key
# 4. User can add Gemini key
# 5. Analysis uses user key when available
# 6. Free tier limit enforced
# 7. Regenerate story uses correct key
# 8. Admin can configure platform key for any provider
# 9. Works with no LLM keys (metrics only)
# 10. Provider switching works (user can choose preferred provider)
```

---

## Security Checklist

- [ ] API keys encrypted with AES-256-GCM
- [ ] Separate encryption key from GitHub tokens
- [ ] Keys never returned in API responses (only masked)
- [ ] RLS policies prevent cross-user key access
- [ ] Server-side decryption only
- [ ] No keys in client-side code
- [ ] Audit log for key operations
- [ ] Rate limiting on key validation endpoint

---

## Open Questions

1. **Token limits per user?** Should we limit tokens/month even with user's own key?
   - *Recommendation:* No limits for BYOK users in v1.

2. **Key validation frequency?** How often to re-validate stored keys?
   - *Recommendation:* Validate on save, then trust until error.

3. **Multiple keys same provider?** Allow users to have multiple Anthropic keys?
   - *Recommendation:* One active key per provider in v1.

4. **Sponsored credits implementation?** Details for company sponsorship?
   - *Recommendation:* Defer to v2, just reserve the data model.
