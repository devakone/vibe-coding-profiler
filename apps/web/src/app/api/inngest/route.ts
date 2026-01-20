import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { analyzeRepo } from "@/inngest/functions";

/**
 * Inngest API route
 *
 * This serves the Inngest SDK and handles:
 * - Function registration
 * - Event reception
 * - Function execution
 *
 * In development: Events are sent to Inngest Dev Server
 * In production: Events go through Inngest Cloud
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [analyzeRepo],
});
