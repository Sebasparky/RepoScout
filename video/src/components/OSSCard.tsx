import React from "react";
import { spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../constants";

type Props = {
  rank: number;
  name: string;
  stars: string;
  license: string;
  score: number;
  why: string;
  delay?: number;
  highlight?: boolean;
};

export const OSSCard: React.FC<Props> = ({
  rank,
  name,
  stars,
  license,
  score,
  why,
  delay = 0,
  highlight = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateX = interpolate(progress, [0, 1], [40, 0]);

  const border = highlight ? COLORS.accent : COLORS.border;
  const bg = highlight ? "#0a1a0f" : COLORS.surface;

  return (
    <div
      style={{
        opacity,
        transform: `translateX(${translateX}px)`,
        display: "flex",
        alignItems: "center",
        gap: 28,
        background: bg,
        border: `1.5px solid ${border}`,
        borderRadius: 12,
        padding: "22px 32px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Rank */}
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 28,
          color: highlight ? COLORS.accent : COLORS.textMuted,
          fontWeight: 700,
          width: 32,
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        {rank}
      </div>

      {/* Name + why */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 30,
            fontWeight: 600,
            color: highlight ? COLORS.accent : COLORS.textPrimary,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontFamily: FONTS.sans,
            fontSize: 22,
            color: COLORS.textMuted,
            marginTop: 6,
          }}
        >
          {why}
        </div>
      </div>

      {/* Stars */}
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 24,
          color: COLORS.yellow,
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        ★ {stars}
      </div>

      {/* License */}
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 22,
          color: COLORS.textMuted,
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {license}
      </div>

      {/* Score */}
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 30,
          fontWeight: 700,
          color: highlight ? COLORS.accent : COLORS.textSecondary,
          whiteSpace: "nowrap",
          flexShrink: 0,
          minWidth: 80,
          textAlign: "right",
        }}
      >
        {score}
        <span style={{ fontSize: 18, color: COLORS.textMuted }}>/100</span>
      </div>
    </div>
  );
};
