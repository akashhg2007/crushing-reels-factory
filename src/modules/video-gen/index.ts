import fs from "fs";
import path from "path";
import { config } from "../../config";

export interface VideoGenResult {
  videoPath: string;
  duration: number;
}

/**
 * Generate video using available providers
 * Luma (10 free/day) → Kling → Magic Hour → Puter.js
 */
export async function generateVideo(prompt: string): Promise<VideoGenResult> {
  // Try Luma Dream Machine first (10 free videos/day)
  if (process.env.LUMA_AGENTS_API_KEY) {
    try {
      const { generateVideo: lumaGen } = await import("./luma");
      return await lumaGen(prompt);
    } catch (err: any) {
      console.log("[video-gen] Luma unavailable:", err.message);
    }
  }

  // Try Kling AI (66 free credits daily)
  if (process.env.KLING_API_KEY) {
    try {
      const { generateVideo: klingGen } = await import("./kling");
      return await klingGen(prompt);
    } catch (err: any) {
      console.log("[video-gen] Kling unavailable:", err.message);
    }
  }

  // Try Magic Hour (free credits)
  try {
    const { generateVideo: magicHourGen } = await import("./magic-hour");
    return await magicHourGen(prompt);
  } catch (err: any) {
    console.log("[video-gen] Magic Hour unavailable:", err.message);
  }

  // Fallback to Puter.js
  return await generateVideoWithPuter(prompt);
}

async function generateVideoWithPuter(prompt: string): Promise<VideoGenResult> {
  console.log("[video-gen] Starting video generation with Puter.js Seedance...");
  console.log("[video-gen] Prompt:", prompt.substring(0, 120) + "...");

  const TOKEN_FILE = path.join(process.cwd(), "tokens", "puter.json");
  const MODEL = "bytedance/seedance-1.0-lite";

  let token = process.env.PUTER_AUTH_TOKEN;
  if (!token) {
    if (!fs.existsSync(TOKEN_FILE)) {
      throw new Error("Puter auth token not found. Run: npm run auth:puter");
    }
    const data = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
    token = data.token;
  }

  const { init } = await import("@heyputer/puter.js/src/init.cjs");
  const puter = init(token);

  const result = await puter.ai.txt2vid(prompt, {
    model: MODEL,
    seconds: 8,
    width: 704,
    height: 1248,
  });

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

  if (!videoSrc) {
    throw new Error("No video source URL found in returned result");
  }

  const outputPath = path.join(config.paths.output, `raw_${Date.now()}.mp4`);
  const res = await fetch(videoSrc);
  if (!res.ok) throw new Error(`Failed to download video: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  console.log(`[video-gen] Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);

  return { videoPath: outputPath, duration: 8 };
}
