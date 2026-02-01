/**
 * Vibed Coding Theme
 *
 * Visual Identity: "Developer Personality Discovery"
 * - Unified purple-blue palette (violet-600 → indigo-600)
 * - Flat, clean surfaces inspired by Remotion.dev
 * - Gradients only for accents (buttons, progress bars, text highlights)
 * - Fun, personality-test vibe — not terminal, not performance review
 */

// Core brand colors
export const vibeColors = {
  // Primary violet-blue spectrum
  violetDeep: "#7c3aed", // violet-600 - Primary brand
  indigo: "#6366f1", // indigo-500 - Secondary, gradients
  blueSoft: "#818cf8", // indigo-400 - Lighter accents
  lavender: "#c4b5fd", // violet-300 - Soft fills
  violetMist: "#ede9fe", // violet-100 - Very light backgrounds
  violetGhost: "#f5f3ff", // violet-50 - Subtle bg tint

  // Neutrals with purple undertone
  ink: "#1e1b4b", // indigo-950 - Dark text/headings
  slate: "#64748b", // slate-500 - Secondary text
  mist: "#faf9fc", // Custom - Page background with violet tint

  // Accent (use sparingly)
  coral: "#f97316", // orange-500 - CTAs only, never on content areas
} as const;

// Gradient definitions
export const vibeGradients = {
  // Primary brand gradient (buttons, progress bars, text)
  primary: "from-violet-600 to-indigo-500",
  // Softer version for larger surfaces
  soft: "from-violet-100 to-indigo-100",
  // Insight box background
  insight: "from-violet-50 to-indigo-50",
} as const;

export const wrappedTheme = {
  background: "bg-[#faf9fc]",
  // Clean background - no orbs, flat and modern
  backgroundOrbs: {
    wrapper: "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
    // Single subtle gradient for depth, not chaos
    orbA:
      "absolute -left-48 -top-48 h-[40rem] w-[40rem] rounded-full bg-gradient-to-br from-violet-200/30 to-indigo-200/20 blur-3xl",
    orbB:
      "absolute -right-48 bottom-0 h-[35rem] w-[35rem] rounded-full bg-gradient-to-br from-indigo-200/25 to-violet-200/15 blur-3xl",
    orbC: "hidden", // Removed third orb for cleaner look
    vignette: "hidden", // Removed vignette
  },
  container: "mx-auto max-w-6xl px-6 sm:px-10 lg:px-20",
  pageY: "py-12",
  card: "vibe-echo rounded-3xl border border-black/5 bg-white shadow-[0_25px_80px_rgba(30,27,75,0.06)]",
  cardInner: "rounded-2xl border border-black/5 bg-white",
  // Unified gradient text
  gradientText:
    "bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent",
  dot: "h-2.5 w-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 shadow-sm",
  // Primary button with unified gradient
  primaryButton:
    "rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110",
  primaryButtonSm:
    "rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110",
  secondaryButton:
    "rounded-full border border-violet-200 bg-white px-6 py-2 text-sm font-semibold text-violet-900 shadow-sm transition hover:border-violet-300 hover:bg-violet-50",
  pillLink:
    "rounded-full px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-violet-50 hover:text-violet-900",
  // Insight box (purple left border style)
  insightBox:
    "rounded-xl border-l-4 border-l-violet-500 bg-violet-50 px-5 py-4",
  insightLabel: "text-xs font-semibold uppercase tracking-[0.3em] text-violet-600",
  // Progress bars
  progressBar: "h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500",
  progressTrack: "h-1.5 w-full rounded-full bg-slate-100",
  // Badges
  badge: "rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700",
  badgeOutline: "rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-medium text-violet-700",
};
