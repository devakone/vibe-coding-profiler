"use client";

import { useEffect } from "react";
import { init } from "@plausible-analytics/tracker";

/**
 * Initializes Plausible Analytics on the client side.
 * Must be rendered within the app to enable tracking.
 */
export function PlausibleProvider() {
  useEffect(() => {
    const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

    if (!domain) {
      if (process.env.NODE_ENV === "development") {
        console.debug("[Plausible] No domain configured, skipping initialization");
      }
      return;
    }

    init({
      domain,
      // Don't track localhost unless explicitly enabled
      captureOnLocalhost: process.env.NEXT_PUBLIC_PLAUSIBLE_CAPTURE_LOCALHOST === "true",
      // Track outbound link clicks
      outboundLinks: true,
      // Track file downloads
      fileDownloads: true,
    });
  }, []);

  return null;
}
