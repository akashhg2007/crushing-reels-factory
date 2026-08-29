import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { config } from "../../config";

const META_AI_URL = "https://www.meta.ai/";
const AUTH_STATE_PATH = path.join(process.cwd(), "tokens", "meta-ai-auth.json");

export interface VideoGenResult {
  videoPath: string;
  duration: number;
}

/**
 * Authenticate with Meta AI (one-time setup)
 */
export async function authenticateMetaAI(): Promise<void> {
  console.log("[meta-ai] Opening browser for authentication...");
  console.log("[meta-ai] Sign in with your Facebook/Instagram account.");

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(META_AI_URL);

  // Wait for user to complete sign in (up to 5 minutes)
  console.log("[meta-ai] Waiting for sign in... (complete in browser)");
  
  // Wait until we're on meta.ai main page (not auth pages)
  await page.waitForTimeout(300_000); // Wait 5 minutes for user to complete sign in

  // Save auth state
  const authDir = path.dirname(AUTH_STATE_PATH);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  await context.storageState({ path: AUTH_STATE_PATH });
  console.log("[meta-ai] Authentication saved to:", AUTH_STATE_PATH);

  await browser.close();
  console.log("[meta-ai] Authentication complete!");
}

/**
 * Generate video using Meta AI web interface
 */
export async function generateVideoWithMetaAI(prompt: string): Promise<VideoGenResult> {
  console.log("[meta-ai] Starting video generation...");
  console.log("[meta-ai] Prompt:", prompt.substring(0, 120) + "...");

  if (!fs.existsSync(AUTH_STATE_PATH)) {
    throw new Error("Meta AI not authenticated. Run: npx tsx src/auth-meta-ai.ts");
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: AUTH_STATE_PATH,
  });
  const page = await context.newPage();

  try {
    // Navigate to Meta AI
    await page.goto(META_AI_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Check if logged in
    const loginButton = page.locator('button:has-text("Log in"), a:has-text("Log in")').first();
    if (await loginButton.isVisible()) {
      throw new Error("Not logged in. Please re-authenticate: npx tsx src/auth-meta-ai.ts");
    }

    // Find the chat input
    const chatInput = page.locator('textarea, [contenteditable="true"], input[type="text"]').first();
    await chatInput.waitFor({ state: "visible", timeout: 10000 });

    // Type the prompt with video command
    await chatInput.click();
    await chatInput.fill(`/video ${prompt}`);
    await page.waitForTimeout(1000);

    // Press Enter to submit
    await chatInput.press("Enter");

    console.log("[meta-ai] Prompt submitted, waiting for video...");

    // Wait for video to appear (poll for completion)
    const videoPath = await waitForVideoCompletion(page);
    console.log("[meta-ai] Video saved to:", videoPath);

    return { videoPath, duration: 8 };
  } finally {
    await browser.close();
  }
}

async function waitForVideoCompletion(page: any): Promise<string> {
  const maxAttempts = 60; // 5 minutes max
  const pollInterval = 5000; // 5 seconds

  for (let i = 0; i < maxAttempts; i++) {
    // Check for video element
    const videoElement = page.locator('video, video source, [data-testid="video"]').first();
    if (await videoElement.isVisible()) {
      // Try to get video URL
      const src = await videoElement.getAttribute("src");
      if (src && src.includes("http")) {
        // Download the video
        const outputPath = path.join(config.paths.output, `meta_ai_${Date.now()}.mp4`);
        await downloadVideo(src, outputPath);
        return outputPath;
      }
    }

    // Check for download button
    const downloadButton = page.locator('button:has-text("Download"), a:has-text("Download"), [aria-label="Download"]').first();
    if (await downloadButton.isVisible()) {
      // Click download and wait for file
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 10000 }),
        downloadButton.click(),
      ]);
      const outputPath = path.join(config.paths.output, `meta_ai_${Date.now()}.mp4`);
      await download.saveAs(outputPath);
      return outputPath;
    }

    // Check for error
    const errorElement = page.locator('.error, [role="alert"], text="error"').first();
    if (await errorElement.isVisible()) {
      const errorText = await errorElement.textContent();
      throw new Error(`Generation failed: ${errorText}`);
    }

    console.log(`[meta-ai] Waiting for video... (${i + 1}/${maxAttempts})`);
    await page.waitForTimeout(pollInterval);
  }

  throw new Error("Video generation timed out after 5 minutes");
}

async function downloadVideo(url: string, outputPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download video: ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  console.log(`[meta-ai] Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
}
