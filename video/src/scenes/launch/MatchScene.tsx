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

// ─── colors — grounded in the real RepoScout terminal output ─────────────────
const BG       = "#0d0d0d";
const WHITE    = "#e2e2e2";
const BOLD_W   = "#ffffff";
const GOLD     = "#d4a017";   // "Top Candidates" / "Recommendation" header
const GREEN    = "#3eb550";   // USE OSS checkmark + bar fill
const BRIGHT_G = "#4ade80";   // Score: n/100 badge
const BLUE     = "#6b9cf0";   // URLs
const MUTED    = "#666666";
const DIM_LINE = "#2a2a2a";   // separator lines
const BAR_BG   = "#1a2a1a";   // bar track background

// ─── Fade-in block ────────────────────────────────────────────────────────────

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

// ─── Score bar row ────────────────────────────────────────────────────────────
// Div-based bar matching Reference #8: solid green fill over dark track.
// Label | score | [====    ] | description

const ScoreRow: React.FC<{
  label: string;
  score: number;
  max: number;
  desc: string;
  delay: number;
}> = ({ label, score, max, desc, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rowP = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const rowOp = interpolate(rowP, [0, 1], [0, 1]);

  // Bar width animates from 0 → filled over ~22 frames
  const barW = interpolate(frame, [delay + 6, delay + 28], [0, (score / max) * 88], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity: rowOp,
        display: "flex",
        alignItems: "center",
        fontFamily: FONTS.mono,
        fontSize: 19,
        lineHeight: 1.9,
      }}
    >
      {/* Label — fixed width */}
      <span style={{ color: MUTED, width: 140, flexShrink: 0 }}>{label}</span>

      {/* Score — right-aligned fixed width */}
      <span
        style={{
          color: WHITE,
          width: 52,
          flexShrink: 0,
          textAlign: "right",
          marginRight: 12,
        }}
      >
        {score}/{max}
      </span>

      {/* Bar track + fill */}
      <div
        style={{
          width: 88,
          height: 13,
          background: BAR_BG,
          borderRadius: 2,
          flexShrink: 0,
          marginRight: 14,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: barW,
            background: GREEN,
            borderRadius: 2,
          }}
        />
      </div>

      {/* Description */}
      <span style={{ color: MUTED, fontSize: 18 }}>{desc}</span>
    </div>
  );
};

// ─── Horizontal separator line ────────────────────────────────────────────────
const Sep: React.FC<{ delay: number }> = ({ delay }) => (
  <F delay={delay} style={{ marginBottom: 10 }}>
    <div style={{ height: 1, background: DIM_LINE }} />
  </F>
);

// ─── Scene 3 — RepoScout results terminal ────────────────────────────────────
// 195 frames = 6.5s
// Layout matches Reference #8:
//   • iTerm2-style tab bar
//   • "Top Candidates (n retrieved)" in gold — gold separator
//   • recharts/recharts [github] Score: 90/100
//   • URL, description, stars
//   • Score breakdown with div-based animated bars
//   • gold "Recommendation" section
//   • ✓ USE OSS — the payoff
//   • Why bullets with • markers
//
// Key moments:
//   frame  18 → recharts + score header
//   frame  50 → score bars start filling
//   frame 108 → ✓ USE OSS (main payoff)
//   frame 128 → Why bullets

export const MatchScene: React.FC = () => {
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
          { label: "~/aidmind_core — -zsh" },
          { label: "...laude --dangerously-skip" },
          { label: "~/repo_source — -zsh", active: true },
          { label: "~/repo_source — -zsh" },
        ]}
      />

      {/* Terminal content */}
      <div
        style={{
          flex: 1,
          padding: "22px 48px 16px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Top Candidates header — gold, like reference */}
        <F
          delay={6}
          style={{
            fontFamily: FONTS.mono,
            fontSize: 22,
            fontWeight: 700,
            color: GOLD,
            marginBottom: 3,
          }}
        >
          Top Candidates{" "}
          <span style={{ color: "#4a4a2a", fontWeight: 400 }}>
            (10 retrieved, showing top 3)
          </span>
        </F>
        <Sep delay={10} />

        {/* ── Package: recharts ─────────────────────────────────────────── */}
        {/* Name + source + score */}
        <F
          delay={18}
          style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 2 }}
        >
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: 22,
              color: BOLD_W,
              fontWeight: 700,
            }}
          >
            🏆 recharts/recharts
          </span>
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: 17,
              color: "#555",
            }}
          >
            [github]
          </span>
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: 20,
              color: BRIGHT_G,
              fontWeight: 600,
            }}
          >
            Score: 90/100
          </span>
        </F>

        {/* URL */}
        <F
          delay={22}
          style={{
            fontFamily: FONTS.mono,
            fontSize: 18,
            color: BLUE,
            marginBottom: 2,
            paddingLeft: 28,
          }}
        >
          https://github.com/recharts/recharts
        </F>

        {/* Description */}
        <F
          delay={26}
          style={{
            fontFamily: FONTS.mono,
            fontSize: 18,
            color: MUTED,
            marginBottom: 6,
            paddingLeft: 28,
          }}
        >
          Redefined chart library built with React and D3
        </F>

        {/* Stars + meta */}
        <F
          delay={30}
          style={{
            display: "flex",
            gap: 18,
            marginBottom: 10,
            paddingLeft: 28,
          }}
        >
          {[
            "★ 27k stars",
            "📦 ~5.0M/mo",
            "📄 MIT",
            "🔷 TypeScript",
          ].map((item) => (
            <span
              key={item}
              style={{ fontFamily: FONTS.mono, fontSize: 18, color: "#888" }}
            >
              {item}
            </span>
          ))}
        </F>

        {/* Score breakdown */}
        <F
          delay={38}
          style={{
            fontFamily: FONTS.mono,
            fontSize: 18,
            color: MUTED,
            marginBottom: 4,
            paddingLeft: 28,
          }}
        >
          Score breakdown:
        </F>
        <div style={{ paddingLeft: 30 }}>
          <ScoreRow label="Feature Match"  score={22} max={30} desc="category keyword hits"      delay={46} />
          <ScoreRow label="Stack Match"    score={18} max={20} desc="JS/TS ecosystem fit"         delay={54} />
          <ScoreRow label="Maintenance"    score={20} max={20} desc="last push recency"           delay={62} />
          <ScoreRow label="License Safety" score={15} max={15} desc="MIT"                         delay={70} />
          <ScoreRow label="Popularity"     score={15} max={15} desc="stars / downloads"           delay={78} />
        </div>

        {/* Recommendation section ─────────────────────────────────────── */}
        <F
          delay={93}
          style={{
            fontFamily: FONTS.mono,
            fontSize: 22,
            fontWeight: 700,
            color: GOLD,
            marginTop: 16,
            marginBottom: 2,
          }}
        >
          Recommendation
        </F>
        <Sep delay={97} />

        {/* USE OSS — THE PAYOFF */}
        <F
          delay={108}
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: 22,
              color: GREEN,
            }}
          >
            ✓ USE OSS:
          </span>
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: 22,
              color: BOLD_W,
              fontWeight: 700,
            }}
          >
            recharts/recharts
          </span>
          <span style={{ fontFamily: FONTS.mono, fontSize: 19, color: MUTED }}>
            (score 90/100)
          </span>
        </F>

        {/* Why */}
        <F
          delay={116}
          style={{
            fontFamily: FONTS.mono,
            fontSize: 20,
            color: WHITE,
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          Why:
        </F>
        {[
          { text: "Matches: chart",                      delay: 121 },
          { text: "TypeScript",                          delay: 126 },
          { text: "Updated < 3 months ago",              delay: 131 },
          { text: "License: MIT",                        delay: 135 },
          { text: "27k stars, ~5.0M/mo downloads",       delay: 139 },
        ].map(({ text, delay }) => (
          <F
            key={text}
            delay={delay}
            style={{
              fontFamily: FONTS.mono,
              fontSize: 19,
              color: MUTED,
              paddingLeft: 4,
            }}
          >
            · {text}
          </F>
        ))}

        {/* Tradeoff line */}
        <F
          delay={148}
          style={{ marginTop: 12 }}
        >
          <div style={{ height: 1, background: DIM_LINE, marginBottom: 10 }} />
          <div style={{ fontFamily: FONTS.mono, fontSize: 18 }}>
            <span style={{ color: WHITE, fontWeight: 700 }}>Build from scratch?</span>
            {"  "}
            <span style={{ color: GREEN }}>No — OSS covers the core need</span>
          </div>
        </F>
      </div>
    </AbsoluteFill>
  );
};
