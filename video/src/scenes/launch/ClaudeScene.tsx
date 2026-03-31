import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONTS } from "../../constants";

// ─── Layout constants (1920 × 1080) ──────────────────────────────────────────
const ACT_W     = 48;   // VS Code activity bar
const EXP_W     = 196;  // file explorer panel
const SIDE_W    = ACT_W + EXP_W;
const TITLE_H   = 28;   // macOS title bar
const TAB_H     = 35;   // editor tab bar
const TERM_TAB  = 34;   // terminal panel tab bar
const TERM_H    = 446;  // terminal panel height
const EDITOR_H  = 1080 - TITLE_H - TAB_H - TERM_TAB - TERM_H;
// = 1080 - 28 - 35 - 34 - 446 = 537

// ─── Fake editor code (dimmed, suggests open file) ───────────────────────────
const CODE: Array<{ indent: number; text: string; color?: string }> = [
  { indent: 0, text: "import React from 'react';" },
  { indent: 0, text: "import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';" },
  { indent: 0, text: "" },
  { indent: 0, text: "interface KPIData {" },
  { indent: 1, text: "label: string;" },
  { indent: 1, text: "value: number;" },
  { indent: 1, text: "change: number;" },
  { indent: 0, text: "}" },
  { indent: 0, text: "" },
  { indent: 0, text: "export const KPIChart: React.FC<{ data: KPIData[] }> = ({ data }) => {" },
  { indent: 1, text: "return (" },
  { indent: 2, text: "<BarChart width={600} height={300} data={data}>" },
  { indent: 3, text: "<XAxis dataKey=\"label\" />" },
];

// ─── Scene 2 — Realistic VS Code + Claude Code UI ────────────────────────────
// 150 frames = 5s
// Layout mirrors Reference 2:
//   • macOS title bar
//   • VS Code activity bar + file explorer
//   • Editor area (dimmed code, faint cursor)
//   • Terminal tab bar (Problems / Output / Terminal active / Ports)
//   • Terminal area: Claude Code TUI with /reposcout command being typed
//
// Timing:
//   frame  0 → UI fades in
//   frame 22 → typing /reposcout add a chart for KPI metrics (48 cps → done ~frame 47)
//   frame 62 → "↓ RepoScout checking OSS matches..." appears
//   frame 75+ → hold

// Frames T1 = 12: wipe completes before chrome appears, so the transition edge
// is invisible (black-on-black). Chrome fades in after the wipe finishes.
const CHROME_DELAY = 12;

export const ClaudeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // VS Code chrome fades in after the wipe transition completes
  const chromeP = spring({ frame: frame - CHROME_DELAY, fps, config: { damping: 180 } });
  const chromeOpacity = interpolate(chromeP, [0, 1], [0, 1]);

  // Typewriter for the command
  const TYPING_DELAY = 22;
  const COMMAND = "/reposcout add a chart for KPI metrics";
  const CPS = 48;
  const elapsed = Math.max(0, frame - TYPING_DELAY);
  const charsVisible = Math.floor(elapsed / fps * CPS);
  const typed = COMMAND.slice(0, charsVisible);
  const done = charsVisible >= COMMAND.length;
  const cursorOn = Math.floor(frame / (fps / 2)) % 2 === 0;

  // "intercepting" line appears after command is submitted
  const SUBMIT_F = TYPING_DELAY + Math.ceil(COMMAND.length / CPS * fps) + 14;
  const interceptP = spring({ frame: frame - SUBMIT_F, fps, config: { damping: 200 } });
  const interceptOpacity = interpolate(interceptP, [0, 1], [0, 1]);
  const interceptY = interpolate(interceptP, [0, 1], [10, 0]);

  const showCursor = !done || frame < SUBMIT_F - 5;

  return (
    <AbsoluteFill style={{ background: "#000000", overflow: "hidden" }}>
      {/* All VS Code chrome fades in after the wipe transition clears */}
      <div style={{ position: "absolute", inset: 0, opacity: chromeOpacity }}>
      {/* ── macOS title bar ──────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: TITLE_H,
          background: "#323232",
          display: "flex",
          alignItems: "center",
          paddingLeft: 14,
          gap: 8,
        }}
      >
        {(["#ff5f57", "#ffbd2e", "#28c840"] as const).map((c) => (
          <div
            key={c}
            style={{ width: 13, height: 13, borderRadius: "50%", background: c, flexShrink: 0 }}
          />
        ))}
        <span
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: FONTS.mono,
            fontSize: 13,
            color: "#aaa",
            whiteSpace: "nowrap",
            letterSpacing: "0.01em",
          }}
        >
          repo_source — zsh — 172×48
        </span>
      </div>

      {/* ── Activity bar ─────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: TITLE_H, left: 0,
          width: ACT_W,
          bottom: 0,
          background: "#333333",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 14,
          gap: 20,
        }}
      >
        {/* Simplified activity icons */}
        {[
          "M 12 4 L 4 8 L 4 20 L 20 20 L 20 8 Z M 8 20 L 8 14 L 16 14 L 16 20",
          "M 5 5 L 19 5 L 19 19 L 5 19 Z M 9 9 L 15 9 M 9 12 L 15 12 M 9 15 L 12 15",
          "M 12 3 L 20.5 8.5 V 15.5 L 12 21 L 3.5 15.5 V 8.5 Z",
          "M 11 4 A 7 7 0 1 0 11 18 A 7 7 0 1 0 11 4 M 20 20 L 15.7 15.7",
        ].map((d, i) => (
          <svg
            key={i}
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
            style={{ flexShrink: 0 }}
          >
            <path
              d={d}
              stroke={i === 0 ? "#cccccc" : "#606060"}
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ))}
      </div>

      {/* ── File explorer ─────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: TITLE_H,
          left: ACT_W,
          width: EXP_W,
          bottom: 0,
          background: "#252526",
          borderRight: "1px solid #1e1e1e",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 11,
            color: "#bbb",
            padding: "14px 16px 8px",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          Explorer
        </div>
        {[
          { d: 0, name: "▾  REPO_SOURCE",        dim: false },
          { d: 1, name: "▾  src",                 dim: false },
          { d: 2, name: "  components",           dim: true  },
          { d: 2, name: "  pages",                dim: true  },
          { d: 2, name: "  KPIChart.tsx",         dim: false },
          { d: 1, name: "  public",               dim: true  },
          { d: 1, name: "  package.json",         dim: true  },
          { d: 1, name: "  tsconfig.json",        dim: true  },
        ].map((f, i) => (
          <div
            key={i}
            style={{
              fontFamily: FONTS.mono,
              fontSize: 13,
              color: f.dim ? "#606060" : "#aaaaaa",
              padding: `3px 0 3px ${14 + f.d * 14}px`,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {f.name}
          </div>
        ))}
      </div>

      {/* ── Editor tab bar ────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: TITLE_H,
          left: SIDE_W,
          right: 0,
          height: TAB_H,
          background: "#2d2d2d",
          display: "flex",
          alignItems: "stretch",
          borderBottom: "1px solid #1e1e1e",
        }}
      >
        <div
          style={{
            padding: "0 20px",
            display: "flex",
            alignItems: "center",
            fontFamily: FONTS.mono,
            fontSize: 13,
            color: "#d4d4d4",
            background: "#1e1e1e",
            borderTop: "1px solid #007acc",
            whiteSpace: "nowrap",
          }}
        >
          KPIChart.tsx
        </div>
        <div
          style={{
            padding: "0 20px",
            display: "flex",
            alignItems: "center",
            fontFamily: FONTS.mono,
            fontSize: 13,
            color: "#777",
            whiteSpace: "nowrap",
          }}
        >
          App.tsx
        </div>
      </div>

      {/* ── Editor content (dimmed, suggests open file) ─────────────────── */}
      <div
        style={{
          position: "absolute",
          top: TITLE_H + TAB_H,
          left: SIDE_W,
          right: 0,
          height: EDITOR_H,
          background: "#1e1e1e",
          overflow: "hidden",
          padding: "20px 24px",
          opacity: 0.38,
        }}
      >
        {CODE.map((line, i) => (
          <div
            key={i}
            style={{
              fontFamily: FONTS.mono,
              fontSize: 15,
              color: "#9cdcfe",
              lineHeight: 1.65,
              paddingLeft: line.indent * 20,
              whiteSpace: "nowrap",
            }}
          >
            {line.text}
          </div>
        ))}
      </div>

      {/* ── Terminal panel tab bar ────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: TITLE_H + TAB_H + EDITOR_H,
          left: SIDE_W,
          right: 0,
          height: TERM_TAB,
          background: "#252526",
          display: "flex",
          alignItems: "stretch",
          borderTop: "1px solid #1e1e1e",
          borderBottom: "1px solid #1a1a1a",
          overflow: "hidden",
        }}
      >
        {["PROBLEMS", "OUTPUT", "DEBUG CONSOLE", "TERMINAL", "PORTS"].map((t) => (
          <div
            key={t}
            style={{
              padding: "0 16px",
              display: "flex",
              alignItems: "center",
              fontFamily: FONTS.mono,
              fontSize: 12,
              color: t === "TERMINAL" ? "#d0d0d0" : "#606060",
              borderBottom: t === "TERMINAL" ? "1px solid #007acc" : "none",
              whiteSpace: "nowrap",
              letterSpacing: "0.02em",
            }}
          >
            {t}
          </div>
        ))}
      </div>

      {/* ── Terminal content (Claude Code TUI) ───────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: TITLE_H + TAB_H + EDITOR_H + TERM_TAB,
          left: SIDE_W,
          right: 0,
          height: TERM_H,
          background: "#0d0d0d",
          padding: "24px 36px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Claude Code welcome header — more authentic treatment */}
        <div
          style={{
            borderLeft: "2px solid #1e4a3a",
            paddingLeft: 20,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 20,
              color: "#3a8a60",
              fontWeight: 600,
              marginBottom: 4,
              whiteSpace: "nowrap",
            }}
          >
            Claude Code
            <span style={{ color: "#2a5a40", fontWeight: 400, marginLeft: 12 }}>
              v2.1.83
            </span>
          </div>
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 16,
              color: "#3a5a46",
            }}
          >
            ~/repo_source
            <span style={{ color: "#2a4030", marginLeft: 12 }}>
              · claude-sonnet-4-6
            </span>
          </div>
        </div>

        {/* Prompt + typing */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: FONTS.mono,
            fontSize: 28,
          }}
        >
          <span style={{ color: "#3a6a50", flexShrink: 0 }}>›</span>
          <span style={{ color: "#e8e8e8" }}>{typed}</span>
          {showCursor && (
            <span
              style={{
                display: "inline-block",
                width: 16,
                height: 28,
                background: "#e8e8e8",
                opacity: cursorOn ? 0.85 : 0,
                flexShrink: 0,
              }}
            />
          )}
        </div>

        {/* RepoScout intercepting state */}
        <div
          style={{
            opacity: interceptOpacity,
            transform: `translateY(${interceptY}px)`,
            marginTop: 16,
            paddingLeft: 28,
            fontFamily: FONTS.mono,
            fontSize: 22,
            color: "#22d3ee",
          }}
        >
          ↓  RepoScout  checking OSS matches...
        </div>
      </div>
      </div>{/* end chromeOpacity wrapper */}
    </AbsoluteFill>
  );
};
