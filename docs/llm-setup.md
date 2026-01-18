# LLM Setup Guide

This guide explains how to configure LLM (Large Language Model) providers for Vibed Coding. LLM powers the AI-generated narrative reports that accompany commit analysis.

## Overview

Vibed Coding supports three LLM providers:

| Provider | Models | Best For |
|----------|--------|----------|
| **Anthropic** | Claude Sonnet 4, Claude Haiku | High-quality narratives (default) |
| **OpenAI** | GPT-4o, GPT-4o-mini | Popular alternative |
| **Google Gemini** | Gemini 2.0 Flash, Gemini 1.5 Flash | Cost-effective option |

## Quick Start

### 1. Get an API Key

Choose a provider and get an API key:

- **Anthropic**: [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
- **OpenAI**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Google Gemini**: [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

### 2. Configure Environment Variables

Add your API key to `.env.local`:

```bash
# Choose ONE provider for platform-level LLM access
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Or use OpenAI
# OPENAI_API_KEY=sk-your-key-here

# Or use Gemini
# GEMINI_API_KEY=AIza-your-key-here
```

### 3. (Optional) Enable User API Keys (BYOK)

If you want users to be able to add their own API keys:

```bash
# Generate a 32-byte encryption key
openssl rand -base64 32

# Add to .env.local
LLM_KEY_ENCRYPTION_SECRET=your-generated-key-here
```

### 4. Apply Database Migrations

```bash
npx supabase db push
```

---

## Configuration Options

### Platform LLM Key

The platform LLM key is used for:
- Free tier LLM analyses (1 per repo per user)
- Fallback when user keys are not configured

Set via environment variable:

```bash
# Anthropic (recommended)
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514  # Optional: override default

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o  # Optional: override default

# Gemini
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.0-flash  # Optional: override default
```

**Priority order**: If multiple provider keys are set, the first configured provider (in order: Anthropic → OpenAI → Gemini) becomes the primary.

### User API Keys (BYOK)

Users can add their own API keys for unlimited LLM access. This requires encryption configuration:

```bash
# Required for user API key storage
# Generate with: openssl rand -base64 32
LLM_KEY_ENCRYPTION_SECRET=base64-encoded-32-byte-key
```

**Security notes**:
- User keys are encrypted with AES-256-GCM before storage
- Keys are decrypted server-side only when making API calls
- Keys are never exposed to the browser (only masked versions shown)
- This key should be different from `GITHUB_TOKEN_ENCRYPTION_KEY`

### Free Tier Limits

Default: **1 free LLM analysis per repo per user**

After the free analysis:
- Users with their own API key get unlimited LLM narratives
- Users without a key see metrics-only narratives with a prompt to add their key

---

## Running Without LLM

Vibed Coding works without any LLM configuration. When no LLM is available:

1. All narratives use the **metrics-based fallback** (no AI generation)
2. The UI shows "LLM narrative unavailable" with the reason
3. Core functionality (commit analysis, persona detection, vibe axes) works normally

This is useful for:
- Development/testing without API costs
- Self-hosted instances that prefer metrics-only mode
- Privacy-focused deployments

---

## Self-Hosting Checklist

When self-hosting Vibed Coding, configure LLM based on your needs:

### Minimal (No LLM)
```bash
# No LLM variables needed
# All analyses use metrics-only narratives
```

### Platform LLM Only
```bash
# Platform pays for LLM costs
ANTHROPIC_API_KEY=sk-ant-...
```

### BYOK Only (Users Provide Keys)
```bash
# No platform key - users must add their own
LLM_KEY_ENCRYPTION_SECRET=...
```

### Full Setup (Platform + BYOK)
```bash
# Platform key for free tier
ANTHROPIC_API_KEY=sk-ant-...

# User key encryption for BYOK
LLM_KEY_ENCRYPTION_SECRET=...
```

---

## Model Selection

### Default Models

| Provider | Default Model | Fallback Model |
|----------|---------------|----------------|
| Anthropic | `claude-sonnet-4-20250514` | `claude-3-haiku-20240307` |
| OpenAI | `gpt-4o` | `gpt-4o-mini` |
| Gemini | `gemini-2.0-flash` | `gemini-1.5-flash` |

### Overriding Models

Set the `*_MODEL` environment variable to override:

```bash
ANTHROPIC_MODEL=claude-3-haiku-20240307  # Use cheaper model
OPENAI_MODEL=gpt-4o-mini                  # Use mini model
GEMINI_MODEL=gemini-1.5-pro              # Use pro model
```

### Automatic Fallback

If the primary model fails (rate limit, unavailable), the system automatically tries the fallback model before giving up.

---

## Troubleshooting

### "LLM narrative unavailable: missing_api_key"

No LLM provider is configured. Add an API key to `.env.local`.

### "LLM narrative unavailable: free_tier_exhausted"

User has used their free analysis for this repo. They need to:
- Add their own API key at `/settings/llm-keys`
- Or continue with metrics-only narrative

### "LLM narrative unavailable: no_platform_key"

Free tier is available but no platform key is configured. Add `ANTHROPIC_API_KEY` (or another provider) to enable free tier.

### "Invalid API key" when adding user key

The API key validation failed. Check:
- Key is copied correctly (no extra spaces)
- Key matches the selected provider (Anthropic keys start with `sk-ant-`)
- Key has not been revoked

### User keys not working (encryption error)

`LLM_KEY_ENCRYPTION_SECRET` may be misconfigured:
- Ensure it's exactly 32 bytes, base64-encoded
- Generate a new one: `openssl rand -base64 32`
- After changing, existing user keys will need to be re-added

---

## Cost Considerations

### Estimated Costs per Analysis

| Provider | Model | Est. Cost |
|----------|-------|-----------|
| Anthropic | Claude Sonnet 4 | ~$0.01-0.03 |
| Anthropic | Claude Haiku | ~$0.001-0.005 |
| OpenAI | GPT-4o | ~$0.01-0.03 |
| OpenAI | GPT-4o-mini | ~$0.001-0.005 |
| Gemini | 2.0 Flash | ~$0.001-0.005 |

*Costs vary based on commit history size and narrative length.*

### Cost Control Strategies

1. **Use free tier**: 1 analysis per repo limits platform costs
2. **Use cheaper models**: Set `*_MODEL` to haiku/mini/flash variants
3. **BYOK only**: Don't set platform key, require users to bring keys
4. **Metrics only**: Don't configure any LLM for zero cost

---

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use separate encryption keys** for GitHub tokens and LLM keys
3. **Rotate keys regularly** if you suspect compromise
4. **Monitor usage** via provider dashboards
5. **Set spending limits** on provider accounts

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | No* | Anthropic API key |
| `ANTHROPIC_MODEL` | No | Override default Anthropic model |
| `OPENAI_API_KEY` | No* | OpenAI API key |
| `OPENAI_MODEL` | No | Override default OpenAI model |
| `GEMINI_API_KEY` | No* | Google Gemini API key |
| `GEMINI_MODEL` | No | Override default Gemini model |
| `LLM_KEY_ENCRYPTION_SECRET` | No** | 32-byte base64 key for encrypting user API keys |

*At least one provider key recommended for LLM features.
**Required if users can add their own API keys.
