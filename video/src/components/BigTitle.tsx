import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../constants";

type Props = {
  text: string;
  size?: number;
  color?: string;
  weight?: number;
  delay?: number;
  /** "up" slides up from below; "scale" scales in; "fade" fades in */
  entrance?: "up" | "scale" | "fade";
  align?: "left" | "center" | "right";
  tracking?: string;
  lineHeight?: number;
};

export const BigTitle: React.FC<Props> = ({
  text,
  size = 120,
  color = COLORS.textPrimary,
  weight = 800,
  delay = 0,
  entrance = "up",
  align = "center",
  tracking = "-0.02em",
  lineHeight = 1.1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateY =
    entrance === "up"
      ? interpolate(progress, [0, 1], [60, 0])
      : 0;
  const scale =
    entrance === "scale"
      ? interpolate(progress, [0, 1], [0.85, 1])
      : 1;

  return (
    <div
      style={{
        fontFamily: FONTS.sans,
        fontSize: size,
        fontWeight: weight,
        color,
        letterSpacing: tracking,
        lineHeight,
        textAlign: align,
        opacity,
        transform: `translateY(${translateY}px) scale(${scale})`,
        willChange: "transform, opacity",
      }}
    >
      {text}
    </div>
  );
};
