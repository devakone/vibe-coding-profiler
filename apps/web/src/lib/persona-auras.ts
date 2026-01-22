/**
 * Persona Aura Assets
 *
 * Each persona has visual assets that represent their coding style:
 * - Background: Full-card background for share cards and profile sections
 * - Icon: Compact badge/avatar for smaller UI elements
 *
 * Visual metaphors:
 * - Rapid Risk-Taker: Flames, speed lines (bold, fast, reckless)
 * - Prompt Sprinter: Lightning bolts (rapid prompting cycles)
 * - Methodical Architect: Blueprint grid, building blocks (plans first)
 * - Guardrailed Viber: Shield + safety net + rails (engineered guardrails)
 * - Reflective Balancer: Yin-yang balance (equilibrium, thoughtful)
 * - Orchestrator: Gas Town / Gas Pump (fueling agent workflows, inspired by Steve Yegge)
 */

export interface PersonaAura {
  /** Full-card background image (horizontal) */
  background: string;
  /** Vertical background for stories (9:16 aspect ratio) */
  verticalBackground: string;
  /** Compact icon/badge image */
  icon: string;
  /** Alt text describing the visual metaphor */
  alt: string;
  /** Brief description of what the persona represents */
  description: string;
}

const PERSONA_ALIASES: Record<string, string> = {
  // Core persona IDs (kebab-case) -> app persona IDs (snake_case)
  "debugger-risk-taker": "rapid_risk_taker",
  "vibe-prototyper": "prompt_sprinter",
  "test-validator": "guardrailed_viber",
  "spec-architect": "spec_first_director",
  "agent-orchestrator": "vertical_slice_shipper",
  "infra-architect": "infra_weaver",
  "specialist-consultant": "spec_first_director",
  "reflective-balancer": "reflective_balancer",
};

/**
 * Maps persona IDs to their aura assets
 */
export const PERSONA_AURAS: Record<string, PersonaAura> = {
  // Dynamic/fast personas
  rapid_risk_taker: {
    background: "/aura-backgrounds/bg-rapid-risk-taker-v2.webp",
    verticalBackground: "/aura-backgrounds/bg-rapid-risk-taker-vertical.webp",
    icon: "/aura-icons/icon-rapid-risk-taker.webp",
    alt: "Purple flames and speed lines suggesting bold, fast movement",
    description: "Ships fast, skips guardrails, embraces risk",
  },
  prompt_sprinter: {
    background: "/aura-backgrounds/bg-prompt-sprinter-v2.webp",
    verticalBackground: "/aura-backgrounds/bg-prompt-sprinter-vertical.webp",
    icon: "/aura-icons/icon-prompt-sprinter.webp",
    alt: "Lightning bolts and iteration circles suggesting rapid prompting",
    description: "Rapid iteration cycles, fast prompting and fixing",
  },
  fix_loop_hacker: {
    background: "/aura-backgrounds/bg-prompt-sprinter-v2.webp",
    verticalBackground: "/aura-backgrounds/bg-prompt-sprinter-vertical.webp",
    icon: "/aura-icons/icon-fix-loop-hacker.webp",
    alt: "Loop arrows with bug being squashed - rapid debug cycles",
    description: "Quick fixes and rapid iteration loops",
  },

  // Balanced/thoughtful personas
  balanced_builder: {
    background: "/aura-backgrounds/bg-reflective-balancer-v2.webp",
    verticalBackground: "/aura-backgrounds/bg-reflective-balancer-vertical.webp",
    icon: "/aura-icons/icon-balanced-builder.webp",
    alt: "Balance scale weighing building blocks - thoughtful construction",
    description: "Balanced approach between speed and safety",
  },
  reflective_balancer: {
    background: "/aura-backgrounds/bg-reflective-balancer-v2.webp",
    verticalBackground: "/aura-backgrounds/bg-reflective-balancer-vertical.webp",
    icon: "/aura-icons/icon-reflective-balancer.webp",
    alt: "Balance scales and yin-yang suggesting thoughtful equilibrium",
    description: "Thoughtful consideration of tradeoffs",
  },
  guardrailed_viber: {
    background: "/aura-backgrounds/bg-guardrailed-viber-v2.webp",
    verticalBackground: "/aura-backgrounds/bg-guardrailed-viber-vertical.webp",
    icon: "/aura-icons/icon-guardrailed-viber.webp",
    alt: "Shield with engineered guardrails and safety net mesh suggesting protection",
    description: "Tests as contracts, safety nets before shipping",
  },

  // Structured/methodical personas
  spec_first_director: {
    background: "/aura-backgrounds/bg-methodical-architect-v2.webp",
    verticalBackground: "/aura-backgrounds/bg-methodical-architect-vertical.webp",
    icon: "/aura-icons/icon-spec-first-director.webp",
    alt: "Clipboard with flowchart directing arrows outward",
    description: "Specs and plans before implementation",
  },
  methodical_architect: {
    background: "/aura-backgrounds/bg-methodical-architect-v2.webp",
    verticalBackground: "/aura-backgrounds/bg-methodical-architect-vertical.webp",
    icon: "/aura-icons/icon-methodical-architect.webp",
    alt: "Isometric blocks on blueprint grid suggesting structured planning",
    description: "Plans carefully before building",
  },

  // Orchestration/coordination personas - split by type
  // Gas Pump (Gas Town) for agent coordination
  vertical_slice_shipper: {
    background: "/aura-backgrounds/bg-orchestrator-v5.webp",
    verticalBackground: "/aura-backgrounds/bg-orchestrator-vertical.webp",
    icon: "/aura-icons/icon-vertical-slice-shipper.webp",
    alt: "Rocket carrying full stack - shipping complete end-to-end",
    description: "Ships complete vertical slices end-to-end",
  },
  // Factory for building/manufacturing personas
  toolsmith_viber: {
    background: "/aura-backgrounds/bg-orchestrator-factory.webp",
    verticalBackground: "/aura-backgrounds/bg-orchestrator-factory-vertical.webp",
    icon: "/aura-icons/icon-toolsmith-viber.webp",
    alt: "Anvil forging a gear with sparks - crafting tools",
    description: "Builds and coordinates tools and workflows",
  },
  infra_weaver: {
    background: "/aura-backgrounds/bg-orchestrator-factory.webp",
    verticalBackground: "/aura-backgrounds/bg-orchestrator-factory-vertical.webp",
    icon: "/aura-icons/icon-infra-weaver.webp",
    alt: "Spider web network with glowing nodes - weaving infrastructure",
    description: "Weaves infrastructure and systems together",
  },

  // Legacy persona IDs (for backwards compatibility)
  "vibe-prototyper": {
    background: "/aura-backgrounds/bg-prompt-sprinter-v2.webp",
    verticalBackground: "/aura-backgrounds/bg-prompt-sprinter-vertical.webp",
    icon: "/aura-icons/icon-prompt-sprinter.webp",
    alt: "Creative burst pattern",
    description: "Fast prototyping and experimentation",
  },
  "test-validator": {
    background: "/aura-backgrounds/bg-guardrailed-viber-v2.webp",
    verticalBackground: "/aura-backgrounds/bg-guardrailed-viber-vertical.webp",
    icon: "/aura-icons/icon-guardrailed-viber.webp",
    alt: "Protective shield pattern",
    description: "Tests first, validates before shipping",
  },
  "spec-architect": {
    background: "/aura-backgrounds/bg-methodical-architect-v2.webp",
    verticalBackground: "/aura-backgrounds/bg-methodical-architect-vertical.webp",
    icon: "/aura-icons/icon-methodical-architect.webp",
    alt: "Blueprint grid pattern",
    description: "Architecture and specs before code",
  },
  "agent-orchestrator": {
    background: "/aura-backgrounds/bg-orchestrator-v5.webp",
    verticalBackground: "/aura-backgrounds/bg-orchestrator-vertical.webp",
    icon: "/aura-icons/icon-orchestrator.webp",
    alt: "Gas Town - fueling station for agent coordination",
    description: "Coordinates AI agents and workflows",
  },
  "reflective-balancer": {
    background: "/aura-backgrounds/bg-reflective-balancer-v2.webp",
    verticalBackground: "/aura-backgrounds/bg-reflective-balancer-vertical.webp",
    icon: "/aura-icons/icon-reflective-balancer.webp",
    alt: "Balance and equilibrium pattern",
    description: "Balances competing priorities",
  },
  "infra-architect": {
    background: "/aura-backgrounds/bg-orchestrator-factory.webp",
    verticalBackground: "/aura-backgrounds/bg-orchestrator-factory-vertical.webp",
    icon: "/aura-icons/icon-infra-weaver.webp",
    alt: "Factory infrastructure weaving pattern",
    description: "Infrastructure governance and system design",
  },
  "specialist-consultant": {
    background: "/aura-backgrounds/bg-methodical-architect-v2.webp",
    verticalBackground: "/aura-backgrounds/bg-methodical-architect-vertical.webp",
    icon: "/aura-icons/icon-spec-first-director.webp",
    alt: "Specification-driven direction and planning",
    description: "Assigns roles and review steps with precision",
  },
};

// Default aura for unknown personas - use the balanced one as neutral
export const DEFAULT_AURA: PersonaAura = {
  background: "/aura-backgrounds/bg-reflective-balancer-v2.webp",
  verticalBackground: "/aura-backgrounds/bg-reflective-balancer-vertical.webp",
  icon: "/aura-icons/icon-reflective-balancer.webp",
  alt: "Abstract balanced pattern",
  description: "Your unique coding style",
};

/**
 * Get the aura assets for a persona ID
 */
export function getPersonaAura(personaId: string | undefined): PersonaAura {
  if (!personaId) return DEFAULT_AURA;
  const normalized = personaId.trim().toLowerCase();
  const underscored = normalized.replace(/-/g, "_");
  const alias = PERSONA_ALIASES[normalized] ?? PERSONA_ALIASES[underscored];
  const key = alias ?? underscored ?? normalized;
  return PERSONA_AURAS[key] ?? PERSONA_AURAS[normalized] ?? DEFAULT_AURA;
}
