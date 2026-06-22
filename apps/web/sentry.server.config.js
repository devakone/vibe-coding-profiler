// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://0ddc11d7b3f42d5ca32ecf0b74ff61ef@o4510870266118144.ingest.us.sentry.io/4510870274899968",

  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

  enableLogs: true,

  sendDefaultPii: false,
});
