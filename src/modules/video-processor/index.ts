import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import { config } from "../../config";

const MUSIC_DIR = path.join(process.cwd(), "music");
const TARGET_DURATION = 15; // Strictly 15 seconds

export interface ProcessResult {
  outputPath: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
}

/**
 * Process raw video into YouTube Shorts format:
 * - Exactly 15 seconds
 * - 9:16 aspect ratio (1080x1920)
 * - 30fps
 * - H.264 codec
 * - Trending background music from YouTube (if available)
 */
export function processVideo(inputPath: string): ProcessResult {
  const timestamp = Date.now();
  const outputPath = path.join(config.paths.output, `processed_${timestamp}.mp4`);

  console.log("[video-processor] Processing:", inputPath);

  checkFfmpeg();

  const inputInfo = getVideoInfo(inputPath);
  console.log("[video-processor] Input info:", inputInfo);

  // Get random music track (optional)
  const musicTrack = getRandomMusicTrack();
  const hasMusic = musicTrack !== null;
  if (hasMusic) {
    console.log("[video-processor] Using music:", path.basename(musicTrack!));
    const musicDuration = getAudioDuration(musicTrack!);
    console.log("[video-processor] Music duration:", musicDuration.toFixed(1) + "s");
  } else {
    console.log("[video-processor] No music available, processing without audio");
  }

  // Build FFmpeg command with music (if available) and strict 15s duration
  const targetW = 1080;
  const targetH = 1920;
  const targetRatio = targetW / targetH;

  let videoFilter: string;
  const inputRatio = inputInfo.width / inputInfo.height;

  if (inputRatio > targetRatio) {
    videoFilter = `crop=iw*${targetRatio}:ih,scale=${targetW}:${targetH}:flags=lanczos,fps=30`;
  } else if (inputRatio < targetRatio) {
    videoFilter = `crop=iw:iw/${targetRatio},scale=${targetW}:${targetH}:flags=lanczos,fps=30`;
  } else {
    videoFilter = `scale=${targetW}:${targetH}:flags=lanczos,fps=30`;
  }

  let cmd: string;
  if (hasMusic) {
    // With music
    cmd = [
      "ffmpeg -y",
      `-i "${inputPath}"`,
      `-i "${musicTrack}"`,
      `-filter_complex`,
      `"[0:v]${videoFilter},trim=duration=${TARGET_DURATION},setpts=PTS-STARTPTS[v];` +
      `[1:a]atrim=duration=${TARGET_DURATION},afade=t=out:st=13:d=2,volume=0.7[a]"`,
      `-map "[v]" -map "[a]"`,
      "-c:v libx264 -preset fast -crf 18",
      "-c:a aac -b:a 128k -ar 44100",
      `-t ${TARGET_DURATION}`,
      "-movflags +faststart",
      `"${outputPath}"`,
    ].join(" ");
    console.log("[video-processor] Running FFmpeg (15s + music)...");
  } else {
    // Without music
    cmd = [
      "ffmpeg -y",
      `-i "${inputPath}"`,
      `-filter_complex`,
      `"[0:v]${videoFilter},trim=duration=${TARGET_DURATION},setpts=PTS-STARTPTS[v]"`,
      `-map "[v]"`,
      "-c:v libx264 -preset fast -crf 18",
      `-t ${TARGET_DURATION}`,
      "-movflags +faststart",
      `"${outputPath}"`,
    ].join(" ");
    console.log("[video-processor] Running FFmpeg (15s, no music)...");
  }
  try {
    execSync(cmd, { stdio: "pipe", timeout: 120_000 });
  } catch (err: any) {
    throw new Error(`FFmpeg failed: ${err.stderr?.toString() || err.message}`);
  }

  if (!fs.existsSync(outputPath)) {
    throw new Error("FFmpeg did not produce output file");
  }

  const outputInfo = getVideoInfo(outputPath);
  console.log("[video-processor] Output:", outputPath, `${outputInfo.width}x${outputInfo.height}, ${outputInfo.duration}s`);

  return {
    outputPath,
    width: outputInfo.width,
    height: outputInfo.height,
    fps: outputInfo.fps,
    duration: outputInfo.duration,
  };
}

function getRandomMusicTrack(): string | null {
  if (!fs.existsSync(MUSIC_DIR)) {
    return null;
  }

  const tracks = fs.readdirSync(MUSIC_DIR).filter((f) => f.endsWith(".mp3"));
  if (tracks.length === 0) {
    return null;
  }

  const random = tracks[Math.floor(Math.random() * tracks.length)];
  return path.join(MUSIC_DIR, random);
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

function getAudioDuration(filePath: string): number {
  const cmd = `ffprobe -v quiet -print_format json -show_streams "${filePath}"`;
  try {
    const output = execSync(cmd, { encoding: "utf-8" });
    const data = JSON.parse(output);
    const audioStream = data.streams?.find((s: any) => s.codec_type === "audio");
    return parseFloat(audioStream?.duration || "30");
  } catch {
    return 30;
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
      return { width: 1080, height: 1920, fps: 30, duration: 15 };
    }

    let fps = 30;
    if (videoStream.r_frame_rate) {
      const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
      fps = Math.round(num / den);
    }

    const duration = parseFloat(videoStream.duration || "15");

    return {
      width: videoStream.width || 1080,
      height: videoStream.height || 1920,
      fps,
      duration,
    };
  } catch {
    return { width: 1080, height: 1920, fps: 30, duration: 15 };
  }
}
