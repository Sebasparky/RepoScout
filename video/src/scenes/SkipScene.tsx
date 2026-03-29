import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Badge } from "../components/Badge";
import { TerminalLine } from "../components/TerminalLine";
import { COLORS, FONTS } from "../constants";

/** Scene 6 — Skip case (7s) */
export const SkipScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const skipProgress = spring({ frame: frame - 18, fps, config: { damping: 200 } });
  const skipOpacity = interpolate(skipProgress, [0, 1], [0, 1]);
  const skipY = interpolate(skipProgress, [0, 1], [30, 0]);

  const continueProgress = spring({ frame: frame - 36, fps, config: { damping: 200 } });
  const continueOpacity = interpolate(continueProgress, [0, 1], [0, 1]);
  const continueY = interpolate(continueProgress, [0, 1], [20, 0]);

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 120px",
        gap: 44,
        overflow: "hidden",
      }}
    >
      {/* Terminal prompt */}
      <TerminalLine
        prompt=">"
        text="implement our internal approval workflow"
        delay={0}
        charsPerSecond={25}
        size={34}
      />

      {/* Badge: skip */}
      <div
        style={{
          opacity: skipOpacity,
          transform: `translateY(${skipY}px)`,
        }}
      >
        <Badge
          label="No strong OSS match — business logic"
          variant="skip"
          delay={18}
          size={26}
        />
      </div>

      {/* Result */}
      <div
        style={{
          opacity: continueOpacity,
          transform: `translateY(${continueY}px)`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: FONTS.sans,
            fontSize: 72,
            fontWeight: 800,
            color: COLORS.textPrimary,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
          }}
        >
          Continue directly.
        </div>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 30,
            color: COLORS.textMuted,
            marginTop: 16,
          }}
        >
          RepoScout stays out of the way.
        </div>
      </div>

      {/* Silence indicator */}
      <div
        style={{
          opacity: continueOpacity,
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontFamily: FONTS.mono,
          fontSize: 24,
          color: COLORS.textMuted,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 100,
          padding: "12px 32px",
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: COLORS.textMuted,
            display: "inline-block",
          }}
        />
        silent
      </div>
    </AbsoluteFill>
  );
};
