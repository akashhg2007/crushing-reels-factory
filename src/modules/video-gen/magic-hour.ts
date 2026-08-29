import fs from "fs";
import path from "path";
import { config } from "../../config";

const API_KEY_FILE = path.join(process.cwd(), "tokens", "magic-hour.json");

export interface VideoGenResult {
  videoPath: string;
  duration: number;
}

/**
 * Get all API keys from env and tokens file
 * Supports: MAGIC_HOUR_API_KEY=key1,key2,key3
 */
function getAllApiKeys(): string[] {
  const keys: string[] = [];

  // From env (comma-separated)
  const envKeys = process.env.MAGIC_HOUR_API_KEY;
  if (envKeys) {
    keys.push(...envKeys.split(",").map(k => k.trim()).filter(Boolean));
  }

  // From tokens file
  if (fs.existsSync(API_KEY_FILE)) {
    const data = JSON.parse(fs.readFileSync(API_KEY_FILE, "utf-8"));
    if (Array.isArray(data.apiKeys)) {
      keys.push(...data.apiKeys);
    } else if (data.apiKey) {
      keys.push(data.apiKey);
    }
  }

  return [...new Set(keys)]; // Remove duplicates
}

/**
 * Select API key based on current time
 * Each key gets a 4-hour window for ~4-5 videos
 */
function selectApiKey(keys: string[]): string {
  const hour = new Date().getUTCHours();
  const index = Math.floor(hour / 4) % keys.length;
  return keys[index];
}

/**
 * Generate video using API key selected by time
 */
export async function generateVideo(prompt: string): Promise<VideoGenResult> {
  const keys = getAllApiKeys();
  if (keys.length === 0) {
    throw new Error("No Magic Hour API keys found");
  }

  const selectedKey = selectApiKey(keys);
  const keyIndex = Math.floor(new Date().getUTCHours() / 4) % keys.length;
  const masked = selectedKey.substring(0, 15) + "..." + selectedKey.substring(selectedKey.length - 4);
  console.log(`[magic-hour] Using key ${keyIndex + 1}/${keys.length}: ${masked}`);
  console.log(`[magic-hour] (Each key used for 4-hour window)`);

  return await generateWithKey(selectedKey, prompt);
}

async function generateWithKey(apiKey: string, prompt: string): Promise<VideoGenResult> {
  console.log("[magic-hour] Starting video generation...");
  console.log("[magic-hour] Prompt:", prompt.substring(0, 120) + "...");

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
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download video: ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  console.log(`[magic-hour] Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
}
