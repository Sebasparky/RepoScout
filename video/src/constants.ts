// ─── Design Tokens ───────────────────────────────────────────────────────────

export const COLORS = {
  bg: "#080808",
  surface: "#111111",
  surfaceHigh: "#181818",
  border: "#222222",
  borderBright: "#333333",
  accent: "#00ff88",       // primary green
  accentDim: "#00cc6a",
  blue: "#3b82f6",
  yellow: "#fbbf24",
  textPrimary: "#ffffff",
  textSecondary: "#aaaaaa",
  textMuted: "#555555",
  danger: "#ef4444",
} as const;

export const FONTS = {
  sans: "Inter, system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
} as const;

// ─── Composition ─────────────────────────────────────────────────────────────

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// ─── Scene durations (frames) ─────────────────────────────────────────────────
// 6 fade transitions × 12f = 72f overlap
// Sum of scene durations − 72 = total

export const SCENE = {
  hook:       75,  // 2.5s  (was 3s)
  problem:   165,  // 5.5s  (was 7s)
  intercept: 165,  // 5.5s  (was 7s)
  auth:      210,  // 7.0s  (was 9s)
  richText:  195,  // 6.5s  (was 9s)
  skip:      135,  // 4.5s  (was 7s)
  closing:   180,  // 6.0s  (was 8s)
} as const;

export const TRANSITION_FRAMES = 12;
export const NUM_TRANSITIONS = 6;

export const TOTAL_FRAMES =
  Object.values(SCENE).reduce((a, b) => a + b, 0) -
  TRANSITION_FRAMES * NUM_TRANSITIONS;
// = 1125 - 72 = 1053 frames = 35.1s

// ─── Launch video ─────────────────────────────────────────────────────────────

export const LAUNCH_SCENE = {
  init:    120,   // 4.0s  — pure black terminal: npx reposcout init
  claude:  150,   // 5.0s  — VS Code / Claude Code UI: /reposcout command
  results: 195,   // 6.5s  — terminal results: recharts payoff
  skip:    105,   // 3.5s  — skip: custom business logic
} as const;

// All three transitions use fade() — shared dark backgrounds make crossdissolves
// feel like content changes rather than scene swaps.
// T1 is longer (spring-eased fade through black: init → claude).
// T2/T3 are brief linear fades (terminal-state swaps).
export const LAUNCH_T1_FRAMES = 18;
export const LAUNCH_T2_FRAMES = 10;
export const LAUNCH_T3_FRAMES = 6;

export const LAUNCH_TOTAL_FRAMES =
  Object.values(LAUNCH_SCENE).reduce((a, b) => a + b, 0) -
  LAUNCH_T1_FRAMES - LAUNCH_T2_FRAMES - LAUNCH_T3_FRAMES;
// = 570 - 18 - 10 - 6 = 536 frames ≈ 17.9s
