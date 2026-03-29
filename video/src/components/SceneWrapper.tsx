import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS, FONTS } from "../constants";

type Props = {
  children: React.ReactNode;
  /** Horizontal alignment of children. Default: "center" */
  align?: "left" | "center" | "right";
  /** Extra padding override */
  padding?: number;
};

/** Full-screen dark background with consistent safe-area padding */
export const SceneWrapper: React.FC<Props> = ({
  children,
  align = "center",
  padding = 100,
}) => {
  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        fontFamily: FONTS.sans,
        color: COLORS.textPrimary,
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : align === "left" ? "flex-start" : "flex-end",
        justifyContent: "center",
        padding,
        overflow: "hidden",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
