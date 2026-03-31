import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TerminalTabBar } from "../../components/TerminalTabBar";
import { FONTS } from "../../constants";

// ─── colors — matches Reference #11 exactly ──────────────────────────────────
const BG      = "#0d0d0d";
const CYAN    = "#22d3ee";   // "RepoScout:" prefix + skip phrase
const WHITE   = "#e8e8e8";   // "Continuing with direct implementation."
const DIM_CMD = "#555555";   // npm-run-style command lines
const MUTED   = "#6b6b6b";   // body of skip message

// ─── Fade-in helper ───────────────────────────────────────────────────────────

const F: React.FC<{
  delay: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        opacity: interpolate(p, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(p, [0, 1], [5, 0])}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ─── Scene 4 — Correct skip ───────────────────────────────────────────────────
// 105 frames = 3.5s
//
// Visual reference: Reference #11 screenshot.
// Structure:
//   [command execution lines — appear instantly]
//   [blank gap]
//   [RepoScout: OSS search skipped — ... Continuing with direct implementation.]
//
// The skip message uses Reference #11's exact color split:
//   "RepoScout: OSS search skipped —"  → CYAN
//   "Task does not appear..."           → muted/gray
//   "Continuing with direct implementation."  → bold WHITE
//
// Timeline:
//   frame  0 → command lines appear
//   frame 20 → RepoScout skip message
//   frame 50+ → hold

export const SkipLaunchScene: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: BG,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Tab bar */}
      <TerminalTabBar
        tabs={[
          { label: "~/repo_source — -zsh", active: true },
          { label: "...laude --dangerously-skip" },
        ]}
      />

      {/* Terminal content */}
      <div
        style={{
          flex: 1,
          padding: "32px 48px 20px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ── Command execution lines ────────────────────────────────────── */}
        {/* Mirrors the npm-run / tsx-style output in Reference #11 */}
        <F
          delay={0}
          style={{
            fontFamily: FONTS.mono,
            fontSize: 20,
            color: DIM_CMD,
            lineHeight: 1.6,
          }}
        >
          &gt; reposcout@0.1.0 dev
        </F>
        <F
          delay={4}
          style={{
            fontFamily: FONTS.mono,
            fontSize: 20,
            color: DIM_CMD,
            lineHeight: 1.6,
            marginBottom: 28,
          }}
        >
          &gt; tsx src/cli.ts add our internal approval workflow with reviewer notes
        </F>

        {/* ── RepoScout response — exactly Reference #11 format ─────────── */}
        <F
          delay={20}
          style={{
            fontFamily: FONTS.mono,
            fontSize: 22,
            lineHeight: 1.7,
            maxWidth: 1500,
          }}
        >
          {/* "RepoScout: OSS search skipped —" in cyan */}
          <span style={{ color: CYAN, fontWeight: 600 }}>
            RepoScout:{" "}
          </span>
          <span style={{ color: CYAN }}>
            OSS search skipped —{" "}
          </span>
          {/* Middle body in muted */}
          <span style={{ color: MUTED }}>
            Task does not appear to be an OSS-solvable feature request.{" "}
          </span>
          {/* Conclusion in bold white */}
          <span style={{ color: WHITE, fontWeight: 600 }}>
            Continuing with direct implementation.
          </span>
        </F>
      </div>
    </AbsoluteFill>
  );
};
