import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONTS } from "../constants";

const problems = [
  { text: "Generate from scratch" },
  { text: "More tokens, more iteration" },
  { text: "Better OSS may already exist" },
];

function ProblemRow({
  text,
  delay,
}: {
  text: string;
  delay: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const x = interpolate(progress, [0, 1], [-50, 0]);

  return (
    <div
      style={{
        opacity,
        transform: `translateX(${x}px)`,
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "20px 32px",
        borderRadius: 12,
        border: `1px solid ${COLORS.border}`,
        background: COLORS.surface,
        width: 700,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: COLORS.textMuted,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: FONTS.sans,
          fontSize: 34,
          color: COLORS.textSecondary,
          fontWeight: 500,
        }}
      >
        {text}
      </span>
    </div>
  );
}

/** Scene 2 — Problem (7s) */
export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Prompt bubble
  const promptProgress = spring({ frame, fps, config: { damping: 200 } });
  const promptOpacity = interpolate(promptProgress, [0, 1], [0, 1]);
  const promptY = interpolate(promptProgress, [0, 1], [30, 0]);

  // Label
  const labelProgress = spring({ frame: frame - 7, fps, config: { damping: 200 } });
  const labelOpacity = interpolate(labelProgress, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 48,
        padding: 100,
        overflow: "hidden",
      }}
    >
      {/* Developer prompt */}
      <div
        style={{
          opacity: promptOpacity,
          transform: `translateY(${promptY}px)`,
          background: COLORS.surfaceHigh,
          border: `1px solid ${COLORS.borderBright}`,
          borderRadius: 16,
          padding: "28px 48px",
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <span style={{ fontSize: 34, color: COLORS.textMuted, fontFamily: FONTS.mono }}>
          &gt;
        </span>
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 34,
            color: COLORS.textPrimary,
          }}
        >
          add payments to my app
        </span>
      </div>

      {/* Arrow */}
      <div
        style={{
          opacity: labelOpacity,
          fontFamily: FONTS.mono,
          fontSize: 28,
          color: COLORS.textMuted,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span>Without RepoScout, Claude goes straight to:</span>
        <span style={{ fontSize: 36, color: COLORS.textMuted, marginTop: 4 }}>↓</span>
      </div>

      {/* Problems list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {problems.map((p, i) => (
          <ProblemRow key={p.text} text={p.text} delay={10 + i * 6} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
