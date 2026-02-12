"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { init, track } from "@plausible-analytics/tracker";

/**
 * Inner component that uses useSearchParams (requires Suspense boundary).
 */
function PlausibleTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInitialized = useRef(false);

  // Initialize Plausible once
  useEffect(() => {
    const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

    if (!domain) {
      if (process.env.NODE_ENV === "development") {
        console.debug("[Plausible] No domain configured, skipping initialization");
      }
      return;
    }

    if (!isInitialized.current) {
      init({
        domain,
        // Don't track localhost unless explicitly enabled
        captureOnLocalhost: process.env.NEXT_PUBLIC_PLAUSIBLE_CAPTURE_LOCALHOST === "true",
        // Track outbound link clicks
        outboundLinks: true,
        // Track file downloads
        fileDownloads: true,
        // Disable auto capture - we handle it manually for Next.js App Router
        autoCapturePageviews: false,
      });
      isInitialized.current = true;
    }
  }, []);

  // Track page views on route changes
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || !isInitialized.current) {
      return;
    }

    // Build the full URL for tracking
    const url = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    // Track pageview with the current URL
    track("pageview", { url });
  }, [pathname, searchParams]);

  return null;
}

/**
 * Initializes Plausible Analytics and tracks page views on route changes.
 * Must be rendered within the app to enable tracking.
 */
export function PlausibleProvider() {
  return (
    <Suspense fallback={null}>
      <PlausibleTracker />
    </Suspense>
  );
}
