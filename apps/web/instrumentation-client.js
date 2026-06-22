// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://0ddc11d7b3f42d5ca32ecf0b74ff61ef@o4510870266118144.ingest.us.sentry.io/4510870274899968",

  integrations: [Sentry.replayIntegration()],

  environment: process.env.NODE_ENV,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

  enableLogs: true,

  replaysSessionSampleRate: 0.1,

  replaysOnErrorSampleRate: 1.0,

  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
