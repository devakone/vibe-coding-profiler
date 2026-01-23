"use client";

import { Github, Gitlab } from "lucide-react";
import type { PlatformType } from "@vibed/core";

type PlatformIconProps = {
  platform: PlatformType;
  className?: string;
  "aria-label"?: string;
};

const bitbucketPath = (
  <path
    d="M4 4c0-.55.45-1 1-1h2c.28 0 .52.11.7.29L12 9l4.3-5.71c.18-.18.42-.29.7-.29h2c.55 0 1 .45 1 1v13c0 .55-.45 1-1 1h-2c-.28 0-.52-.11-.7-.29L12 13l-4.3 5.71c-.18.18-.42.29-.7.29H4c-.55 0-1-.45-1-1V4z"
    fill="currentColor"
  />
);

export function PlatformIcon({ platform, className, "aria-label": ariaLabel }: PlatformIconProps) {
  if (platform === "github") {
    return <Github className={className} aria-label={ariaLabel ?? "GitHub"} />;
  }

  if (platform === "gitlab") {
    return <Gitlab className={className} aria-label={ariaLabel ?? "GitLab"} />;
  }

  if (platform === "bitbucket") {
    return (
      <svg
        viewBox="0 0 24 24"
        role="img"
        aria-label={ariaLabel ?? "Bitbucket"}
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
      >
        {bitbucketPath}
      </svg>
    );
  }

  return <span className={className} aria-label={ariaLabel ?? "Platform"} />;
}
