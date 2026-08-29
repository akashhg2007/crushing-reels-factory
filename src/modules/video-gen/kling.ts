import fs from "fs";
import path from "path";
import { config } from "../../config";

const BASE_URL = "https://api-singapore.klingai.com";

export interface VideoGenResult {
  videoPath: string;
  duration: number;
}

function getApiKey(): string {
  const key = process.env.KLING_API_KEY;
  if (!key) throw new Error("KLING_API_KEY not set");
  return key;
}

export async function generateVideo(prompt: string): Promise<VideoGenResult> {
  const apiKey = getApiKey();
  const truncatedPrompt = prompt.length > 2500 ? prompt.substring(0, 2497) + "..." : prompt;

  console.log("[kling] Starting video generation...");
  console.log("[kling] Prompt:", truncatedPrompt.substring(0, 120) + "...");

  // Create task
  const createRes = await fetch(`${BASE_URL}/text-to-video/kling-2.6`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: truncatedPrompt,
      settings: {
        resolution: "1080p",
        aspect_ratio: "9:16",
        duration: 5,
      },
    }),
  });

  const createData = await createRes.json() as any;
  if (createData.code !== 0) {
    throw new Error(`Kling API error (${createRes.status}): ${createData.message}`);
  }

  const taskId = createData.data.id;
  console.log("[kling] Task created:", taskId);

  // Poll for completion
  const videoPath = await pollForCompletion(apiKey, taskId);
  console.log("[kling] Video saved to:", videoPath);

  return { videoPath, duration: 5 };
}

async function pollForCompletion(apiKey: string, taskId: string): Promise<string> {
  const maxAttempts = 120;
  const pollInterval = 5000;

  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${BASE_URL}/tasks?task_ids=${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const data = await res.json() as any;
    if (data.code !== 0) {
      throw new Error(`Failed to check status: ${data.message}`);
    }

    const task = data.data?.task_results?.[0];
    if (!task) {
      console.log(`[kling] Status: pending (${i + 1}/${maxAttempts})`);
      await new Promise((r) => setTimeout(r, pollInterval));
      continue;
    }

    if (task.status === "succeeded") {
      const videoUrl = task.task_result?.videos?.[0]?.url;
      if (!videoUrl) throw new Error("No video URL in result");

      const outputPath = path.join(config.paths.output, `kling_${Date.now()}.mp4`);
      await downloadVideo(apiKey, videoUrl, outputPath);
      return outputPath;
    }

    if (task.status === "failed") {
      throw new Error(`Generation failed: ${task.task_result?.error?.message || "Unknown error"}`);
    }

    console.log(`[kling] Status: ${task.status} (${i + 1}/${maxAttempts})`);
    await new Promise((r) => setTimeout(r, pollInterval));
  }

  throw new Error("Video generation timed out after 10 minutes");
}

async function downloadVideo(apiKey: string, url: string, outputPath: string): Promise<void> {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download video: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  console.log(`[kling] Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
}
