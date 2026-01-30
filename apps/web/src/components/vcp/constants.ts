/**
 * VCP Component System Constants
 *
 * Shared constants for Vibe Coding Profile components.
 */

import type { AxisKey } from "./types";

// =============================================================================
// Axis Metadata
// =============================================================================

export interface AxisMetadata {
  name: string;
  shortName: string;
  description: string;
  longDescription: string;
  lowLabel: string;
  highLabel: string;
}

export const AXIS_METADATA: Record<AxisKey, AxisMetadata> = {
  automation_heaviness: {
    name: "Automation",
    shortName: "Auto",
    description: "How much you rely on AI agents and tools for generating code",
    longDescription:
      "How much of your output comes from AI-assisted generation versus manual edits. Higher scores indicate more agent-driven, multi-file changes.",
    lowLabel: "Manual",
    highLabel: "AI-Heavy",
  },
  guardrail_strength: {
    name: "Guardrails",
    shortName: "Guard",
    description: "How closely tests, CI, and docs follow your AI-generated changes",
    longDescription:
      "How quickly guardrails appear after AI-generated code lands. Higher scores mean tests, CI, and docs show up alongside or right after the AI output.",
    lowLabel: "Light",
    highLabel: "Rigorous",
  },
  iteration_loop_intensity: {
    name: "Iteration",
    shortName: "Iter",
    description: "How often you run prompt-fix-run loops to refine AI output",
    longDescription:
      'How often you cycle through "prompt → run → fix → run" loops after AI-generated changes. Higher scores mean faster, denser iteration.',
    lowLabel: "Stable",
    highLabel: "Rapid",
  },
  planning_signal: {
    name: "Planning",
    shortName: "Plan",
    description: "How much structure you define before prompting AI to generate code",
    longDescription:
      "How much upfront structure shapes your AI workflow: specs, linked issues, and docs-first patterns. Higher scores mean prompts follow plans, not the other way around.",
    lowLabel: "Emergent",
    highLabel: "Structured",
  },
  surface_area_per_change: {
    name: "Surface Area",
    shortName: "Scope",
    description: "How many parts of the codebase your typical prompt or change touches",
    longDescription:
      "How broad each unit of work is across the codebase. Higher scores mean your prompts and changes span multiple subsystems at once.",
    lowLabel: "Narrow",
    highLabel: "Wide",
  },
  shipping_rhythm: {
    name: "Rhythm",
    shortName: "Rhythm",
    description: "Your coding session pattern — steady output vs intense vibe sessions",
    longDescription:
      "How your coding sessions are distributed over time. Higher scores indicate intense vibe coding sessions followed by quiet stretches; lower scores indicate a steadier cadence.",
    lowLabel: "Steady",
    highLabel: "Bursty",
  },
};

// Ordered list of axis keys for consistent rendering
export const AXIS_ORDER: AxisKey[] = [
  "automation_heaviness",
  "guardrail_strength",
  "iteration_loop_intensity",
  "planning_signal",
  "surface_area_per_change",
  "shipping_rhythm",
];

// =============================================================================
// Confidence Labels
// =============================================================================

export const CONFIDENCE_LABELS: Record<string, string> = {
  high: "High Confidence",
  medium: "Medium Confidence",
  low: "Low Confidence",
};

export const CONFIDENCE_COLORS: Record<string, string> = {
  high: "text-green-400",
  medium: "text-yellow-400",
  low: "text-orange-400",
};

// =============================================================================
// Level Labels
// =============================================================================

export const LEVEL_LABELS: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const LEVEL_COLORS: Record<string, { text: string; bg: string }> = {
  high: { text: "text-green-400", bg: "bg-green-500" },
  medium: { text: "text-yellow-400", bg: "bg-yellow-500" },
  low: { text: "text-red-400", bg: "bg-red-500" },
};

// =============================================================================
// Styling Constants
// =============================================================================

/** Standard card border radius */
export const VCP_CARD_RADIUS = "rounded-2xl";

/** Standard card shadow */
export const VCP_CARD_SHADOW = "shadow-lg";

/** Standard section padding */
export const VCP_SECTION_PADDING = "p-6";

/** Standard title letter spacing */
export const VCP_TITLE_TRACKING = "tracking-widest";

// =============================================================================
// Persona Icon Mapping
// =============================================================================

export const PERSONA_ICON_MAP: Record<string, string> = {
  prompt_sprinter: "/aura-icons/icon-prompt-sprinter.webp",
  guardrailed_viber: "/aura-icons/icon-guardrailed-viber.webp",
  spec_first_director: "/aura-icons/icon-methodical-architect.webp",
  vertical_slice_shipper: "/aura-icons/icon-vertical-slice-shipper.webp",
  fix_loop_hacker: "/aura-icons/icon-fix-loop-hacker.webp",
  rapid_risk_taker: "/aura-icons/icon-rapid-risk-taker.webp",
  balanced_builder: "/aura-icons/icon-reflective-balancer.webp",
  // Legacy/alias mappings
  methodical_architect: "/aura-icons/icon-methodical-architect.webp",
  reflective_balancer: "/aura-icons/icon-reflective-balancer.webp",
};

export function getPersonaIcon(personaId: string): string {
  return PERSONA_ICON_MAP[personaId] ?? PERSONA_ICON_MAP.balanced_builder;
}
