import type { PlausibleConfig } from "@plausible-analytics/tracker";

declare global {
  interface Window {
    __vcpPlausibleInitialization?: Promise<void>;
  }
}

export function initializePlausible(
  config: PlausibleConfig
): Promise<void> | null {
  if (typeof window === "undefined") {
    return null;
  }

  window.__vcpPlausibleInitialization ??= import(
    "@plausible-analytics/tracker"
  ).then(({ init }) => {
    init(config);
  });

  return window.__vcpPlausibleInitialization;
}

export async function trackPlausible(
  eventName: string,
  options: Parameters<
    typeof import("@plausible-analytics/tracker").track
  >[1]
): Promise<void> {
  const initialization = window.__vcpPlausibleInitialization;

  if (!initialization) {
    return;
  }

  await initialization;
  const { track } = await import("@plausible-analytics/tracker");
  track(eventName, options);
}
