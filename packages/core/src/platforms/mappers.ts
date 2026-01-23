import type { NormalizedCommit } from "./types";
import type { VibeCommitEvent } from "../vibe";

/**
 * Transform a NormalizedCommit from platform clients into VibeCommitEvent format
 * used by the analysis pipeline.
 *
 * Handles platform-specific limitations:
 * - Bitbucket lacks addition/deletion stats, defaults to 0
 * - filesChanged defaults to filePaths.length if not provided
 */
export function normalizedCommitToVibeEvent(commit: NormalizedCommit): VibeCommitEvent {
  return {
    sha: commit.sha,
    message: commit.message,
    author_date: commit.authoredAt.toISOString(),
    committer_date: commit.committedAt.toISOString(),
    author_email: commit.authorEmail,
    files_changed: commit.filesChanged ?? commit.filePaths.length,
    additions: commit.additions ?? 0,
    deletions: commit.deletions ?? 0,
    parents: commit.parents,
    file_paths: commit.filePaths,
  };
}

/**
 * Transform an array of NormalizedCommits to VibeCommitEvents
 */
export function normalizedCommitsToVibeEvents(commits: NormalizedCommit[]): VibeCommitEvent[] {
  return commits.map(normalizedCommitToVibeEvent);
}
