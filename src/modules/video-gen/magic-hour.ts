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
  const client = new Client({ token: apiKey });

  const result = await client.v1.textToVideo.generate(
    {
      endSeconds: 5,
      aspectRatio: "9:16",
      style: {
        prompt: prompt,
      },
      name: `crushing-${Date.now()}`,
      resolution: "480p",
    },
    {
      waitForCompletion: true,
      downloadOutputs: true,
      downloadDirectory: config.paths.output,
    }
  );

  console.log("[magic-hour] Status:", result.status);
  console.log("[magic-hour] Credits charged:", result.creditsCharged);

  if (result.status !== "complete") {
    throw new Error(`Generation failed with status: ${result.status}`);
  }

  // Find the downloaded video
  const downloadedPaths = result.downloadedPaths;
  if (!downloadedPaths || downloadedPaths.length === 0) {
    throw new Error("No video downloaded");
  }

  const videoPath = downloadedPaths[0];
  console.log("[magic-hour] Video saved to:", videoPath);

  return { videoPath, duration: 5 };
}
