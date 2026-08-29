import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import { config } from "../../config";

export interface ProcessResult {
  outputPath: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
}

/**
 * Process raw video into YouTube Shorts / Instagram Reels format:
 * - 9:16 aspect ratio (1080x1920)
 * - 30fps
 * - H.264 codec
 * - AAC audio
 */
export function processVideo(inputPath: string): ProcessResult {
  const timestamp = Date.now();
  const outputPath = path.join(config.paths.output, `processed_${timestamp}.mp4`);

  console.log("[video-processor] Processing:", inputPath);

  // Check ffprobe/ffmpeg is available
  checkFfmpeg();

  // Get input video info
  const inputInfo = getVideoInfo(inputPath);
  console.log("[video-processor] Input info:", inputInfo);

  // Build FFmpeg command
  // Strategy: crop to 9:16 from center, scale to 1080x1920, set 30fps
  const targetW = 1080;
  const targetH = 1920;
  const targetRatio = targetW / targetH; // 0.5625

  let filterComplex: string;
  const inputRatio = inputInfo.width / inputInfo.height;

  if (inputRatio > targetRatio) {
    // Input is wider than 9:16 — crop width
    filterComplex = `crop=iw*${targetRatio}:ih,scale=${targetW}:${targetH}:flags=lanczos,fps=30`;
  } else if (inputRatio < targetRatio) {
    // Input is taller than 9:16 — crop height
    filterComplex = `crop=iw:iw/${targetRatio},scale=${targetW}:${targetH}:flags=lanczos,fps=30`;
  } else {
    // Already correct ratio — just scale
    filterComplex = `scale=${targetW}:${targetH}:flags=lanczos,fps=30`;
  }

  const cmd = [
    "ffmpeg -y",
    `-i "${inputPath}"`,
    `-vf "${filterComplex}"`,
    "-c:v libx264 -preset fast -crf 18",
    "-c:a aac -b:a 128k -ar 44100",
    "-movflags +faststart",
    `"${outputPath}"`,
  ].join(" ");

  console.log("[video-processor] Running FFmpeg...");
  try {
    execSync(cmd, { stdio: "pipe", timeout: 60_000 });
  } catch (err: any) {
    throw new Error(`FFmpeg failed: ${err.stderr?.toString() || err.message}`);
  }

  // Verify output exists
  if (!fs.existsSync(outputPath)) {
    throw new Error("FFmpeg did not produce output file");
  }

  const outputInfo = getVideoInfo(outputPath);
  console.log("[video-processor] Output:", outputPath, `${outputInfo.width}x${outputInfo.height}`);

  return {
    outputPath,
    width: outputInfo.width,
    height: outputInfo.height,
    fps: outputInfo.fps,
    duration: outputInfo.duration,
  };
}

function checkFfmpeg(): void {
  try {
    execSync("ffmpeg -version", { stdio: "pipe" });
  } catch {
    throw new Error(
      "FFmpeg is not installed or not in PATH. Install it: https://ffmpeg.org/download.html"
    );
  }
}

function getVideoInfo(filePath: string): {
  width: number;
  height: number;
  fps: number;
  duration: number;
} {
  const cmd = `ffprobe -v quiet -print_format json -show_streams "${filePath}"`;
  try {
    const output = execSync(cmd, { encoding: "utf-8" });
    const data = JSON.parse(output);
    const videoStream = data.streams?.find((s: any) => s.codec_type === "video");
    if (!videoStream) {
      return { width: 1080, height: 1920, fps: 30, duration: 8 };
    }

    // Parse frame rate (e.g., "30/1" or "30000/1001")
    let fps = 30;
    if (videoStream.r_frame_rate) {
      const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
      fps = Math.round(num / den);
    }

    const duration = parseFloat(videoStream.duration || "8");

    return {
      width: videoStream.width || 1080,
      height: videoStream.height || 1920,
      fps,
      duration,
    };
  } catch {
    return { width: 1080, height: 1920, fps: 30, duration: 8 };
  }
}
