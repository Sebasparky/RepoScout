import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Badge } from "../components/Badge";
import { OSSCard } from "../components/OSSCard";
import { TerminalLine } from "../components/TerminalLine";
import { COLORS, FONTS } from "../constants";

const candidates = [
  {
    rank: 1,
    name: "nextauthjs/next-auth",
    stars: "24k",
    license: "ISC",
    score: 91,
    why: "Matches: auth · TypeScript · maintained",
    highlight: true,
  },
  {
    rank: 2,
    name: "stack-auth/stack-auth",
    stars: "6.7k",
    license: "—",
    score: 78,
    why: "Matches: auth · TypeScript",
    highlight: false,
  },
  {
    rank: 3,
    name: "clerk/nextjs-auth-starter",
    stars: "420",
    license: "—",
    score: 74,
    why: "Matches: auth · Next.js",
    highlight: false,
  },
];

/** Scene 4 — Auth example (9s) */
export const AuthScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Section label
  const labelProgress = spring({ frame, fps, config: { damping: 200 } });
  const labelOpacity = interpolate(labelProgress, [0, 1], [0, 1]);

  // Badge: "Strong OSS match found"
  const badgeDelay = 18;

  // Cards staggered
  const cardsStartDelay = 30;

  // Action row
  const confProgress = spring({ frame: frame - 60, fps, config: { damping: 200 } });
  const confOpacity = interpolate(confProgress, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "80px 120px",
        gap: 36,
        overflow: "hidden",
      }}
    >
      {/* Top label + badge row */}
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div style={{ opacity: labelOpacity }}>
          <TerminalLine
            prompt=">"
            text='add auth to my Next.js app'
            delay={0}
            charsPerSecond={45}
            size={32}
          />
        </div>
      </div>

      {/* Badge */}
      <Badge
        label="Strong OSS match found · confidence 91%"
        variant="match"
        delay={badgeDelay}
        size={26}
      />

      {/* OSS Cards */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          width: "100%",
        }}
      >
        {candidates.map((c, i) => (
          <OSSCard key={c.name} {...c} delay={cardsStartDelay + i * 12} />
        ))}
      </div>

      {/* Prompt line at bottom */}
      <div
        style={{
          opacity: confOpacity,
          marginTop: 8,
          display: "flex",
          gap: 16,
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 26,
            color: COLORS.textMuted,
          }}
        >
          Use OSS
        </span>
        <span style={{ color: COLORS.border, fontSize: 20 }}>·</span>
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 26,
            color: COLORS.textMuted,
          }}
        >
          Compare options
        </span>
        <span style={{ color: COLORS.border, fontSize: 20 }}>·</span>
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 26,
            color: COLORS.textMuted,
          }}
        >
          Continue custom
        </span>
      </div>
    </AbsoluteFill>
  );
};
