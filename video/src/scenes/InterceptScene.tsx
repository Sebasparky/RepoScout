import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONTS } from "../constants";

/** Scene 3 — RepoScout Intercept (7s)
 *  Visualizes the skill triggering before Claude generates.
 */
export const InterceptScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Flow diagram: user → skill → decision
  const step1 = spring({ frame, fps, config: { damping: 200 } });
  const step2 = spring({ frame: frame - 10, fps, config: { damping: 200 } });
  const step3 = spring({ frame: frame - 20, fps, config: { damping: 200 } });
  const labelIn = spring({ frame: frame - 28, fps, config: { damping: 200 } });

  const arrowWidth1 = interpolate(step2, [0, 1], [0, 100]);
  const arrowWidth2 = interpolate(step3, [0, 1], [0, 100]);

  const panelOpacity = interpolate(labelIn, [0, 1], [0, 1]);
  const panelY = interpolate(labelIn, [0, 1], [40, 0]);

  // Glow pulse on intercept box (timed to match shorter scene)
  const pulse = interpolate(
    frame,
    [28, 40, 55, 70, 85],
    [0, 1, 0, 1, 0],
    { extrapolateRight: "clamp" }
  );
  const glowOpacity = interpolate(pulse, [0, 1], [0.3, 0.9]);

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 60,
        padding: 100,
        overflow: "hidden",
      }}
    >
      {/* Top label */}
      <div
        style={{
          fontFamily: FONTS.sans,
          fontSize: 36,
          color: COLORS.textMuted,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          opacity: interpolate(step1, [0, 1], [0, 1]),
        }}
      >
        RepoScout runs before every generation
      </div>

      {/* Flow row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
        }}
      >
        {/* Node: User request */}
        <FlowNode label="User request" color={COLORS.blue} progress={step1} />

        {/* Arrow 1 */}
        <FlowArrow widthPct={arrowWidth1} />

        {/* Node: RepoScout — highlighted */}
        <div
          style={{
            transform: `scale(${interpolate(step2, [0, 1], [0.8, 1])})`,
            opacity: interpolate(step2, [0, 1], [0, 1]),
            background: "#001a0e",
            border: `2px solid ${COLORS.accent}`,
            borderRadius: 16,
            padding: "24px 40px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            boxShadow: `0 0 ${40 + pulse * 20}px ${glowOpacity * 0.6}px ${COLORS.accent}`,
            position: "relative",
          }}
        >
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 32,
              fontWeight: 700,
              color: COLORS.accent,
            }}
          >
            RepoScout
          </div>
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 20,
              color: COLORS.accentDim,
            }}
          >
            skill
          </div>
        </div>

        {/* Arrow 2 */}
        <FlowArrow widthPct={arrowWidth2} />

        {/* Node: Claude */}
        <FlowNode label="Claude" color={COLORS.textMuted} progress={step3} />
      </div>

      {/* Decision panel */}
      <div
        style={{
          opacity: panelOpacity,
          transform: `translateY(${panelY}px)`,
          display: "flex",
          gap: 24,
        }}
      >
        <DecisionPill label="Strong match?" color={COLORS.accent} icon="✦" />
        <DecisionPill label="Surface OSS" color={COLORS.accent} icon="→" />
        <DecisionPill label="Otherwise" color={COLORS.textMuted} icon="·" />
        <DecisionPill label="Stay silent" color={COLORS.textMuted} icon="→" />
      </div>
    </AbsoluteFill>
  );
};

function FlowNode({
  label,
  color,
  progress,
}: {
  label: string;
  color: string;
  progress: number;
}) {
  return (
    <div
      style={{
        transform: `scale(${interpolate(progress, [0, 1], [0.8, 1])})`,
        opacity: interpolate(progress, [0, 1], [0, 1]),
        background: COLORS.surface,
        border: `1.5px solid ${color}`,
        borderRadius: 16,
        padding: "24px 40px",
        fontFamily: FONTS.mono,
        fontSize: 30,
        fontWeight: 600,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
}

function FlowArrow({ widthPct }: { widthPct: number }) {
  return (
    <div
      style={{
        width: 120,
        height: 2,
        background: COLORS.borderBright,
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          height: "100%",
          width: `${widthPct}%`,
          background: COLORS.accent,
        }}
      />
      {/* Arrow head */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: "50%",
          transform: "translateY(-50%)",
          width: 0,
          height: 0,
          borderTop: "6px solid transparent",
          borderBottom: "6px solid transparent",
          borderLeft: `8px solid ${COLORS.borderBright}`,
        }}
      />
    </div>
  );
}

function DecisionPill({
  label,
  color,
  icon,
}: {
  label: string;
  color: string;
  icon: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 100,
        padding: "12px 28px",
        fontFamily: FONTS.mono,
        fontSize: 24,
        color,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ opacity: 0.6 }}>{icon}</span>
      {label}
    </div>
  );
}
