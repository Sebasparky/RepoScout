import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONTS } from "../constants";

/** Scene 7 — Closing (8s) */
export const ClosingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // "Only interrupts when confidence is high"
  const line1 = spring({ frame, fps, config: { damping: 200 } });
  const line1Opacity = interpolate(line1, [0, 1], [0, 1]);
  const line1Y = interpolate(line1, [0, 1], [50, 0]);

  // "RepoScout" brand
  const brand = spring({ frame: frame - 14, fps, config: { damping: 200 } });
  const brandOpacity = interpolate(brand, [0, 1], [0, 1]);
  const brandScale = interpolate(brand, [0, 1], [0.9, 1]);

  // Tagline
  const tagline = spring({ frame: frame - 26, fps, config: { damping: 200 } });
  const taglineOpacity = interpolate(tagline, [0, 1], [0, 1]);

  // Accent bar beneath brand
  const barWidth = interpolate(frame, [16, 42], [0, 100], {
    extrapolateRight: "clamp",
  });

  // Subtle radial glow
  const glowOpacity = interpolate(frame, [14, 40], [0, 0.12], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 44,
        overflow: "hidden",
      }}
    >
      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${COLORS.accent}, transparent)`,
          opacity: glowOpacity,
          pointerEvents: "none",
        }}
      />

      {/* Confidence line */}
      <div
        style={{
          opacity: line1Opacity,
          transform: `translateY(${line1Y}px)`,
          fontFamily: FONTS.mono,
          fontSize: 34,
          color: COLORS.textMuted,
          letterSpacing: "0.01em",
          textAlign: "center",
        }}
      >
        Only interrupts when confidence is high.
      </div>

      {/* Brand */}
      <div
        style={{
          opacity: brandOpacity,
          transform: `scale(${brandScale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
          position: "relative",
        }}
      >
        <div
          style={{
            fontFamily: FONTS.sans,
            fontSize: 140,
            fontWeight: 900,
            color: COLORS.textPrimary,
            letterSpacing: "-0.05em",
            lineHeight: 1,
          }}
        >
          RepoScout
        </div>

        {/* Animated accent underline */}
        <div
          style={{
            height: 6,
            width: `${barWidth}%`,
            background: COLORS.accent,
            borderRadius: 3,
            marginTop: 8,
            alignSelf: "flex-start",
          }}
        />
      </div>

      {/* Tagline */}
      <div
        style={{
          opacity: taglineOpacity,
          fontFamily: FONTS.mono,
          fontSize: 36,
          color: COLORS.accent,
          letterSpacing: "0.02em",
          textAlign: "center",
        }}
      >
        Build less. Reuse better.
      </div>
    </AbsoluteFill>
  );
};
