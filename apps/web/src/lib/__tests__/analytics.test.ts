import { afterEach, describe, expect, it, vi } from "vitest";

const init = vi.fn();
const track = vi.fn();

vi.mock("@plausible-analytics/tracker", () => ({
  init,
  track,
}));

afterEach(() => {
  vi.clearAllMocks();
  Reflect.deleteProperty(globalThis, "window");
});

describe("analytics modules", () => {
  it("can load during server rendering without browser globals", async () => {
    await expect(import("../analytics")).resolves.toBeDefined();
    await expect(import("../../components/PlausibleProvider")).resolves.toBeDefined();
  });

  it("initializes Plausible once across repeated callers", async () => {
    globalThis.window = {} as Window & typeof globalThis;
    const { initializePlausible } = await import("../plausible");
    const config = { domain: "example.com" };

    const first = initializePlausible(config);
    const second = initializePlausible(config);

    expect(first).toBe(second);
    await first;
    expect(init).toHaveBeenCalledOnce();
  });

  it("does not track custom events before initialization", async () => {
    globalThis.window = {} as Window & typeof globalThis;
    const { trackPlausible } = await import("../plausible");

    await trackPlausible("signup", {});

    expect(track).not.toHaveBeenCalled();
  });
});
