"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initializePlausible, trackPlausible } from "@/lib/plausible";

/**
 * Inner component that uses useSearchParams (requires Suspense boundary).
 */
function PlausibleTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

    if (!domain) {
      if (process.env.NODE_ENV === "development") {
        console.debug("[Plausible] No domain configured, skipping initialization");
      }
      return;
    }

    initializePlausible({
      domain,
      captureOnLocalhost:
        process.env.NEXT_PUBLIC_PLAUSIBLE_CAPTURE_LOCALHOST === "true",
      outboundLinks: true,
      fileDownloads: true,
      formSubmissions: true,
      autoCapturePageviews: false,
    });
  }, []);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN) {
      return;
    }

    const url = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    void trackPlausible("pageview", { url });
  }, [pathname, searchParams]);

  return null;
}

export function PlausibleProvider() {
  return (
    <Suspense fallback={null}>
      <PlausibleTracker />
    </Suspense>
  );
}
