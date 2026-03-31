import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONTS } from "../../constants";

// ─── colors ──────────────────────────────────────────────────────────────────
const CYAN      = "#22d3ee";   // diamond bullets
const CYAN_LINE = "#0b3542";   // connecting vertical lines
const CYAN_VAL  = "#67e8f9";   // highlighted sub-values
const YELLOW    = "#f0a820";   // "optional" tag
const GREEN     = "#00cc66";   // success / done
const WHITE     = "#e8e8e8";
const MUTED     = "#6b7280";

// ─── Vertical connector line ─────────────────────────────────────────────────
// Grows downward at `delay`. Sits in the same 28px left column as diamonds.

const StepLine: React.FC<{ delay: number; height?: number }> = ({
  delay,
  height = 20,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const h = interpolate(p, [0, 1], [0, height]);
  return (
    <div style={{ display: "flex" }}>
      <div
        style={{
          width: 28,
          flexShrink: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{ width: 1, height: h, background: CYAN_LINE }} />
      </div>
    </div>
  );
};

// ─── Single install step ──────────────────────────────────────────────────────
// Renders a ◇ bullet + label text + optional indented sub-line.
// The left column also draws a connector line down to the next step if `sub`
// is present (the line runs alongside the sub-item text).

const Step: React.FC<{
  text: React.ReactNode;
  sub?: React.ReactNode;
  delay: number;
}> = ({ text, sub, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Main label pops in
  const p = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const opacity = interpolate(p, [0, 1], [0, 1]);
  const y      = interpolate(p, [0, 1], [5, 0]);

  // Sub-line reveals slightly after
  const subP  = spring({ frame: frame - (delay + 6), fps, config: { damping: 200 } });
  const subOp = interpolate(subP, [0, 1], [0, 1]);
  const subY  = interpolate(subP, [0, 1], [4, 0]);

  return (
    <div style={{ display: "flex" }}>
      {/* Left: diamond + optional side-line for sub-content */}
      <div
        style={{
          width: 28,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity,
          transform: `translateY(${y}px)`,
        }}
      >
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 19,
            color: CYAN,
            lineHeight: 1.5,
            flexShrink: 0,
          }}
        >
          ◇
        </span>
        {/* Side line runs alongside sub-item */}
        {sub && (
          <div
            style={{
              width: 1,
              flex: 1,
              background: CYAN_LINE,
              marginTop: 2,
              opacity: subOp,
            }}
          />
        )}
      </div>

      {/* Right: text content */}
      <div
        style={{
          flex: 1,
          paddingLeft: 14,
          paddingBottom: sub ? 10 : 0,
        }}
      >
        <div
          style={{
            opacity,
            transform: `translateY(${y}px)`,
            fontFamily: FONTS.mono,
            fontSize: 27,
            color: WHITE,
            lineHeight: 1.35,
          }}
        >
          {text}
        </div>
        {sub && (
          <div
            style={{
              opacity: subOp,
              transform: `translateY(${subY}px)`,
              fontFamily: FONTS.mono,
              fontSize: 21,
              color: MUTED,
              marginTop: 4,
              lineHeight: 1.45,
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Scene 1 — Dramatic terminal open + realistic install flow ────────────────
// 120 frames = 4s
//
// Structural rhythm from the install reference:
//   ◇  step label
//   │
//   ◇  step with sub-item
//   │  sub value
//   │
//   ◇  ...
//
// Timeline:
//   frame  0  → typing "npx reposcout init" (30 cps, done ~frame 18)
//   frame 22  → ◇ Checking prerequisites
//   frame 30  → │ (connector)
//   frame 36  → ◇ Creating .env file  │  ~/.reposcout/.env
//   frame 50  → │ (connector)
//   frame 55  → ◇ GITHUB_TOKEN  optional  │  press enter to skip
//   frame 70  → │ (connector)
//   frame 75  → ◇ Claude skill installed  │  → .claude/skills/reposcout
//   frame 90  → │ (connector)
//   frame 94  → ◇ Done. Use /reposcout in Claude.
//   frame 100+ → hold

export const InitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const COMMAND = "npx reposcout init";
  const CPS = 30;
  const chars    = Math.floor(frame / fps * CPS);
  const typed    = COMMAND.slice(0, chars);
  const cursorOn = Math.floor(frame / (fps / 2)) % 2 === 0;
  const FS = 76;

  return (
    <AbsoluteFill style={{ background: "#000000", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: 220,
          left: 110,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Main command — huge, like Reference 1 ──────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            fontFamily: FONTS.mono,
            fontWeight: 400,
            lineHeight: 1,
            gap: 22,
            marginBottom: 44,
          }}
        >
          <span style={{ fontSize: FS, color: "#555555" }}>$</span>
          <span style={{ fontSize: FS, color: "#ffffff" }}>{typed}</span>
          {cursorOn && (
            <span
              style={{
                display: "inline-block",
                width: Math.round(FS * 0.55),
                height: Math.round(FS * 1.02),
                background: "#ffffff",
                flexShrink: 0,
                marginTop: 2,
              }}
            />
          )}
        </div>

        {/* ── Install steps with ◇ bullets and │ connectors ──────────────── */}
        {/* Step 0 */}
        <Step
          delay={22}
          text="Checking prerequisites"
        />
        <StepLine delay={30} height={20} />

        {/* Step 1 */}
        <Step
          delay={36}
          text="Creating .env file"
          sub={<span style={{ color: CYAN_VAL }}>~/.reposcout/.env</span>}
        />
        <StepLine delay={50} height={18} />

        {/* Step 2 */}
        <Step
          delay={55}
          text={
            <>
              GITHUB_TOKEN{" "}
              <span style={{ color: YELLOW, fontSize: 23 }}>optional</span>
            </>
          }
          sub="press enter to skip"
        />
        <StepLine delay={70} height={18} />

        {/* Step 3 */}
        <Step
          delay={75}
          text="Claude skill installed"
          sub={
            <span style={{ color: GREEN }}>
              → .claude/skills/reposcout
            </span>
          }
        />
        <StepLine delay={88} height={18} />

        {/* Step 4 — final */}
        <Step
          delay={94}
          text={
            <>
              Done.{" "}
              <span style={{ color: GREEN }}>Use /reposcout in Claude.</span>
            </>
          }
        />
      </div>
    </AbsoluteFill>
  );
};
