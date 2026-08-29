import fs from "fs";
import path from "path";
import { config } from "../../config";

const BASE_URL = "https://agents.lumalabs.ai/v1";

export interface VideoGenResult {
  videoPath: string;
  duration: number;
}

function getApiKey(): string {
  const key = process.env.LUMA_AGENTS_API_KEY;
  if (!key) throw new Error("LUMA_AGENTS_API_KEY not set");
  return key;
}

export async function generateVideo(prompt: string): Promise<VideoGenResult> {
  const apiKey = getApiKey();
  const truncatedPrompt = prompt.length > 2500 ? prompt.substring(0, 2497) + "..." : prompt;

  console.log("[luma] Starting video generation...");
  console.log("[luma] Prompt:", truncatedPrompt.substring(0, 120) + "...");

  // Submit generation
  const createRes = await fetch(`${BASE_URL}/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "ray-3.2",
      type: "video",
      prompt: truncatedPrompt,
      aspect_ratio: "9:16",
      video: {
        resolution: "720p",
        duration: "5s",
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Luma API error (${createRes.status}): ${err}`);
  }

  const data = await createRes.json() as any;
  const generationId = data.id;
  console.log("[luma] Generation submitted:", generationId);

  // Poll for completion
  const videoPath = await pollForCompletion(apiKey, generationId);
  console.log("[luma] Video saved to:", videoPath);

  return { videoPath, duration: 5 };
}

async function pollForCompletion(apiKey: string, generationId: string): Promise<string> {
  const maxAttempts = 120;
  const pollInterval = 3000;

  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${BASE_URL}/generations/${generationId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to check status: ${res.status}`);
    }

    const gen = await res.json() as any;
    const state = gen.state;

    if (state === "completed") {
      const videoUrl = gen.output?.[0]?.url;
      if (!videoUrl) throw new Error("No video URL in result");

      const outputPath = path.join(config.paths.output, `luma_${Date.now()}.mp4`);
      await downloadVideo(videoUrl, outputPath);
      return outputPath;
    }

    if (state === "failed") {
      throw new Error(`Generation failed: ${gen.failure_reason || "Unknown error"}`);
    }

    console.log(`[luma] Status: ${state} (${i + 1}/${maxAttempts})`);
    await new Promise((r) => setTimeout(r, pollInterval));
  }

  throw new Error("Video generation timed out after 10 minutes");
}

async function downloadVideo(url: string, outputPath: string): Promise<void> {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download video: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  console.log(`[luma] Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
}
