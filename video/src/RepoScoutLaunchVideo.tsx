import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, interpolate } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import {
  LAUNCH_SCENE,
  LAUNCH_T1_FRAMES,
  LAUNCH_T2_FRAMES,
  LAUNCH_T3_FRAMES,
} from "./constants";
import { InitScene } from "./scenes/launch/InitScene";
import { ClaudeScene } from "./scenes/launch/ClaudeScene";
import { MatchScene } from "./scenes/launch/MatchScene";
import { SkipLaunchScene } from "./scenes/launch/SkipLaunchScene";

// ─── Audio frame constants ────────────────────────────────────────────────────
// Global frame where Scene 2 begins (S1 duration minus T1 overlap):
// 120 - 18 = 102
const S2_START = LAUNCH_SCENE.init - LAUNCH_T1_FRAMES;

// Typing segment 2: starts at TYPING_DELAY=22 frames into Scene 2
const TYPING2_GLOBAL = S2_START + 22; // = 124

// Instrumental gain ramp: 00:08.18 → frame 245 (8.18 × 30 ≈ 245)
const MUSIC_LIFT = 245;

export const RepoScoutLaunchVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      {/* ── Instrumental track ──────────────────────────────────────────── */}
      {/* File: video/public/audio/instrumental.mp3                        */}
      <Audio
        src={staticFile("audio/instrumental.mp3")}
        volume={(f) => {
          // Base level rises from 0.22 → 0.38 at the 8.18s mark
          const base = interpolate(f, [MUSIC_LIFT - 8, MUSIC_LIFT + 8], [0.22, 0.38], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          // Duck slightly during first keystroke burst (frames 0-14)
          const duck1 = interpolate(f, [0, 2, 10, 14], [0.72, 0.72, 1, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          // Duck slightly during Scene 2 typing
          const duck2 = interpolate(
            f,
            [TYPING2_GLOBAL, TYPING2_GLOBAL + 4, TYPING2_GLOBAL + 28, TYPING2_GLOBAL + 33],
            [1, 0.78, 0.78, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          return base * duck1 * duck2;
        }}
      />

      {/* ── Typing SFX — segment 1: 00:00.00-00:00.70 (frames 0-21) ─────── */}
      {/* File: video/public/audio/typing.mp3                               */}
      <Sequence from={0} durationInFrames={21} layout="none" premountFor={30}>
        <Audio
          src={staticFile("audio/typing.mp3")}
          startFrom={0}
          endAt={21}
          volume={0.5}
        />
      </Sequence>

      {/* ── Typing SFX — segment 2: 00:04.16-00:05.13 (source frames 125-154) */}
      <Sequence
        from={TYPING2_GLOBAL}
        durationInFrames={29}
        layout="none"
        premountFor={30}
      >
        <Audio
          src={staticFile("audio/typing.mp3")}
          startFrom={125}
          endAt={154}
          volume={0.45}
        />
      </Sequence>

      {/* ── Scene transitions ────────────────────────────────────────────── */}
      <TransitionSeries>
        {/* Scene 1 — $ npx reposcout init */}
        <TransitionSeries.Sequence durationInFrames={LAUNCH_SCENE.init}>
          <InitScene />
        </TransitionSeries.Sequence>

        {/* T1: spring-eased fade through black — init → Claude.
            InitScene has black bg (#000000). ClaudeScene's CHROME_DELAY=18
            matches T1, so ClaudeScene is pure black during the entire crossfade.
            The VS Code chrome springs in *after* T1 ends: emerges from darkness. */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: LAUNCH_T1_FRAMES })}
        />

        {/* Scene 2 — /reposcout typed in Claude Code */}
        <TransitionSeries.Sequence durationInFrames={LAUNCH_SCENE.claude}>
          <ClaudeScene />
        </TransitionSeries.Sequence>

        {/* T2: brief fade — Claude → results.
            Both scenes are dark (#1e1e1e terminal / #0d0d0d), crossdissolve
            reads as "the output arrived," not a scene change. */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: LAUNCH_T2_FRAMES })}
        />

        {/* Scene 3 — recharts result payoff */}
        <TransitionSeries.Sequence durationInFrames={LAUNCH_SCENE.results}>
          <MatchScene />
        </TransitionSeries.Sequence>

        {/* T3: quick fade — results → skip.
            MatchScene and SkipLaunchScene share the same #0d0d0d terminal
            background so the crossdissolve feels like a tab/session swap. */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: LAUNCH_T3_FRAMES })}
        />

        {/* Scene 4 — skip: custom business logic */}
        <TransitionSeries.Sequence durationInFrames={LAUNCH_SCENE.skip}>
          <SkipLaunchScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
