import { SCENE, TRANSITION_FRAMES } from "./constants";

// ─── Feature flags ────────────────────────────────────────────────────────────
// Set to true after generating/placing the audio files described below.

/** Set to true after running: npm run generate-voiceover */
export const ENABLE_VOICEOVER = false;

/** Set to true after placing a royalty-free track at public/audio/music.mp3 */
export const ENABLE_MUSIC = true;

// ─── Global frame offsets ─────────────────────────────────────────────────────
// Compute where each scene starts within the TransitionSeries composition.
// Each scene begins at: previous scene end − one transition overlap.

const durations = [
  SCENE.hook, SCENE.problem, SCENE.intercept,
  SCENE.auth, SCENE.richText, SCENE.skip, SCENE.closing,
];

function computeOffsets(ds: number[], overlap: number): number[] {
  const out = [0];
  for (let i = 0; i < ds.length - 1; i++) {
    out.push(out[i] + ds[i] - overlap);
  }
  return out;
}

const offsets = computeOffsets(durations, TRANSITION_FRAMES);

export const SCENE_OFFSETS = {
  hook:      offsets[0],  //   0
  problem:   offsets[1],  //  63
  intercept: offsets[2],  // 216
  auth:      offsets[3],  // 369
  richText:  offsets[4],  // 567
  skip:      offsets[5],  // 750
  closing:   offsets[6],  // 873
} as const;

// ─── Voiceover config ─────────────────────────────────────────────────────────
// Edit `script` to change narration. `startFrame` is the global composition frame
// at which each line begins playing.
//
// To generate audio files: ELEVENLABS_API_KEY=sk-... npm run generate-voiceover
// Files will be written to public/audio/vo-*.mp3

export const VOICEOVER = [
  {
    id: "vo-01-problem",
    file: "audio/vo-01-problem.mp3",
    script: "Claude usually jumps straight to generation.",
    startFrame: SCENE_OFFSETS.problem,
  },
  {
    id: "vo-02-intercept",
    file: "audio/vo-02-intercept.mp3",
    script: "RepoScout checks whether a stronger open-source solution already exists.",
    startFrame: SCENE_OFFSETS.intercept,
  },
  {
    id: "vo-03-match",
    file: "audio/vo-03-match.mp3",
    script: "If the match is strong, it surfaces the best option before coding starts.",
    startFrame: SCENE_OFFSETS.auth,
  },
  {
    id: "vo-04-skip",
    file: "audio/vo-04-skip.mp3",
    script: "If not, it stays out of the way.",
    startFrame: SCENE_OFFSETS.skip,
  },
  {
    id: "vo-05-closing",
    file: "audio/vo-05-closing.mp3",
    script: "Build less. Reuse better.",
    startFrame: SCENE_OFFSETS.closing,
  },
] as const;

// ─── Background music ─────────────────────────────────────────────────────────
// Place a royalty-free track at public/audio/music.mp3 then set ENABLE_MUSIC=true.
// Recommended: ~40s loopable ambient/electronic track, 120–140 BPM.

export const MUSIC = {
  file: "audio/music.mp3",
  /** Overall volume (0–1). Kept low so voiceover stays intelligible. */
  volume: 0.22,
} as const;
