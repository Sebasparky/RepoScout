import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONTS } from "../constants";

/** Scene 1 — Hook (3s)
 *  "Stop reinventing code"  →  "Before Claude generates, RepoScout checks OSS first"
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Line 1: big white headline
  const line1 = spring({ frame, fps, config: { damping: 200 } });
  const line1Opacity = interpolate(line1, [0, 1], [0, 1]);
  const line1Y = interpolate(line1, [0, 1], [80, 0]);

  // Line 2: green tagline, delayed
  const line2 = spring({ frame: frame - 10, fps, config: { damping: 200 } });
  const line2Opacity = interpolate(line2, [0, 1], [0, 1]);
  const line2Y = interpolate(line2, [0, 1], [40, 0]);

  // Accent underline on "reinventing"
  const underlineWidth = interpolate(frame, [8, 30], [0, 100], {
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
        gap: 40,
        overflow: "hidden",
      }}
    >
      {/* Subtle grid background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(${COLORS.border} 1px, transparent 1px),
            linear-gradient(90deg, ${COLORS.border} 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
          opacity: 0.3,
        }}
      />

      {/* Main headline */}
      <div
        style={{
          opacity: line1Opacity,
          transform: `translateY(${line1Y}px)`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: FONTS.sans,
            fontSize: 128,
            fontWeight: 900,
            color: COLORS.textPrimary,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          Stop{" "}
          <span style={{ position: "relative", display: "inline-block" }}>
            reinventing
            {/* Animated strikethrough */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: "55%",
                height: 8,
                width: `${underlineWidth}%`,
                background: COLORS.accent,
                borderRadius: 4,
              }}
            />
          </span>{" "}
          code.
        </div>
      </div>

      {/* Tagline */}
      <div
        style={{
          opacity: line2Opacity,
          transform: `translateY(${line2Y}px)`,
          fontFamily: FONTS.mono,
          fontSize: 36,
          color: COLORS.accent,
          letterSpacing: "0.01em",
          textAlign: "center",
        }}
      >
        Before Claude generates — RepoScout checks OSS first.
      </div>
    </AbsoluteFill>
  );
};
