import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { wipe } from "@remotion/transitions/wipe";
import { slide } from "@remotion/transitions/slide";
import { interpolate } from "remotion";
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
// 120 - 12 = 108
const S2_START = LAUNCH_SCENE.init - LAUNCH_T1_FRAMES;

// Typing segment 2: starts at TYPING_DELAY=22 frames into Scene 2
const TYPING2_GLOBAL = S2_START + 22; // = 130

// Instrumental gain ramp: 00:08.18 → frame 245 (8.18 × 30 ≈ 245)
const MUSIC_LIFT = 245;

export const RepoScoutLaunchVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      {/* ── Instrumental track ──────────────────────────────────────────── */}
      {/* Swap video/public/audio/instrumental.mp3 with your track.        */}
      <Audio
        src={staticFile("audio/instrumental.mp3")}
        volume={(f) => {
          // Base level rises from 0.22 → 0.38 at the 8.18s mark
          const base = interpolate(f, [MUSIC_LIFT - 8, MUSIC_LIFT + 8], [0.22, 0.38], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          // Duck slightly during first keystroke burst (frames 0-12)
          const duck1 = interpolate(f, [0, 2, 10, 14], [0.72, 0.72, 1, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          // Duck slightly during Scene 2 typing (frames 130-159)
          const duck2 = interpolate(
            f,
            [TYPING2_GLOBAL, TYPING2_GLOBAL + 4, TYPING2_GLOBAL + 28, TYPING2_GLOBAL + 33],
            [1, 0.78, 0.78, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          return base * duck1 * duck2;
        }}
      />

      {/* ── Typing SFX — segment 1: 00:00.00-00:00.20 (frames 0-6) ─────── */}
      {/* Swap video/public/audio/typing.mp4 with your typing audio file.  */}
      <Sequence from={0} durationInFrames={6} layout="none" premountFor={30}>
        <Audio
          src={staticFile("audio/typing.mp3")}
          startFrom={0}
          endAt={140}
          volume={0.8}
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
          volume={0.72}
        />
      </Sequence>

      {/* ── Scene transitions ────────────────────────────────────────────── */}
      <TransitionSeries>
        {/* Scene 1 — $ npx reposcout init */}
        <TransitionSeries.Sequence durationInFrames={LAUNCH_SCENE.init}>
          <InitScene />
        </TransitionSeries.Sequence>

        {/* T1: cinematic wipe — init → Claude.
            Both share pure black (#000000) so the wipe edge is invisible;
            the VS Code chrome fades in after the wipe completes. */}
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: LAUNCH_T1_FRAMES })}
        />

        {/* Scene 2 — /reposcout typed in Claude Code */}
        <TransitionSeries.Sequence durationInFrames={LAUNCH_SCENE.claude}>
          <ClaudeScene />
        </TransitionSeries.Sequence>

        {/* T2: quick slide — Claude → results (terminal output arrives) */}
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: LAUNCH_T2_FRAMES })}
        />

        {/* Scene 3 — recharts result payoff */}
        <TransitionSeries.Sequence durationInFrames={LAUNCH_SCENE.results}>
          <MatchScene />
        </TransitionSeries.Sequence>

        {/* T3: quick slide — results → skip (next request / contrast) */}
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
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
