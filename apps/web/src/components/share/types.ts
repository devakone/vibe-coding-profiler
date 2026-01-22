/**
 * Share component types and interfaces
 */

export interface ShareCardMetric {
  label: string;
  value: string;
}

export interface ShareCardColors {
  primary: string;
  accent: string;
}

export interface ShareCardPersona {
  label: string;
  tagline: string;
  confidence: string;
  archetypes?: string[];
}

export interface ShareCardProps {
  /** Variant determines layout differences */
  variant: "repo" | "profile";
  /** Optional persona ID for aura background + icon */
  personaId?: string;
  /** Persona information */
  persona: ShareCardPersona;
  /** Up to 4 metrics to display */
  metrics: ShareCardMetric[];
  /** Footer content */
  footer: {
    left: string;
    right: string;
  };
  /** Gradient colors */
  colors: ShareCardColors;
  /** Optional avatar URL */
  avatarUrl?: string | null;
  /** Optional header label override */
  headerLabel?: string;
}

export interface ShareActionsProps {
  /** URL to share */
  shareUrl: string;
  /** Text content for copy/share */
  shareText: string;
  /** Caption for social platforms */
  shareCaption: string;
  /** Headline for native share */
  shareHeadline: string;
  /** Share template for image generation */
  shareTemplate: ShareImageTemplate | null;
  /** Job ID or profile ID for filename */
  entityId: string;
  /** Whether share is disabled */
  disabled?: boolean;
}

export interface ShareImageTemplate {
  colors: ShareCardColors;
  headline: string;
  subhead: string;
  metrics: ShareCardMetric[];
  persona_archetype: {
    label: string;
    archetypes: string[];
  };
}

export type ShareFormat = "og" | "square" | "story";

export interface ShareFormatConfig {
  label: string;
  width: number;
  height: number;
  pad: number;
  headlineSize: number;
  subheadSize: number;
  metricsSize: number;
  metaSize: number;
  watermarkSize: number;
  cardRadius: number;
}
