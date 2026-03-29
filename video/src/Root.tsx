import React from "react";
import { Composition } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { RepoScoutVideo } from "./RepoScoutVideo";
import { FPS, HEIGHT, TOTAL_FRAMES, WIDTH } from "./constants";

// Load Inter — blocks rendering until font is ready
loadFont("normal", { weights: ["400", "500", "600", "700", "800", "900"], subsets: ["latin"] });

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="RepoScoutDemo"
      component={RepoScoutVideo}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
