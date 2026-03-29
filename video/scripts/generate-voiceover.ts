/**
 * Generate voiceover MP3 files using ElevenLabs TTS.
 *
 * Prerequisites:
 *   export ELEVENLABS_API_KEY=sk-...
 *   export ELEVENLABS_VOICE_ID=...   # optional, defaults to "Adam" (pNInz6obpgDQGcFmaJgB)
 *
 * Run:
 *   npm run generate-voiceover
 *
 * Output:
 *   public/audio/vo-01-problem.mp3
 *   public/audio/vo-02-intercept.mp3
 *   public/audio/vo-03-match.mp3
 *   public/audio/vo-04-skip.mp3
 *   public/audio/vo-05-closing.mp3
 *
 * After generation, set ENABLE_VOICEOVER = true in src/audio.ts.
 */

import { writeFileSync, mkdirSync } from "fs";
import { VOICEOVER } from "../src/audio.ts";

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  console.error("Error: ELEVENLABS_API_KEY environment variable is not set.");
  process.exit(1);
}

// Browse voices at: https://elevenlabs.io/voice-library
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "pNInz6obpgDQGcFmaJgB"; // Adam

mkdirSync("public/audio", { recursive: true });

for (const line of VOICEOVER) {
  console.log(`Generating [${line.id}]: "${line.script}"`);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: line.script,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.75,
          style: 0.15,   // low style for clean, confident delivery
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ElevenLabs error ${response.status}: ${body}`);
  }

  const dest = `public/${line.file}`;
  writeFileSync(dest, Buffer.from(await response.arrayBuffer()));
  console.log(`  Saved: ${dest}`);
}

console.log("\nDone. Set ENABLE_VOICEOVER = true in src/audio.ts to activate.");
