import { Client } from "magic-hour";
import fs from "fs";
import path from "path";
import { config } from "../../config";

const API_KEY_FILE = path.join(process.cwd(), "tokens", "magic-hour.json");

export interface VideoGenResult {
  videoPath: string;
  duration: number;
}

function getApiKey(): string {
  const envKey = process.env.MAGIC_HOUR_API_KEY;
  if (envKey) return envKey;

  if (fs.existsSync(API_KEY_FILE)) {
    const data = JSON.parse(fs.readFileSync(API_KEY_FILE, "utf-8"));
    return data.apiKey;
  }

  throw new Error(
    "Magic Hour API key not found. Sign up at magichour.ai/developer (free, no credit card) and set MAGIC_HOUR_API_KEY in .env"
  );
}

export async function generateVideo(prompt: string): Promise<VideoGenResult> {
  console.log("[magic-hour] Starting video generation...");
  console.log("[magic-hour] Prompt:", prompt.substring(0, 120) + "...");

  const apiKey = getApiKey();

  // Truncate prompt to 2000 chars max (API limit)
  const truncatedPrompt = prompt.length > 2000 ? prompt.substring(0, 1997) + "..." : prompt;

  // Create the video project
  const createRes = await fetch("https://api.magichour.ai/v1/text-to-video", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      end_seconds: 5,
      aspect_ratio: "9:16",
      style: { prompt: truncatedPrompt },
      name: `crushing-${Date.now()}`,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Magic Hour API error (${createRes.status}): ${err}`);
  }

  const { id, credits_charged } = await createRes.json() as { id: string; credits_charged: number };
  console.log("[magic-hour] Project created:", id, "Credits:", credits_charged);

  // Poll for completion
  const videoPath = await pollForCompletion(apiKey, id);
  console.log("[magic-hour] Video saved to:", videoPath);

  return { videoPath, duration: 5 };
}

async function pollForCompletion(apiKey: string, projectId: string): Promise<string> {
  const maxAttempts = 120; // 10 minutes max
  const pollInterval = 5000; // 5 seconds

  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`https://api.magichour.ai/v1/video-projects/${projectId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to check status: ${res.status}`);
    }

    const project = await res.json() as { status: string; downloads?: { url: string }[]; download?: string; error?: string };
    const status = project.status;

    if (status === "complete") {
      // Download the video
      const videoUrl = project.downloads?.[0]?.url || project.download;
      if (!videoUrl) {
        throw new Error("No download URL returned");
      }
      const outputPath = path.join(config.paths.output, `magic_hour_${Date.now()}.mp4`);
      await downloadVideo(apiKey, videoUrl, outputPath);
      return outputPath;
    }

    if (status === "failed") {
      throw new Error(`Generation failed: ${project.error || "Unknown error"}`);
    }

    console.log(`[magic-hour] Status: ${status} (${i + 1}/${maxAttempts})`);
    await new Promise((r) => setTimeout(r, pollInterval));
  }

  throw new Error("Video generation timed out after 10 minutes");
}

async function downloadVideo(apiKey: string, url: string, outputPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download video: ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  console.log(`[magic-hour] Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
}
