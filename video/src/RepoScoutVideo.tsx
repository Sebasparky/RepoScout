import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Audio } from "@remotion/media";
import { staticFile } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { SCENE, TRANSITION_FRAMES } from "./constants";
import { ENABLE_MUSIC, ENABLE_VOICEOVER, MUSIC, VOICEOVER } from "./audio";
import { HookScene } from "./scenes/HookScene";
import { ProblemScene } from "./scenes/ProblemScene";
import { InterceptScene } from "./scenes/InterceptScene";
import { AuthScene } from "./scenes/AuthScene";
import { RichTextScene } from "./scenes/RichTextScene";
import { SkipScene } from "./scenes/SkipScene";
import { ClosingScene } from "./scenes/ClosingScene";

const fadeTransition = fade();
const fadeTiming = linearTiming({ durationInFrames: TRANSITION_FRAMES });

export const RepoScoutVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      {/* ── Background music ─────────────────────────────────────────────── */}
      {ENABLE_MUSIC && (
        <Audio
          src={staticFile(MUSIC.file)}
          loop
          volume={MUSIC.volume}
        />
      )}

      {/* ── Voiceover lines ──────────────────────────────────────────────── */}
      {ENABLE_VOICEOVER &&
        VOICEOVER.map((vo) => (
          <Sequence key={vo.id} from={vo.startFrame} layout="none">
            <Audio src={staticFile(vo.file)} volume={1} />
          </Sequence>
        ))}

      {/* ── Video scenes ─────────────────────────────────────────────────── */}
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE.hook}>
          <HookScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fadeTransition}
          timing={fadeTiming}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE.problem}>
          <ProblemScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fadeTransition}
          timing={fadeTiming}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE.intercept}>
          <InterceptScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fadeTransition}
          timing={fadeTiming}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE.auth}>
          <AuthScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fadeTransition}
          timing={fadeTiming}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE.richText}>
          <RichTextScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fadeTransition}
          timing={fadeTiming}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE.skip}>
          <SkipScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fadeTransition}
          timing={fadeTiming}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE.closing}>
          <ClosingScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
