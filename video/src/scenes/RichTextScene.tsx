import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Badge } from "../components/Badge";
import { OSSCard } from "../components/OSSCard";
import { TerminalLine } from "../components/TerminalLine";
import { COLORS, FONTS } from "../constants";

const candidates = [
  {
    rank: 1,
    name: "yoopta-editor/Yoopta-Editor",
    stars: "2.9k",
    license: "MIT",
    score: 95,
    why: "Matches: rich text editor · TypeScript · < 3mo",
    highlight: true,
  },
  {
    rank: 2,
    name: "Doist/typist",
    stars: "584",
    license: "MIT",
    score: 83,
    why: "Matches: rich, text, editor · TypeScript",
    highlight: false,
  },
  {
    rank: 3,
    name: "TypeCellOS/BlockNote",
    stars: "9.3k",
    license: "—",
    score: 77,
    why: "Matches: editor · TypeScript · popular",
    highlight: false,
  },
];

/** Scene 5 — Rich text editor example (9s) */
export const RichTextScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardsStartDelay = 28;

  const confProgress = spring({ frame: frame - 60, fps, config: { damping: 200 } });
  const confOpacity = interpolate(confProgress, [0, 1], [0, 1]);

  // "auto-triggered" label
  const autoProgress = spring({ frame: frame - 16, fps, config: { damping: 200 } });
  const autoOpacity = interpolate(autoProgress, [0, 1], [0, 1]);
  const autoX = interpolate(autoProgress, [0, 1], [20, 0]);

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "80px 120px",
        gap: 36,
        overflow: "hidden",
      }}
    >
      {/* Prompt */}
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <TerminalLine
          prompt=">"
          text="I need a rich text editor"
          delay={0}
          charsPerSecond={45}
          size={32}
        />

        {/* "auto-triggered" tag */}
        <div
          style={{
            opacity: autoOpacity,
            transform: `translateX(${autoX}px)`,
            fontFamily: FONTS.mono,
            fontSize: 22,
            color: COLORS.accentDim,
            background: "#001a0e",
            border: `1px solid ${COLORS.accentDim}`,
            borderRadius: 100,
            padding: "6px 18px",
            whiteSpace: "nowrap",
          }}
        >
          auto-triggered
        </div>
      </div>

      {/* Badge */}
      <Badge
        label="Strong OSS match found · confidence 95%"
        variant="match"
        delay={16}
        size={26}
      />

      {/* OSS Cards */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          width: "100%",
        }}
      >
        {candidates.map((c, i) => (
          <OSSCard key={c.name} {...c} delay={cardsStartDelay + i * 12} />
        ))}
      </div>

      {/* Action row */}
      <div
        style={{
          opacity: confOpacity,
          marginTop: 8,
          display: "flex",
          gap: 16,
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 26,
            color: COLORS.textMuted,
          }}
        >
          Use OSS
        </span>
        <span style={{ color: COLORS.border, fontSize: 20 }}>·</span>
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 26,
            color: COLORS.textMuted,
          }}
        >
          Compare options
        </span>
        <span style={{ color: COLORS.border, fontSize: 20 }}>·</span>
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 26,
            color: COLORS.textMuted,
          }}
        >
          Continue custom
        </span>
      </div>
    </AbsoluteFill>
  );
};
