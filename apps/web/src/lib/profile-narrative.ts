/**
 * Profile Narrative Generation
 *
 * Generates LLM-powered narratives for aggregated Vibed profiles.
 */

import {
  createLLMClient,
  type LLMProvider,
  type AggregatedProfile,
  type VibeAxes,
  type VibePersona,
} from "@vibe-coding-profiler/core";

function safeJsonParse(value: string): unknown {
  try {
    const trimmed = value.trim();
    if (trimmed.startsWith("```")) {
      const firstNewline = trimmed.indexOf("\n");
      const afterFence = firstNewline === -1 ? "" : trimmed.slice(firstNewline + 1);
      const endFence = afterFence.lastIndexOf("```");
      const inside = (endFence === -1 ? afterFence : afterFence.slice(0, endFence)).trim();
      return JSON.parse(inside) as unknown;
    }
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}

/**
 * Profile narrative structure
 */
export interface ProfileNarrative {
  summary: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
  highlights: Array<{
    label: string;
    value: string;
    interpretation: string;
  }>;
}

/**
 * Result from profile narrative generation including token usage
 */
export interface ProfileNarrativeResult {
  narrative: ProfileNarrative;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Generate a fallback narrative without LLM (deterministic).
 */
export function toProfileNarrativeFallback(params: {
  persona: VibePersona;
  axes: VibeAxes;
  totalCommits: number;
  totalRepos: number;
  repoBreakdown: AggregatedProfile["repoBreakdown"];
}): ProfileNarrative {
  const { persona, axes, totalCommits, totalRepos, repoBreakdown } = params;

  const dominantAxis = Object.entries(axes).reduce((a, b) =>
    a[1].score > b[1].score ? a : b
  );

  const repoSummary = repoBreakdown
    .slice(0, 3)
    .map((r) => `${r.repoName} (${r.personaName})`)
    .join(", ");

  return {
    summary: `Across ${totalRepos} repositories and ${totalCommits} commits, you demonstrate a ${persona.name} coding style with ${persona.confidence} confidence.`,
    sections: [
      {
        title: "Your Coding Identity",
        content: `Your aggregated profile shows you as a ${persona.name}. ${persona.tagline}. This pattern emerges consistently across your analyzed repositories.`,
      },
      {
        title: "Dominant Trait",
        content: `Your strongest characteristic is ${dominantAxis[0].replace(/_/g, " ")} with a score of ${dominantAxis[1].score}/100. ${dominantAxis[1].why[0] ?? ""}`,
      },
      {
        title: "Repository Breakdown",
        content: repoSummary
          ? `Your style varies across projects: ${repoSummary}${repoBreakdown.length > 3 ? ` and ${repoBreakdown.length - 3} more` : ""}.`
          : "No repository breakdown available.",
      },
    ],
    highlights: [
      {
        label: "Total Commits",
        value: String(totalCommits),
        interpretation: "Commits analyzed across all repositories",
      },
      {
        label: "Repositories",
        value: String(totalRepos),
        interpretation: "Number of repositories contributing to your profile",
      },
      {
        label: "Confidence",
        value: persona.confidence,
        interpretation: "How strongly your pattern matches the persona criteria",
      },
    ],
  };
}

/**
 * Generate a profile narrative using LLM.
 */
export async function generateProfileNarrativeWithLLM(params: {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  profile: AggregatedProfile;
}): Promise<ProfileNarrativeResult | null> {
  const { provider, apiKey, model, profile } = params;

  const systemPrompt = [
    "You write a personalized narrative about a developer's SOFTWARE ENGINEERING PATTERNS based on their aggregated profile data.",
    "The profile is computed from multiple repository analyses and represents their overall coding identity.",
    "",
    "PRIVACY RULES (CRITICAL - VIOLATION MEANS FAILURE):",
    "- NEVER mention project names, product names, or repository names",
    "- NEVER infer or mention what products, apps, or features the developer builds",
    "- NEVER reference business domains, industries, or product categories",
    "- Repository identifiers (Repo1, Repo2, etc.) are anonymized - do not try to interpret them",
    "- Focus ONLY on: development rhythm, iteration patterns, testing approach, code organization, shipping cadence",
    "",
    "ALLOWED TOPICS:",
    "- How they iterate (small vs large commits, batch vs continuous)",
    "- Testing rhythm (when tests appear, test coverage patterns)",
    "- Shipping cadence (release frequency, stabilization patterns)",
    "- Code organization (refactoring frequency, structural changes)",
    "- Collaboration patterns (if visible in data)",
    "",
    "CONTENT RULES:",
    "- Never infer skill level, code quality, or make judgments",
    "- Focus on describing observable engineering patterns",
    "- Be encouraging but factual. Avoid generic motivational language.",
    "",
    "Output must be STRICT JSON with this schema:",
    '{"summary":"2-3 sentence overview","sections":[{"title":"...","content":"..."}],"highlights":[{"label":"...","value":"...","interpretation":"..."}]}',
    "Include 3-4 sections and 3-4 highlights.",
  ].join("\n");

  const axesDescription = Object.entries(profile.axes)
    .map(([key, value]) => `- ${key.replace(/_/g, " ")}: ${value.score}/100 (${value.level})`)
    .join("\n");

  // PRIVACY: Anonymize repo names when passing to LLM
  const repoBreakdownStr = profile.repoBreakdown
    .slice(0, 5)
    .map((r, i) => `- Repo${i + 1}: ${r.personaName} (${r.commitCount} commits)`)
    .join("\n");

  const userPrompt = [
    "Developer Profile Data:",
    "",
    `Persona: ${profile.persona.name}`,
    `Tagline: ${profile.persona.tagline}`,
    `Confidence: ${profile.persona.confidence}`,
    `Score: ${profile.persona.score}/100`,
    "",
    `Total Commits: ${profile.totalCommits}`,
    `Total Repos: ${profile.totalRepos}`,
    "",
    "Aggregated Axes Scores:",
    axesDescription,
    "",
    "Per-Repository Breakdown:",
    repoBreakdownStr || "(No breakdown available)",
    "",
    "Persona Reasoning:",
    profile.persona.why?.join(". ") || "(No reasoning available)",
    "",
    "Write a personalized narrative about the developer's SOFTWARE ENGINEERING approach and patterns.",
    "Focus on: how they iterate, their testing rhythm, shipping cadence, and code organization style.",
    "Do NOT interpret repository names or infer what products they build. Focus only on engineering patterns.",
  ].join("\n");

  const client = createLLMClient({
    provider,
    apiKey,
    model,
    maxTokens: 1200,
    temperature: 0.4,
  });

  const response = await client.chat([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  const parsed = safeJsonParse(response.content);
  if (!parsed || typeof parsed !== "object") return null;

  const obj = parsed as {
    summary?: unknown;
    sections?: unknown;
    highlights?: unknown;
  };

  if (typeof obj.summary !== "string") return null;
  if (!Array.isArray(obj.sections)) return null;
  if (!Array.isArray(obj.highlights)) return null;

  const sections: ProfileNarrative["sections"] = [];
  for (const s of obj.sections) {
    if (!s || typeof s !== "object") return null;
    const sec = s as { title?: unknown; content?: unknown };
    if (typeof sec.title !== "string") return null;
    if (typeof sec.content !== "string") return null;
    sections.push({ title: sec.title, content: sec.content });
  }

  const highlights: ProfileNarrative["highlights"] = [];
  for (const h of obj.highlights) {
    if (!h || typeof h !== "object") return null;
    const hi = h as { label?: unknown; value?: unknown; interpretation?: unknown };
    if (typeof hi.label !== "string") return null;
    if (typeof hi.value !== "string") return null;
    if (typeof hi.interpretation !== "string") return null;
    highlights.push({ label: hi.label, value: hi.value, interpretation: hi.interpretation });
  }

  return {
    narrative: { summary: obj.summary, sections, highlights },
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
  };
}
