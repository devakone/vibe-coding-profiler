# PRD: Vibed UX — The Pop Version of Developer Analytics

> "Run it once, discover something surprising about yourself, share it with a friend."

---

## TL;DR — The Transformation

| Before | After |
|--------|-------|
| "Analyze your repository" | "Discover your coding vibe" |
| One repo = one result | Multiple repos = richer profile |
| Job IDs in URLs | Human-readable slugs |
| Stats dashboards | Persona-first experience |
| Technical progress bars | Playful "reading your commits" animation |
| Metrics tables | Shareable insight cards |
| "Analysis complete" | Theatrical persona reveal |
| Error codes | Friendly "we hit a snag" messages |
| Developer-speak everywhere | Warm, curious, personality-quiz energy |

**The real value:** Vibed Coding builds a profile of your AI-era coding style across projects. One repo gives you a snapshot. Three repos show patterns. Five repos reveal who you really are when you're building with AI tools.

**The goal:** A developer connects their GitHub, picks a repo, waits 30 seconds, gets a surprising insight, and thinks "I wonder what I'd learn if I added more projects..."

---

## 0.5 The Big Idea: Your AI Coding Profile

### The Core Insight

Vibed Coding isn't about analyzing repos — it's about **understanding how you work with AI tools**. Every commit tells a story about your relationship with AI-assisted coding:

- Do you vibe-code in bursts and clean up later?
- Do you spec things out before letting AI generate?
- Do you treat AI as a pair programmer or a code generator?
- Do you test-first or ship-first?

**One repo is a data point. Multiple repos reveal your actual style.**

### Why Multiple Projects Matter (Honest Framing)

We're not gamifying data collection. We're being honest about statistics:

**One project = one data point.** We can tell you what we see, but we can't know if that's "you" or just "this project."

**Multiple projects = actual patterns.** Now we can say with confidence: "This is how you work, not just how this codebase works."

The framing should be educational, not pushy:

```
[After first analysis — honest insight]

"Based on acme/dashboard, you look like a Prototyper.

But here's the thing — one project might not be the full picture.
Was this a hackathon? A side project? Your day job?

If you're curious whether this is really your style,
try adding a different kind of project."

[Optional: Add another project]
```

**What we should NOT do:**
- ❌ Progress bars that feel like a game to complete
- ❌ "Unlock" language (feels like we're withholding)
- ❌ Pushing users to add more repos
- ❌ Making single-project results feel incomplete

**What we SHOULD do:**
- ✅ Be upfront: "One project = snapshot, multiple = pattern"
- ✅ Let the insight quality speak for itself
- ✅ Make adding more projects feel optional, not required
- ✅ Celebrate single-project insights as valuable on their own

### What We're Actually Detecting

**AI-Era Signals:**
- Presence of AI config files (`.cursorrules`, `.github/copilot`, `CLAUDE.md`)
- Commit patterns that suggest AI-assisted generation (large scaffolds, boilerplate bursts)
- Refactor density (AI tends to generate, humans refactor)
- Test timing (before code = human-driven TDD, after code = AI-generated-then-validated)
- Commit message patterns (AI-suggested vs human-written)
- File scope patterns (AI touches more files in one commit)

**Cross-Project Patterns:**
- "You're a Guardian at work but a Prototyper on side projects"
- "Your style changed 4 months ago — new tools? New job?"
- "Weekend commits are 3x larger than weekday commits"
- "You prototype in Python, ship in TypeScript"

### The Profile Page (New Concept)

Beyond individual repo vibes, users should have an **aggregate profile**:

```
┌─────────────────────────────────────────────────────────────┐
│  YOUR AI CODING PROFILE                                     │
│  Based on 5 projects · 2,341 commits · 8 months of data    │
│                                                             │
│  🎭 PRIMARY VIBE: THE PROTOTYPER                           │
│  "You build to think — code is your sketchpad"             │
│  ████████████████░░░░ 84% confident                        │
│                                                             │
│  🔮 SECONDARY SIGNAL: THE GUARDIAN                         │
│  "...but you clean up before shipping"                      │
│  ████████░░░░░░░░░░░░ 41% of the time                      │
│                                                             │
│  ⚡ YOUR AI STYLE                                           │
│  • Heavy Cursor user (detected .cursorrules in 3 projects) │
│  • Generate-then-refine pattern                             │
│  • Test-after, not test-first                               │
│                                                             │
│  [Share profile]  [Add more projects]  [See breakdown]     │
└─────────────────────────────────────────────────────────────┘
```

### Natural Discovery (Not Pushy)

**After first analysis — curiosity, not pressure:**
```
"You're a Prototyper on acme/dashboard.

Curious if that's your style everywhere, or just here?
Adding another project would tell us more."

[Add another project]  [Maybe later]
```

**When they have multiple projects — show the value:**
```
"With 3 projects, we can see something interesting:
You're a Guardian at work, but a Prototyper on weekends.
Different contexts, different vibes."
```

**What we DON'T show:**
- ❌ "Profile 40% complete" progress bars
- ❌ "Unlock this insight" locked content
- ❌ Achievement badges for adding repos
- ❌ Any language that implies their data is incomplete

**What we DO show:**
- ✅ Genuine additional insights when more data exists
- ✅ Honest explanation of what more data would reveal
- ✅ Clear option to stay with single-project view
- ✅ Respect for users who only want one analysis

### Privacy & Trust First

Important: We're not asking for access to everything. The model is:
- User picks which projects to include
- Each project requires explicit "add to profile" action
- User can remove projects anytime
- We never auto-scan or suggest repos to add

---

## 0. Page Inventory & Transformation Map

Every page in the application must reflect the Vibed personality. Here's the complete transformation:

| Current Page | Current Feel | Vibed Feel | Key Changes |
|--------------|--------------|------------|-------------|
| `/` (Landing) | Technical explainer | Personality quiz invitation | Lead with "What's your vibe?" not "What does Vibed do?" |
| `/` (Dashboard) | Stats dashboard | Profile home base | Show aggregate profile + clarity meter + next actions |
| `/login` | Standard OAuth | Trust-building moment | Emphasize "peek at commits" language, inline security |
| `/repos` | CRUD list | "Build your profile" | Visual commit density, profile clarity progress |
| `/profile` | **NEW** | Your AI coding profile | Aggregate persona across all projects |
| `/vibes` | Job history table | Project breakdown | Individual vibes that feed into profile |
| `/vibe/[slug]` | Technical report | Project vibe detail | Single project insights, "add to profile" CTA |
| `/security` | Dense policy page | Friendly trust page | Conversational tone, visual trust indicators |

**Hidden from users (internal only):**
- Job IDs → Use repo name + date as identifier in URLs
- Status codes → Translate to human phrases
- Error codes → Translate to helpful messages
- Technical timestamps → Relative time ("2 days ago")

---

## 1. The Vision

Vibed Coding should feel like taking a personality quiz that actually knows you — except it's based on real data from your commits. Think BuzzFeed meets Spotify Wrapped for developers. The user should laugh, nod in recognition, screenshot something, and text it to a coworker within 5 minutes of their first analysis.

**What we're NOT building:**
- A performance review tool
- A code quality gate
- Something your manager would use to evaluate you
- A dry metrics dashboard

**What we ARE building:**
- A mirror that shows your coding personality
- A conversation starter about how you work
- Something fun enough to share on Twitter/LinkedIn
- A tool that makes developers feel seen, not judged

## 2. Core Experience Principles

### 2.1 Delight First, Data Second
Every screen should lead with an insight that makes you go "huh, that's interesting" — not a chart. The data is there for the curious, but it's never the first thing you see.

### 2.2 Personality Over Metrics
Instead of "You made 47 commits on Fridays," we say "Friday afternoon is your creative playground." Instead of "Average 3.2 files per commit," we say "You're a focused surgeon, not a sweeping renovator."

### 2.3 Confidence Without Arrogance
Every insight is framed as an observation, not a judgment. "We noticed..." not "You are..." The confidence level is visible but doesn't undermine the fun.

### 2.4 Share-Native Design
If it can't fit in a screenshot, it's too complex. Every key insight should be designed to look good when shared.

## 3. Complete User Flows

### 3.0 Flow Overview

There are two primary flows, optimized for different users:

**Flow A: First-Time User (< 5 minutes to value)**
```
Landing → Sign In → Pick Repo → Wait (~30s) → Reveal → Share
```

**Flow B: Returning User (< 30 seconds to value)**
```
Dashboard → Pick Repo or View History → Done
```

The entire first-time experience should take under 5 minutes from landing to shareable result. Every screen should have exactly ONE primary action.

---

### 3.1 First Contact (Landing Page) — `/`

**Current state:** Technical explanation of what Vibed does, developer-focused language.

**Vibed state:**

```
[Hero Section]
"What's your coding vibe?"

Your commits tell a story. We read it and tell you
what kind of builder you are — with receipts.

[Single CTA button: "Discover my vibe"]

[Below: Animated preview cards cycling through personas]
- "The Architect" — you plan before you build
- "The Prototyper" — you build to think
- "The Guardian" — you test before you trust
- "The Orchestrator" — you conduct the AI symphony
```

**Key changes:**
- Remove all technical jargon from above-the-fold
- Lead with curiosity, not explanation
- Show example personas immediately (social proof of fun output)
- One button, one action

### 3.2 Sign-in (GitHub OAuth)

**Current state:** Standard "Sign in with GitHub" flow

**Vibed state:**

```
[Minimal screen]

"Let's peek at your commits"

We only read commit metadata — messages, timestamps,
file counts. Never your actual code.

[GitHub button: "Connect GitHub"]

[Trust badges below]
- Read-only access
- No code stored
- Delete anytime
```

**Key changes:**
- Reassurance is part of the experience, not a separate page
- Frame it as "peeking" not "analyzing" — friendlier language
- Immediate trust signals

### 3.3 Repo Selection (The "Pick Your Vibe Check" Screen)

**Current state:** List of repos with Connect/Analyze buttons

**Vibed state:**

```
[Header]
"Which project tells your story best?"

Pick a repo you've been active in. The more commits,
the clearer your vibe comes through.

[Repo cards with visual indicators]
┌─────────────────────────────────────────┐
│ acme/dashboard                          │
│ ████████████░░░░░░░░  847 commits      │
│ Last active: 2 days ago                 │
│                      [Get my vibe →]    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ acme/api                                │
│ ████░░░░░░░░░░░░░░░░  124 commits      │
│ Last active: 2 weeks ago                │
│                      [Get my vibe →]    │
└─────────────────────────────────────────┘

[Helper text for low-commit repos]
"Repos with <50 commits may have blurry vibes"
```

**Key changes:**
- Visual commit density indicator (shows which repos have enough data)
- Single-action flow: click = start analysis (no separate Connect step)
- Language frames this as self-discovery, not task execution
- Freshness indicator helps users pick relevant repos

### 3.4 Analysis In Progress (The "Reading Your Commits" Screen)

**Current state:** Technical job status with progress indicators

**Vibed state:**

```
[Animated illustration of commits being "read"]

"Reading between the lines..."

We're scanning your commit patterns to find your vibe.
This usually takes about 30 seconds.

[Animated progress with personality]
✓ Found your late-night coding sessions
✓ Spotted your test-first tendencies
◐ Analyzing your rhythm...
○ Crafting your vibe profile

[Fun fact while you wait]
"Did you know? Friday afternoon is the most common
time for 'experimental' commits across all developers."
```

**Key changes:**
- Progress messages hint at what's being discovered (builds anticipation)
- Fun facts keep users engaged during wait
- Animation/illustration makes it feel alive
- No technical job IDs or status codes visible

### 3.5 The Reveal (Your Vibe Profile)

This is the hero moment. The screen should feel like opening a present.

**Structure:**

```
[SECTION 1: THE PERSONA CARD — Full screen, shareable]
┌─────────────────────────────────────────────────────┐
│                                                     │
│              🎭 You're a...                         │
│                                                     │
│         THE VIBE PROTOTYPER                         │
│                                                     │
│    "You build to think. Code is your sketchpad,    │
│     and shipping is how you learn what works."     │
│                                                     │
│    ████████░░ 78% confidence                        │
│                                                     │
│    [Share this vibe]  [What does this mean?]       │
│                                                     │
└─────────────────────────────────────────────────────┘

[SECTION 2: YOUR HIGHLIGHT REEL — Scrolling cards]

┌──────────────────────┐  ┌──────────────────────┐
│ 🔥 STREAK            │  │ 🌙 YOUR ZONE         │
│                      │  │                      │
│ 23 days              │  │ Friday               │
│ Your longest coding  │  │ 4-7pm                │
│ streak was in March  │  │                      │
│                      │  │ This is when you     │
│ That's dedication.   │  │ ship your best work. │
│                      │  │                      │
│ [Share]              │  │ [Share]              │
└──────────────────────┘  └──────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐
│ ⚡ YOUR STYLE        │  │ 🛡️ YOUR PATTERN      │
│                      │  │                      │
│ Focused surgeon      │  │ Ship then stabilize  │
│                      │  │                      │
│ 2.3 files per commit │  │ You push features,   │
│ avg. You touch what  │  │ then come back to    │
│ needs touching.      │  │ clean up. Bold.      │
│                      │  │                      │
│ [Share]              │  │ [Share]              │
└──────────────────────┘  └──────────────────────┘

[SECTION 3: THE STORY — Your narrative]

"Here's what your commits tell us..."

[Expandable narrative paragraphs with evidence links]

Your March was intense — 23 consecutive days of commits,
mostly in the evenings. You started with scaffolding
(commit abc123) and iterated rapidly...

[Show me the receipts ↓]

[SECTION 4: POWER USER ZONE — Collapsed by default]

[Toggle: "Show me the data"]

→ Expands to full metrics dashboard
→ Timeline visualization
→ Category breakdown charts
→ Raw evidence SHAs
→ Export options
```

**Key changes:**
- Persona reveal is theatrical — full screen, moment of discovery
- Insight cards are designed to be screenshot-friendly
- Each card has its own share button
- Narrative comes after the fun stuff, not before
- Technical deep-dive is opt-in, not default

### 3.6 Share Flow

When user clicks "Share this vibe":

```
[Modal or drawer]

Share your coding vibe

┌─────────────────────────────────────────┐
│  [Preview of share card image]          │
│                                         │
│  THE VIBE PROTOTYPER                    │
│  23-day streak · Friday 4-7pm zone      │
│  vibed.coding                           │
└─────────────────────────────────────────┘

[Download image]  [Copy link]

[One-click share buttons]
- [Twitter/X] prefilled caption + link
- [Facebook] share dialog with link + optional quote
- [LinkedIn] share dialog with link
- [WhatsApp] prefilled caption + link
- [Reddit] prefilled title + link
- [System share] (mobile) uses native share sheet when available

Pre-written caption:
"Just discovered I'm a Vibe Prototyper — I build to
think. What's your coding personality?
vibed.coding #CodingVibe"
```

**Share asset requirements (v1):**
- Export is image-first: PNG download is the default, SVG is optional.
- Provide 3 platform-friendly sizes:
  - OpenGraph / X / LinkedIn: 1200×630 (safe for summary_large_image)
  - Instagram square: 1080×1080
  - Instagram story: 1080×1920
- Maintain a safe area margin (no critical text) of at least 8% of the shorter edge.
- Headline must wrap to max 2 lines with ellipsis if needed.
- Subhead must wrap to max 2 lines with ellipsis if needed.
- Metrics display must remain readable when scaled down to 50% (mobile feed).
- Include a subtle watermark (e.g. `vibed.coding`) that survives cropping.
- Never include raw commit SHAs, file paths, or repo names in share assets by default.

**Share copy requirements (v1):**
- Provide a copyable text summary (headline + subhead + 2–3 metrics + hashtag).
- Provide a short suggested caption optimized for X/LinkedIn (<= 240 chars, includes link).

**Privacy defaults:**
- Sharing is opt-in, and share assets contain only high-level persona/metrics.
- Private repo names are never shown unless the user explicitly enables it per share.

**Success criteria:**
- User can export a PNG that uploads cleanly to X/LinkedIn/Instagram without manual edits.
- Exported assets remain readable after platform recompression.
- No sensitive repository-identifying data appears in the exported image by default.

### 3.7 History & Return Visits

**Current state:** Analysis list with technical job details

**Vibed state:**

```
[Header]
"Your vibe over time"

[Timeline of personas with visual diff]

┌─────────────────────────────────────────────────────┐
│ Jan 2026 · acme/dashboard                           │
│ THE VIBE PROTOTYPER (78%)                          │
│ "Ship fast, learn faster"                           │
│                                          [View →]   │
├─────────────────────────────────────────────────────┤
│ Nov 2025 · acme/api                                 │
│ THE GUARDIAN (82%)                                  │
│ "Test before you trust"                             │
│                                          [View →]   │
├─────────────────────────────────────────────────────┤
│ Sep 2025 · acme/dashboard                           │
│ THE ARCHITECT (71%)                                 │
│ "Plan before you build"                             │
│                                          [View →]   │
└─────────────────────────────────────────────────────┘

[Insight callout]
"Your vibe shifted from Architect to Prototyper over
the past 4 months. Growth phase? New project?
Something changed."
```

**Key changes:**
- Frame history as "vibe evolution" not "job history"
- Show persona transitions as interesting, not concerning
- Surface patterns across analyses

### 3.8 Authenticated Dashboard — `/` (when logged in)

**Current state:** Stats cards showing "Connected repos: 3", "Finished analyses: 5", "Queued or running: 1" with technical job status

**Vibed state — Profile-centric:**

```
[Header — warm, personal greeting]
"Welcome back, Abou"

[HERO: Your AI Coding Profile summary]
┌─────────────────────────────────────────────────────────────┐
│  YOUR AI CODING PROFILE                                     │
│                                                             │
│  🎭 THE PROTOTYPER                                         │
│  "You build to think — code is your sketchpad"             │
│                                                             │
│  Based on 3 projects · 1,247 commits                       │
│                                                             │
│  [See full profile]  [Share]                               │
└─────────────────────────────────────────────────────────────┘

[If analysis running — simple status]
┌─────────────────────────────────────────────────────┐
│  ◐ Reading acme/api... almost done                  │
└─────────────────────────────────────────────────────┘

[Quick actions — no pressure]
┌──────────────────────┐  ┌──────────────────────┐
│  Try another project │  │  Your project vibes  │
│  [Browse projects →] │  │  [See breakdown →]   │
└──────────────────────┘  └──────────────────────┘
```

**First-time state (0 projects):**
```
┌─────────────────────────────────────────────────────────────┐
│  🎭 WHAT'S YOUR CODING VIBE?                               │
│                                                             │
│  Pick a project and we'll show you patterns                │
│  in how you work — based on your commits.                  │
│                                                             │
│  [Choose a project →]                                      │
└─────────────────────────────────────────────────────────────┘

[What you might discover]
• Are you a Prototyper, Guardian, or Architect?
• When do you ship your best work?
• Patterns you didn't know you had
```

**What we're removing:**
- ❌ "Connected repos: 3" counter (who cares?)
- ❌ "Finished analyses: 5" counter (not actionable)
- ❌ "Queued or running: 1" counter (confusing)
- ❌ Job IDs and technical timestamps
- ❌ "Authenticated workspace" language
- ❌ Progress bars, completion meters, locked content
- ❌ Any pressure to add more projects

**What we're adding:**
- ✅ Your vibe as the hero — feels complete as-is
- ✅ Simple context: "Based on X projects"
- ✅ Easy access to add more OR view existing
- ✅ No gamification, no FOMO

### 3.9 Security Page — `/security`

**Current state:** Dense policy text

**Vibed state:**

```
[Header]
"Your code stays yours"

We built Vibed to be paranoid about privacy.
Here's exactly what we access and what we don't.

[Visual trust checklist]
┌─────────────────────────────────────────────────────┐
│ ✓ We READ                │ ✗ We NEVER              │
│                          │                          │
│ • Commit messages        │ • Your actual code       │
│ • Timestamps             │ • File contents          │
│ • File names changed     │ • Pull request diffs     │
│ • Addition/deletion      │ • Issues or comments     │
│   line counts            │ • Your other GitHub data │
└─────────────────────────────────────────────────────┘

[Data lifecycle — visual timeline]

1. You connect → We get read-only GitHub access
2. You analyze → We fetch commit metadata only
3. We process → Patterns computed, stored encrypted
4. You delete → Everything gone within 24 hours

[FAQ accordion]
▸ Can you see my private repos?
▸ Do you store my code?
▸ Who else can see my vibe?
▸ How do I delete my data?

[Footer]
Questions? security@vibed.coding
```

### 3.10 First-Time Onboarding (Inline, Not Separate Wizard)

We don't need a separate onboarding flow. The normal flow IS the onboarding, but with helpful context for first-timers.

**Principles:**
- No modals, no wizards, no step counters
- Inline guidance that disappears after first use
- Every screen works for both new and returning users
- Progress is implicit (you moved forward = you understood)

**First-time contextual hints:**

On Repo Selection (first time):
```
[Hint badge — dismissible]
"💡 Tip: Pick a project you've worked on recently.
More commits = clearer picture of your style."
```

On Analysis Wait (first time):
```
[Hint badge]
"💡 First time? This usually takes 20-40 seconds.
We're reading your last 6 months of commits."
```

On Reveal (first time):
```
[Hint badge]
"💡 This is your coding persona based on patterns
we found. It can change as your style evolves!"
```

### 3.11 Error States (Human-Readable)

**Current:** "Error: Job failed with status code 500"

**Vibed:**

```
[Friendly error card]
┌─────────────────────────────────────────────────────┐
│  😅 We hit a snag                                   │
│                                                     │
│  Something went wrong while reading your commits.   │
│  This usually fixes itself — try again?             │
│                                                     │
│  [Try again]  [Pick different project]              │
│                                                     │
│  Still stuck? Let us know: help@vibed.coding       │
└─────────────────────────────────────────────────────┘
```

**Error translations:**
| Technical | Human |
|-----------|-------|
| 401/403 | "We lost access to your GitHub. Reconnect?" |
| 404 | "We couldn't find that project anymore." |
| 500 | "We hit a snag. Try again?" |
| Timeout | "This is taking longer than usual. Check back soon?" |
| Rate limit | "GitHub is asking us to slow down. Try in a few minutes." |
| No commits | "This project doesn't have enough commits yet." |

### 3.12 Empty States

**No repos connected yet:**
```
"Pick a project to discover your vibe"

Connect your GitHub and choose which project
tells your coding story.

[Connect GitHub]
```

**No analyses yet:**
```
"Your vibe timeline is empty"

Run your first analysis to see your
coding personality take shape.

[Discover my vibe →]
```

**Repo with too few commits:**
```
"This project is still warming up"

We need at least 50 commits to see clear patterns.
This one has 23 — check back when you've shipped more!

[Pick another project]
```

## 4. Language & Tone Guide

### 4.1 Words We Use

| Instead of... | We say... |
|---------------|-----------|
| Analyze | Discover your vibe |
| Metrics | Patterns |
| Job status | Reading your commits |
| Completed | Your vibe is ready |
| Evidence | Receipts |
| Confidence score | How sure we are |
| Commit frequency | Your rhythm |
| Files changed | Your scope |
| Repository | Project |

### 4.2 Tone Examples

**Technical (old):**
> "Analysis complete. 847 commits processed. Persona classification: Iterative Prototyper with 78% confidence based on commit frequency and file scope metrics."

**Vibed (new):**
> "We read 847 commits and the vibe is clear — you're a Prototyper. You build to think, and code is your sketchpad. We're 78% sure about this, based on how often you ship and how focused your changes are."

**Technical (old):**
> "Your average inter-commit time is 4.2 hours with peak activity between 16:00-19:00 on Fridays."

**Vibed (new):**
> "Friday afternoon is your creative playground. When 4pm hits, something clicks and the commits start flowing."

### 4.3 Persona Voice Examples

Each persona has a tagline and a "vibe description":

| Persona | Tagline | Description |
|---------|---------|-------------|
| The Architect | "Plan before you build" | You like to know where you're going before you start walking. Design docs, ADRs, clear structure — then code. |
| The Guardian | "Test before you trust" | Safety nets first, features second. You write the tests, then make them pass. Discipline is your superpower. |
| The Prototyper | "Build to think" | Code is how you explore ideas. Ship it, see what happens, iterate. Perfection can wait. |
| The Orchestrator | "Conduct the symphony" | You coordinate tools, agents, and workflows. One commit might touch ten files because you see the whole board. |
| The Surgeon | "Touch only what matters" | Precise, focused, minimal. Your commits are scalpels, not sledgehammers. |
| The Night Owl | "Best code after dark" | The quiet hours are your productive hours. When the Slack messages stop, the real work begins. |

## 5. Visual Design Direction

### 5.1 Overall Aesthetic
- **Warm, not cold** — gradients over flat colors, rounded corners, soft shadows
- **Playful, not childish** — sophisticated color palette, clean typography
- **Personal, not corporate** — feels like a creative tool, not enterprise software

### 5.2 Color Palette
- Primary gradient: Fuchsia → Indigo → Cyan (existing, keep it)
- Card backgrounds: Soft whites with subtle gradients
- Text: Warm grays (zinc), not pure black
- Accents: Persona-specific colors for share cards

### 5.3 Typography
- Headlines: Bold, slightly playful (current is good)
- Body: Clean, readable, generous line height
- Insights: Slightly larger, pull-quote style

### 5.4 Iconography
- Abstract/geometric over literal
- Each persona gets a unique icon/illustration
- Insight cards get contextual icons (streak = flame, time = moon/sun)

### 5.5 Animation
- Persona reveal: Fade in with slight scale
- Cards: Subtle hover lift
- Progress: Smooth, organic motion
- Share: Confetti or sparkle on successful copy

## 6. Mobile Experience

The entire Vibed experience should work on mobile because:
1. People share from their phones
2. Someone might get a link and open it on mobile
3. The "show a coworker" moment often happens in person with a phone

**Key mobile considerations:**
- Persona card must look good in portrait
- Share images optimized for Instagram Stories aspect ratio
- Touch targets large enough for easy tapping
- Horizontal scroll for insight cards

## 7. Success Metrics

### 7.1 Engagement
- **Time to first share:** < 3 minutes from analysis complete
- **Share rate:** > 20% of completed analyses result in a share action
- **Return rate:** > 30% of users run a second analysis within 30 days

### 7.2 Sentiment
- **Screenshot rate:** Track if users screenshot the persona card
- **Social mentions:** Monitor Twitter/LinkedIn for organic shares
- **Feedback tone:** "Fun," "cool," "interesting" in user feedback

### 7.3 Completion
- **Analysis completion rate:** > 90% of started analyses reach the reveal
- **Bounce rate on reveal:** < 10% (people should explore, not leave)

## 8. URL Structure & Routing

### 8.1 Human-Friendly URLs

**Current (technical):**
```
/analysis/550e8400-e29b-41d4-a716-446655440000
```

**Vibed (friendly):**
```
/vibe/acme-dashboard-jan-2026
```

URL structure: `/vibe/{repo-slug}-{month}-{year}`

If multiple analyses exist for the same repo/month, append a short suffix:
```
/vibe/acme-dashboard-jan-2026-2
```

### 8.2 Route Mapping

| Old Route | New Route | Notes |
|-----------|-----------|-------|
| `/analysis` | `/vibes` | History page |
| `/analysis/[jobId]` | `/vibe/[slug]` | Single vibe page |
| `/repos` | `/projects` | Repo selection |
| `/security` | `/trust` | Optional rename |

### 8.3 Backwards Compatibility

Keep old `/analysis/[jobId]` routes working via redirect:
- User visits `/analysis/550e8400-...`
- Server looks up job, generates slug
- 301 redirect to `/vibe/acme-dashboard-jan-2026`

### 8.4 Share URLs

Share links should be short and memorable:
```
vibed.coding/v/abc123
```

Short code resolves to full vibe page with optional "shared view" mode (read-only, no auth required if owner enabled sharing).

---

## 9. Implementation Phases (Page by Page)

### Phase 1: Foundation & Flow (Week 1-2)

**Goal:** Complete first-time user flow works end-to-end with Vibed UX

| Page | Priority | Changes |
|------|----------|---------|
| `/` (Landing) | P0 | New hero, persona preview, single CTA |
| `/login` | P0 | Inline trust messaging, cleaner layout |
| `/repos` → `/projects` | P0 | Single-click flow, commit density indicators |
| Analysis wait screen | P0 | Friendly progress, fun facts |
| `/analysis/[id]` → `/vibe/[slug]` | P0 | Theatrical persona reveal, insight cards |

**Technical:**
- [ ] Set up new URL routing for `/vibe/[slug]`
- [ ] Create slug generation from job data
- [ ] Build persona card component
- [ ] Build insight card components

### Phase 2: Dashboard & History (Week 3)

**Goal:** Returning users have a delightful home base

| Page | Priority | Changes |
|------|----------|---------|
| `/` (Dashboard) | P0 | Latest vibe hero, quick actions, no stats counters |
| `/analysis` → `/vibes` | P1 | Timeline view, persona evolution |
| Empty states | P1 | All empty states have personality |

**Technical:**
- [ ] Refactor dashboard to persona-centric
- [ ] Build vibe timeline component
- [ ] Implement first-time vs returning user detection

### Phase 3: Share & Polish (Week 4)

**Goal:** Every insight is shareable, errors are friendly

| Page | Priority | Changes |
|------|----------|---------|
| Share modal | P0 | Image generation, pre-written captions |
| `/security` → `/trust` | P1 | Visual trust indicators, FAQ accordion |
| Error states | P1 | Human-readable errors everywhere |
| Loading states | P2 | Skeleton screens with personality |

**Technical:**
- [ ] Implement share image generation (server or client)
- [ ] Build share modal with platform buttons
- [ ] Create error message mapping
- [ ] Add copy-to-clipboard with feedback

### Phase 4: Delight & Refinement (Week 5+)

**Goal:** Polish, animation, and edge cases

| Area | Priority | Changes |
|------|----------|---------|
| Animations | P2 | Reveal animation, card hovers, progress |
| First-time hints | P2 | Contextual tips for new users |
| Mobile optimization | P1 | Touch targets, share image sizing |
| Power user toggle | P2 | "Show me the data" for full metrics |

**Technical:**
- [ ] Add Framer Motion or CSS animations
- [ ] Implement hint system with localStorage
- [ ] Mobile-first responsive pass
- [ ] Build collapsible metrics panel

### Phase 5: Growth & Iteration (Ongoing)

**Goal:** Learn and iterate based on user behavior

- [ ] A/B test persona card designs
- [ ] Add referral mechanics ("See your friend's vibe")
- [ ] Seasonal themes (Year in Code recap)
- [ ] Performance optimization for share images
- [ ] Multi-repo aggregate vibes (if validated)

---

## 10. Open Questions

1. **Should personas have illustrated characters?** More memorable but harder to execute well. Start with abstract icons?

2. **How prominent should confidence be?** Too prominent feels technical; too hidden loses trust. Current thinking: visible but not the headline.

3. **Should we gamify streaks?** "Beat your longest streak" could drive engagement but might feel manipulative. Probably skip for now.

4. **Multi-repo profiles?** Some users want an aggregate vibe across all repos. Cool feature but adds complexity. Phase 2+?

5. **Team vibes?** "Your team is 40% Architects, 30% Prototypers..." Interesting but privacy-sensitive. Needs careful thought.

---

## Appendix: Competitive Inspiration

- **Spotify Wrapped:** The gold standard for making data personal and shareable
- **BuzzFeed Quizzes:** Personality-first, low commitment, high share rate
- **GitHub Skyline:** Beautiful artifact from commit data, highly shareable
- **Wordle:** Simple, daily, screenshot-native sharing pattern
- **Monkeytype:** Makes typing stats feel like a game, not a test

---

*This PRD focuses on the user experience layer. See `PRD-vibed.md` for technical implementation details including database schema, API endpoints, and worker logic.*
