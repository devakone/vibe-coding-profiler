/**
 * VCP Component System Types
 *
 * Shared type definitions for Vibe Coding Profile components.
 * Used across primitives, blocks, and page-specific components.
 */

import type { VibeAxes, VibePersona, Level, Confidence } from "@vibed/core";

// =============================================================================
// Axis Types
// =============================================================================

export type AxisKey = keyof VibeAxes;

export interface AxisDisplayValue {
  key: AxisKey;
  name: string;
  score: number;
  level: Level;
  description?: string;
}

// =============================================================================
// Persona Types
// =============================================================================

export interface PersonaDisplay {
  id: string;
  name: string;
  tagline: string;
  confidence: Confidence;
  score: number;
}

// =============================================================================
// Card & Section Types
// =============================================================================

export interface VCPCardProps {
  /** Optional additional CSS classes */
  className?: string;
  /** Card content */
  children: React.ReactNode;
  /** Variant affects default styling */
  variant?: "default" | "elevated" | "muted";
}

export interface VCPSectionProps {
  /** Section title (optional - renders VCPSectionTitle if provided) */
  title?: string;
  /** Optional badge next to title */
  badge?: string;
  /** Optional right-aligned action/element */
  action?: React.ReactNode;
  /** Section content */
  children: React.ReactNode;
  /** Hide top border */
  noBorder?: boolean;
  /** Optional additional CSS classes */
  className?: string;
}

export interface VCPSectionTitleProps {
  /** Title text */
  children: React.ReactNode;
  /** Optional badge */
  badge?: string;
  /** Optional right-aligned action */
  action?: React.ReactNode;
  /** Optional additional CSS classes */
  className?: string;
}

// =============================================================================
// Stat & Metric Types
// =============================================================================

export interface VCPStatCardProps {
  /** Stat label (displayed small, uppercase) */
  label: string;
  /** Stat value (displayed large) */
  value: string | number;
  /** Optional subtitle or additional context */
  subtitle?: string;
  /** Visual variant */
  variant?: "default" | "highlight" | "muted";
  /** Optional additional CSS classes */
  className?: string;
}

export interface VCPProgressBarProps {
  /** Progress value 0-100 */
  value: number;
  /** Optional label */
  label?: string;
  /** Show value text */
  showValue?: boolean;
  /** Bar size */
  size?: "sm" | "md" | "lg";
  /** Color variant */
  variant?: "default" | "success" | "warning" | "danger";
  /** Optional additional CSS classes */
  className?: string;
}

// =============================================================================
// Badge Types
// =============================================================================

export interface VCPBadgeProps {
  /** Badge content */
  children: React.ReactNode;
  /** Visual variant */
  variant?: "default" | "success" | "warning" | "info" | "muted";
  /** Size */
  size?: "sm" | "md";
  /** Optional additional CSS classes */
  className?: string;
}

// =============================================================================
// Collapsible Types
// =============================================================================

export interface VCPCollapsibleProps {
  /** Trigger/header content */
  trigger: React.ReactNode;
  /** Collapsible content */
  children: React.ReactNode;
  /** Default open state */
  defaultOpen?: boolean;
  /** Optional additional CSS classes */
  className?: string;
}

// =============================================================================
// Insight Box Types
// =============================================================================

export interface VCPInsightBoxProps {
  /** Insight type for styling */
  type?: "default" | "ai" | "highlight";
  /** Optional label (e.g., "INSIGHT", "AI-GENERATED") */
  label?: string;
  /** Main insight text */
  children: React.ReactNode;
  /** Optional bullet points */
  bullets?: string[];
  /** Optional additional CSS classes */
  className?: string;
}

// =============================================================================
// Identity Header Types
// =============================================================================

export interface VCPIdentityHeaderProps {
  /** Header label (e.g., "Your Unified VCP") */
  label: string;
  /** Persona display info */
  persona: PersonaDisplay;
  /** Optional stats line (e.g., "3 repos · 1,245 commits") */
  statsLine?: string;
  /** Optional avatar URL */
  avatarUrl?: string | null;
  /** Optional persona icon URL (overrides default) */
  personaIconUrl?: string;
  /** Optional action buttons */
  actions?: React.ReactNode;
  /** Optional additional CSS classes */
  className?: string;
}

// =============================================================================
// Axes Grid Types
// =============================================================================

export interface VCPAxesGridProps {
  /** Vibe axes to display */
  axes: VibeAxes;
  /** Show detailed descriptions */
  showDescriptions?: boolean;
  /** Layout variant */
  layout?: "grid" | "list";
  /** Optional additional CSS classes */
  className?: string;
}

// =============================================================================
// Stats Grid Types
// =============================================================================

export interface VCPStatsGridProps {
  /** Stats to display */
  stats: Array<{
    label: string;
    value: string | number;
    subtitle?: string;
  }>;
  /** Number of columns */
  columns?: 2 | 3 | 4;
  /** Optional additional CSS classes */
  className?: string;
}

// =============================================================================
// Narrative Section Types
// =============================================================================

export interface VCPNarrativeSectionProps {
  /** Narrative headline/summary */
  headline?: string;
  /** Narrative paragraphs */
  paragraphs?: string[];
  /** Highlight bullets */
  highlights?: string[];
  /** LLM model used (for attribution) */
  llmModel?: string;
  /** Whether narrative is loading */
  isLoading?: boolean;
  /** Optional additional CSS classes */
  className?: string;
}

// =============================================================================
// Matched Signals Types
// =============================================================================

export interface VCPMatchedSignalsProps {
  /** Matched rule identifiers */
  matchedRules: string[];
  /** Optional additional CSS classes */
  className?: string;
}

// =============================================================================
// Methodology Link Types
// =============================================================================

export interface VCPMethodologyLinkProps {
  /** Link variant */
  variant?: "inline" | "block";
  /** Custom text */
  text?: string;
  /** Optional additional CSS classes */
  className?: string;
}

// =============================================================================
// Footer Types
// =============================================================================

export interface VCPFooterProps {
  /** Left content */
  left: React.ReactNode;
  /** Right content */
  right: React.ReactNode;
  /** Optional additional CSS classes */
  className?: string;
}

// =============================================================================
// Version History Types
// =============================================================================

export interface VCPVersionEntry {
  /** Unique identifier (job_id) */
  id: string;
  /** Display label (e.g., "v3", "Dec 15") */
  label: string;
  /** Persona name at this version */
  personaName: string;
  /** Persona ID for icon */
  personaId: string;
  /** When this version was created */
  createdAt: string;
  /** Whether this is the currently viewed version */
  isCurrent?: boolean;
}

export interface VCPVersionHistoryProps {
  /** Variant determines behavior */
  variant: "unified" | "repo";
  /** Available versions */
  versions: VCPVersionEntry[];
  /** Currently selected version ID */
  currentVersionId: string;
  /** Callback when version is selected */
  onVersionSelect: (versionId: string) => void;
  /** Whether to show preview on hover (desktop) */
  showPreview?: boolean;
  /** Optional additional CSS classes */
  className?: string;
}

// =============================================================================
// Re-exports for convenience
// =============================================================================

export type { VibeAxes, VibePersona, Level, Confidence };
