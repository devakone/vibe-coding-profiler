# Security

If you discover a vulnerability affecting Vibe Coding Profiler, please report it directly via email to `security@bolokonon.dev`. We aim to respond within 3 business days and keep communication confidential until a fix is released.

## What to include

- A brief description of the issue and its impact
- Steps to reproduce (logs, commands, payloads)
- Version/commit hash affected
- Contact information for follow-up

## Hardening guidance

- Secrets live only in environment variables (`apps/web/.env.example`). Do not commit `.env` files.
- Supabase enforces row-level security on sensitive tables (`analysis_insights`, `llm_configs`, `llm_usage`, etc.).
- The worker analyzes metadata only; PR bodies, code, and file contents are never persisted.
- Trademark note: **Vibe Coding Profiler**, **Vibed Coding**, **Vibe Coding Profile**, and **VCP** are our registered/common law marks. Please do not reuse them for commercial offerings without permission; the code stays Apache 2.0 open source while the brand remains controlled.

## CI security checks

The security workflow (`.github/workflows/security.yml`) runs on every PR/push to `develop` and `main`:

1. **Dependency audit:** `npm audit --audit-level=moderate` flags vulnerable packages
2. **Secret scanning:** [TruffleHog GitHub Action](https://github.com/trufflesecurity/trufflehog) scans git history for leaked credentials

## Local security scanning

To run TruffleHog locally before pushing:

```bash
# Install (macOS)
brew install trufflehog

# Scan repository
trufflehog git file://. --no-update --json
```

A clean scan shows `"verified_secrets":0,"unverified_secrets":0` in the JSON output.

**Note:** The Python pip version (`pip install trufflehog`) has permission issues on macOS. Use the Homebrew version instead.

See `docs/security/open-source-preparedness.md` for detailed security posture documentation.
