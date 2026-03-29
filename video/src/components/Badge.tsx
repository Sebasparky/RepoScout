import React from "react";
import { spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../constants";

type Variant = "match" | "skip" | "warning" | "info";

type Props = {
  label: string;
  variant?: Variant;
  delay?: number;
  size?: number;
};

const VARIANT_COLORS: Record<Variant, { bg: string; text: string; border: string }> = {
  match:   { bg: "#001a0e", text: COLORS.accent,   border: COLORS.accent },
  skip:    { bg: "#1a1a1a", text: COLORS.textMuted, border: COLORS.border },
  warning: { bg: "#1a1200", text: COLORS.yellow,    border: COLORS.yellow },
  info:    { bg: "#0a1020", text: COLORS.blue,      border: COLORS.blue },
};

export const Badge: React.FC<Props> = ({
  label,
  variant = "info",
  delay = 0,
  size = 28,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const scale = interpolate(progress, [0, 1], [0.8, 1]);

  const c = VARIANT_COLORS[variant];

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        background: c.bg,
        border: `1.5px solid ${c.border}`,
        borderRadius: 8,
        padding: `${size * 0.4}px ${size * 0.9}px`,
        fontFamily: FONTS.mono,
        fontSize: size,
        fontWeight: 600,
        color: c.text,
        opacity,
        transform: `scale(${scale})`,
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
};
