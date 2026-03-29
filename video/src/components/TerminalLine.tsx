import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../constants";

type Props = {
  prompt?: string;
  text: string;
  delay?: number;
  /** Fraction of total chars to reveal per second */
  charsPerSecond?: number;
  dimPrompt?: boolean;
  size?: number;
};

/** Typewriter-style terminal prompt line */
export const TerminalLine: React.FC<Props> = ({
  prompt = "> ",
  text,
  delay = 0,
  charsPerSecond = 20,
  dimPrompt = false,
  size = 36,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const elapsed = Math.max(0, frame - delay);
  const charsVisible = Math.floor((elapsed / fps) * charsPerSecond);
  const displayed = text.slice(0, charsVisible);
  const showCursor = charsVisible < text.length || (Math.floor(elapsed / (fps / 2)) % 2 === 0);

  const containerOpacity = interpolate(elapsed, [0, 6], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        fontFamily: FONTS.mono,
        fontSize: size,
        color: COLORS.textPrimary,
        opacity: containerOpacity,
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <span style={{ color: dimPrompt ? COLORS.textMuted : COLORS.accent }}>
        {prompt}
      </span>
      <span>{displayed}</span>
      {showCursor && (
        <span
          style={{
            display: "inline-block",
            width: size * 0.55,
            height: size,
            background: COLORS.accent,
            marginLeft: 2,
            verticalAlign: "bottom",
          }}
        />
      )}
    </div>
  );
};
