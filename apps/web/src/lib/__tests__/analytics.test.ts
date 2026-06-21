import { describe, expect, it } from "vitest";

describe("analytics modules", () => {
  it("can load during server rendering without browser globals", async () => {
    await expect(import("../analytics")).resolves.toBeDefined();
    await expect(import("../../components/PlausibleProvider")).resolves.toBeDefined();
  });
});
