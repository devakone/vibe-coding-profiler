import { EventSchemas, Inngest } from "inngest";

/**
 * Type-safe event definitions
 */
type Events = {
  "repo/analyze.requested": {
    data: {
      jobId: string;
      userId: string;
      repoId: string;
    };
  };
};

/**
 * Inngest client for Vibed Coding
 *
 * Events:
 * - repo/analyze.requested: Triggered when a user requests repo analysis
 */
export const inngest = new Inngest({
  id: "vibed-coding",
  schemas: new EventSchemas().fromRecord<Events>(),
});
