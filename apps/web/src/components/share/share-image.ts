/**
 * Share image generation utilities
 */

import type { ShareFormat, ShareFormatConfig, ShareImageTemplate } from "./types";

export const SHARE_FORMATS: Record<ShareFormat, ShareFormatConfig> = {
  og: {
    label: "OpenGraph 1200×630",
    width: 1200,
    height: 630,
    pad: 80,
    headlineSize: 64,
    subheadSize: 28,
    metricsSize: 24,
    metaSize: 18,
    watermarkSize: 18,
    cardRadius: 48,
  },
  square: {
    label: "Square 1080×1080",
    width: 1080,
    height: 1080,
    pad: 88,
    headlineSize: 72,
    subheadSize: 32,
    metricsSize: 28,
    metaSize: 20,
    watermarkSize: 20,
    cardRadius: 64,
  },
  story: {
    label: "Story 1080×1920",
    width: 1080,
    height: 1920,
    pad: 96,
    headlineSize: 84,
    subheadSize: 36,
    metricsSize: 30,
    metaSize: 22,
    watermarkSize: 22,
    cardRadius: 64,
  },
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrapTextLines(
  text: string,
  maxCharsPerLine: number,
  maxLines: number
): { lines: string[]; truncated: boolean } {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharsPerLine) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) {
        return { lines, truncated: true };
      }
      continue;
    }

    lines.push(word.slice(0, Math.max(1, maxCharsPerLine)));
    if (lines.length >= maxLines) {
      return { lines, truncated: true };
    }
    current = "";
  }

  if (current) lines.push(current);

  if (lines.length > maxLines) {
    return { lines: lines.slice(0, maxLines), truncated: true };
  }

  return { lines, truncated: false };
}

function withEllipsis(text: string): string {
  const t = text.trim();
  return t.length === 0 ? t : `${t}…`;
}

export function createShareSvg(
  template: ShareImageTemplate,
  format: ShareFormat
): string {
  const cfg = SHARE_FORMATS[format];
  const metricsText = template.metrics
    .slice(0, 3)
    .map((metric) => `${metric.label}: ${metric.value}`)
    .join(" · ");
  const archetypes = template.persona_archetype.archetypes.slice(0, 3).join(", ");

  const headlineChars = format === "og" ? 26 : format === "square" ? 22 : 18;
  const subheadChars = format === "og" ? 46 : format === "square" ? 36 : 30;
  const metricsChars = format === "og" ? 72 : format === "square" ? 60 : 46;

  const headlineWrapped = wrapTextLines(template.headline, headlineChars, 2);
  const subheadWrapped = wrapTextLines(template.subhead, subheadChars, 2);
  const metricsWrapped = wrapTextLines(metricsText, metricsChars, format === "story" ? 2 : 1);

  const headlineLines = headlineWrapped.lines.map((l, idx) =>
    escapeXml(idx === headlineWrapped.lines.length - 1 && headlineWrapped.truncated ? withEllipsis(l) : l)
  );
  const subheadLines = subheadWrapped.lines.map((l, idx) =>
    escapeXml(idx === subheadWrapped.lines.length - 1 && subheadWrapped.truncated ? withEllipsis(l) : l)
  );
  const metricsLines = metricsWrapped.lines.map((l, idx) =>
    escapeXml(idx === metricsWrapped.lines.length - 1 && metricsWrapped.truncated ? withEllipsis(l) : l)
  );

  const startY =
    format === "story" ? Math.round(cfg.height * 0.34) : cfg.pad + Math.round(cfg.headlineSize * 0.9);

  const headlineY = startY;
  const subheadY = headlineY + Math.round(cfg.headlineSize * 0.95) + 18;
  const metricsY = subheadY + Math.round(cfg.subheadSize * 0.95) + 18;
  const metaY =
    format === "story" ? Math.round(cfg.height * 0.72) : metricsY + Math.round(cfg.metricsSize * 0.95) + 28;
  const hashY = metaY + Math.round(cfg.metaSize * 1.6);
  const watermarkY = cfg.height - Math.round(cfg.pad * 0.6);

  const x = cfg.pad;
  const watermarkX = cfg.width - cfg.pad;

  const headlineTspans = headlineLines
    .map((line, idx) => `<tspan x="${x}" dy="${idx === 0 ? 0 : Math.round(cfg.headlineSize * 1.1)}">${line}</tspan>`)
    .join("");
  const subheadTspans = subheadLines
    .map((line, idx) => `<tspan x="${x}" dy="${idx === 0 ? 0 : Math.round(cfg.subheadSize * 1.25)}">${line}</tspan>`)
    .join("");
  const metricsTspans = metricsLines
    .map((line, idx) => `<tspan x="${x}" dy="${idx === 0 ? 0 : Math.round(cfg.metricsSize * 1.25)}">${line}</tspan>`)
    .join("");

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${cfg.width}" height="${cfg.height}" viewBox="0 0 ${cfg.width} ${cfg.height}">
  <defs>
    <linearGradient id="g" x1="0%" x2="100%" y1="0%" y2="100%">
      <stop offset="0%" stop-color="${template.colors.primary}" />
      <stop offset="100%" stop-color="${template.colors.accent}" />
    </linearGradient>
  </defs>
  <rect width="${cfg.width}" height="${cfg.height}" rx="${cfg.cardRadius}" fill="url(#g)" />
  <text x="${x}" y="${headlineY}" font-size="${cfg.headlineSize}" font-weight="700" fill="#FFFFFF" font-family="Space Grotesk, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">
    ${headlineTspans}
  </text>
  <text x="${x}" y="${subheadY}" font-size="${cfg.subheadSize}" fill="rgba(255,255,255,0.85)" font-family="Space Grotesk, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">
    ${subheadTspans}
  </text>
  <text x="${x}" y="${metricsY}" font-size="${cfg.metricsSize}" fill="rgba(255,255,255,0.85)" font-family="Space Grotesk, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">
    ${metricsTspans}
  </text>
  <text x="${x}" y="${metaY}" font-size="${cfg.metaSize}" fill="rgba(224,242,254,0.9)" font-family="Space Grotesk, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">
    Persona: ${escapeXml(template.persona_archetype.label)} · ${escapeXml(archetypes)}
  </text>
  <text x="${x}" y="${hashY}" font-size="${cfg.metaSize}" fill="rgba(224,242,254,0.85)" font-family="Space Grotesk, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">
    #Vibed
  </text>
  <text x="${watermarkX}" y="${watermarkY}" font-size="${cfg.watermarkSize}" text-anchor="end" fill="rgba(255,255,255,0.75)" font-family="Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">
    vibed.coding
  </text>
</svg>`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadSharePng(
  template: ShareImageTemplate,
  format: ShareFormat,
  entityId: string
): Promise<void> {
  const svg = createShareSvg(template, format);
  const cfg = SHARE_FORMATS[format];

  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image_load_failed"));
    });
    img.src = svgUrl;
    await loaded;

    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = cfg.width * scale;
    canvas.height = cfg.height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas_unsupported");
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.drawImage(img, 0, 0, cfg.width, cfg.height);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("png_encode_failed"))), "image/png");
    });

    downloadBlob(pngBlob, `vibed-coding-${entityId}-${format}.png`);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export function downloadShareSvg(
  template: ShareImageTemplate,
  format: ShareFormat,
  entityId: string
): void {
  const svg = createShareSvg(template, format);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, `vibed-coding-${entityId}-${format}.svg`);
}
