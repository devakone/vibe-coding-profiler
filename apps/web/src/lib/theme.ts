export const wrappedTheme = {
  background: "bg-white",
  backgroundOrbs: {
    wrapper: "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
    orbA:
      "absolute -left-24 top-28 h-[26rem] w-[26rem] rounded-full bg-gradient-to-br from-fuchsia-400/35 via-indigo-400/25 to-cyan-400/35 blur-3xl",
    orbB:
      "absolute -right-24 top-10 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-lime-300/30 via-emerald-300/22 to-cyan-300/30 blur-3xl",
    orbC:
      "absolute bottom-0 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-amber-300/30 via-fuchsia-300/22 to-indigo-300/25 blur-3xl",
    vignette:
      "absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.05),transparent_60%)]",
  },
  container: "mx-auto max-w-6xl px-6 sm:px-10 lg:px-20",
  pageY: "py-12",
  card: "rounded-3xl border border-black/5 bg-white/75 shadow-[0_25px_80px_rgba(2,6,23,0.08)] backdrop-blur",
  cardInner: "rounded-2xl border border-black/5 bg-white/70 backdrop-blur",
  gradientText:
    "bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent",
  dot: "h-2.5 w-2.5 rounded-full bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-600 shadow-sm",
  primaryButton:
    "rounded-full bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110",
  primaryButtonSm:
    "rounded-full bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110",
  secondaryButton:
    "rounded-full border border-zinc-300/80 bg-white/70 px-6 py-2 text-sm font-semibold text-zinc-950 shadow-sm backdrop-blur transition hover:border-zinc-400 hover:bg-white",
  pillLink:
    "rounded-full px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-950/5 hover:text-zinc-950",
};
