import fs from "fs";
import path from "path";
import { config } from "../../config";

const TOKEN_FILE = path.join(process.cwd(), "tokens", "puter.json");
const MODEL = "bytedance/seedance-1.0-lite";

export interface VideoGenResult {
  videoPath: string;
  duration: number;
}

let puterClient: any = null;

async function getPuterClient(): Promise<any> {
  if (puterClient) return puterClient;

  let token = process.env.PUTER_AUTH_TOKEN;

  if (!token) {
    if (!fs.existsSync(TOKEN_FILE)) {
      throw new Error(
        "Puter auth token not found. Run: npm run auth:puter"
      );
    }
    const data = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
    token = data.token;
  }

  const { init } = await import("@heyputer/puter.js/src/init.cjs");
  puterClient = init(token);

  return puterClient;
}

/**
 * Generate video using available providers
 * Tries Magic Hour first (free credits), then Google Flow, then Puter.js
 */
export async function generateVideo(prompt: string): Promise<VideoGenResult> {
  // Try Magic Hour first (free credits, no credit card)
  try {
    const { generateVideo: magicHourGen } = await import("./magic-hour");
    return await magicHourGen(prompt);
  } catch (err: any) {
    console.log("[video-gen] Magic Hour unavailable:", err.message);
  }

  // Try Google Flow (free, 50 credits/day)
  try {
    const { generateVideoWithFlow } = await import("./google-flow");
    return await generateVideoWithFlow(prompt);
  } catch (err: any) {
    console.log("[video-gen] Google Flow unavailable:", err.message);
    console.log("[video-gen] Falling back to Puter.js...");
  }

  // Fallback to Puter.js
  return await generateVideoWithPuter(prompt);
}

async function generateVideoWithPuter(prompt: string): Promise<VideoGenResult> {
  console.log("[video-gen] Starting video generation with Puter.js Seedance...");
  console.log("[video-gen] Prompt:", prompt.substring(0, 120) + "...");

  const puter = await getPuterClient();

  // Generate video using Puter.js txt2vid
  // Supported 9:16 resolutions: 480x864, 704x1248, 1088x1920
  const result = await puter.ai.txt2vid(prompt, {
    model: MODEL,
    seconds: 8,
    width: 704,
    height: 1248,
  });

  console.log("[video-gen] Result type:", typeof result);
  console.log("[video-gen] Result keys:", result ? Object.keys(result) : "null");

  // Extract video source URL - handle different return types
  let videoSrc: string | null = null;

  if (result && typeof result === "object") {
    videoSrc =
      result.getAttribute?.("data-source") ||
      result.src ||
      result.currentSrc ||
      result.data?.source ||
      result.url ||
      result.video?.url ||
      result[0]?.url;
  } else if (typeof result === "string") {
    videoSrc = result;
  }

  console.log("[video-gen] Video source:", videoSrc?.substring(0, 100) || "NOT FOUND");

  if (!videoSrc) {
    console.log("[video-gen] Full result:", JSON.stringify(result, null, 2)?.substring(0, 500));
    throw new Error("No video source URL found in returned result");
  }

  // Download the video
  const outputPath = path.join(config.paths.output, `raw_${Date.now()}.mp4`);
  await downloadVideo(videoSrc, outputPath);

  console.log("[video-gen] Video saved to:", outputPath);
  return { videoPath: outputPath, duration: 8 };
}

async function downloadVideo(url: string, outputPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `Failed to download video (${res.status}): ${errText.substring(0, 300)}`
    );
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  console.log(
    `[video-gen] Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)} MB`
  );
}
