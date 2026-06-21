"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Inner component that uses useSearchParams (requires Suspense boundary).
 */
function PlausibleTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInitialized = useRef(false);
  const initialization = useRef<Promise<void> | null>(null);

  // Initialize Plausible once
  useEffect(() => {
    const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

    if (!domain) {
      if (process.env.NODE_ENV === "development") {
        console.debug("[Plausible] No domain configured, skipping initialization");
      }
      return;
    }

    initialization.current = import("@plausible-analytics/tracker").then(({ init }) => {
      if (!isInitialized.current) {
        init({
          domain,
          captureOnLocalhost: process.env.NEXT_PUBLIC_PLAUSIBLE_CAPTURE_LOCALHOST === "true",
          outboundLinks: true,
          fileDownloads: true,
          formSubmissions: true,
          autoCapturePageviews: false,
        });
        isInitialized.current = true;
      }
    });
  }, []);

  // Track page views on route changes
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || !initialization.current) {
      return;
    }

    // Build the full URL for tracking
    const url = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    // Track pageview with the current URL
    void initialization.current.then(async () => {
      const { track } = await import("@plausible-analytics/tracker");
      track("pageview", { url });
    });
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
