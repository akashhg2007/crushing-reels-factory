import fs from "fs";
import path from "path";
import { config } from "../../config";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "veo-3.1-generate-preview";
const POLL_INTERVAL_MS = 15_000;
const MAX_POLL_ATTEMPTS = 40; // 10 minutes max

export interface VideoGenResult {
  videoPath: string;
  duration: number;
}

export async function generateVideo(prompt: string): Promise<VideoGenResult> {
  const apiKey = config.gemini.apiKey;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in .env");
  }

  console.log("[video-gen] Starting video generation...");
  console.log("[video-gen] Prompt:", prompt.substring(0, 120) + "...");

  // Step 1: Start long-running video generation
  const generateUrl = `${BASE_URL}/models/${MODEL}:predictLongRunning`;

  const generateBody = {
    instances: [
      {
        prompt: prompt,
      },
    ],
    parameters: {
      aspectRatio: "9:16",
    },
  };

  console.log("[video-gen] Calling:", generateUrl);

  const generateRes = await fetch(generateUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(generateBody),
  });

  if (!generateRes.ok) {
    const errText = await generateRes.text();
    throw new Error(`Video generation request failed (${generateRes.status}): ${errText}`);
  }

  const generateData = (await generateRes.json()) as any;
  const operationName = generateData.name;

  if (!operationName) {
    throw new Error("No operation name returned: " + JSON.stringify(generateData));
  }

  console.log("[video-gen] Operation started:", operationName);

  // Step 2: Poll for completion
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS);

    const pollUrl = `${BASE_URL}/${operationName}`;
    const pollRes = await fetch(pollUrl, {
      headers: { "x-goog-api-key": apiKey },
    });

    if (!pollRes.ok) {
      const err = await pollRes.text();
      console.error(`[video-gen] Poll failed (${pollRes.status}):`, err.substring(0, 200));
      continue;
    }

    const pollData = (await pollRes.json()) as any;

    if (pollData.done) {
      console.log("[video-gen] Video generation complete!");

      // Extract video URI from response
      // Response structure: response.generateVideoResponse.generatedSamples[0].video.uri
      const videoUri =
        pollData.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ||
        pollData.response?.videoUri ||
        pollData.response?.generatedVideos?.[0]?.video?.uri;

      if (!videoUri) {
        throw new Error("No video URI found. Response: " + JSON.stringify(pollData.response).substring(0, 500));
      }

      console.log("[video-gen] Video URI:", videoUri.substring(0, 100) + "...");

      // Step 3: Download the video
      const outputPath = path.join(config.paths.output, `raw_${Date.now()}.mp4`);

      await downloadVideo(videoUri, outputPath, apiKey);
      console.log("[video-gen] Video saved to:", outputPath);

      return { videoPath: outputPath, duration: 8 };
    }

    // Check for error in operation
    if (pollData.error) {
      throw new Error("Video generation error: " + JSON.stringify(pollData.error));
    }

    console.log(`[video-gen] Polling... (attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS})`);
  }

  throw new Error("Video generation timed out after 10 minutes");
}

async function downloadVideo(url: string, outputPath: string, apiKey: string): Promise<void> {
  // Add API key to URL for download
  const separator = url.includes("?") ? "&" : "?";
  const downloadUrl = `${url}${separator}key=${apiKey}`;

  const res = await fetch(downloadUrl);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to download video (${res.status}): ${errText.substring(0, 300)}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  console.log(`[video-gen] Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
