import { describe, expect, it } from "vitest";

import { config } from "@/proxy";

describe("Sentry routing", () => {
  it("excludes the Sentry tunnel from the auth proxy", () => {
    expect(config.matcher).toEqual([
      "/((?!monitoring|_next/static|_next/image|favicon.ico).*)",
    ]);
  });
});
