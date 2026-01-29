"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useJobs } from "@/contexts/JobsContext";
import { NotificationBadge } from "./NotificationBadge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * NotificationDropdown - Bell icon with dropdown showing job activity
 *
 * Shows in-progress and completed jobs with unread indicators.
 * Clicking a job navigates to its VCP and marks it as read.
 */
export function NotificationDropdown() {
  const { jobs, unreadReportIds, unreadCount, markReportAsRead, markAllAsRead, isPolling } = useJobs();
  const [isOpen, setIsOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  // Only render the full component on the client to avoid hydration mismatch
  // from Radix UI's random ID generation
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Sort jobs: in-progress first, then by date
  const sortedJobs = [...jobs].sort((a, b) => {
    const aActive = a.status === "pending" || a.status === "running";
    const bActive = b.status === "pending" || b.status === "running";
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Limit to recent 10 jobs
  const recentJobs = sortedJobs.slice(0, 10);

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
      case "running":
        return (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
          </span>
        );
      case "done":
        return (
          <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case "failed":
        return (
          <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  const handleJobClick = (jobId: string) => {
    markReportAsRead(jobId);
    setIsOpen(false);
  };

  // Render a static placeholder during SSR to avoid hydration mismatch
  if (!hasMounted) {
    return (
      <button
        type="button"
        className="relative rounded-full p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        aria-label="Notifications"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      </button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative rounded-full p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          {/* Bell icon */}
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          
          {/* Badge */}
          <NotificationBadge
            count={unreadCount}
            size="sm"
            className="absolute -right-0.5 -top-0.5"
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-900">Activity</h3>
            {isPolling && (
              <span className="flex h-2 w-2">
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllAsRead()}
              className="text-xs font-medium text-violet-600 hover:text-violet-800"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Jobs list */}
        <div className="max-h-80 overflow-y-auto">
          {recentJobs.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">
              No recent activity
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {recentJobs.map((job) => {
                const isUnread = unreadReportIds.has(job.id);
                const isActive = job.status === "pending" || job.status === "running";
                const isDone = job.status === "done";
                const isFailed = job.status === "failed";

                return (
                  <li key={job.id}>
                    {isDone ? (
                      <Link
                        href={`/analysis/${job.id}`}
                        onClick={() => handleJobClick(job.id)}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-zinc-50",
                          isUnread && "bg-violet-50/50"
                        )}
                      >
                        <div className="mt-0.5 flex h-5 w-5 items-center justify-center">
                          {getStatusIcon(job.status)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={cn(
                              "truncate text-sm",
                              isUnread ? "font-semibold text-zinc-900" : "font-medium text-zinc-700"
                            )}>
                              {job.repoName ?? "Repository"}
                            </p>
                            {isUnread && (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                            )}
                          </div>
                          <p className="text-xs text-zinc-500">
                            Analysis complete · {formatTimeAgo(job.completedAt ?? job.createdAt)}
                          </p>
                        </div>
                        <svg
                          className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ) : (
                      <div
                        className={cn(
                          "flex items-start gap-3 px-4 py-3",
                          isActive && "bg-zinc-50"
                        )}
                      >
                        <div className="mt-0.5 flex h-5 w-5 items-center justify-center">
                          {getStatusIcon(job.status)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-zinc-700">
                            {job.repoName ?? "Repository"}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {isActive ? "Analyzing..." : isFailed ? "Failed" : job.status}
                            {isActive && " · Started " + formatTimeAgo(job.startedAt ?? job.createdAt)}
                            {isFailed && job.errorMessage && (
                              <span className="block truncate text-red-500">{job.errorMessage}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {recentJobs.length > 0 && (
          <div className="border-t border-zinc-200 px-4 py-2">
            <Link
              href="/vibes"
              onClick={() => setIsOpen(false)}
              className="block text-center text-xs font-medium text-zinc-500 hover:text-zinc-700"
            >
              View Repo VCPs →
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
