import { chromium, BrowserContext, Page } from "playwright";
import fs from "fs";
import path from "path";
import { config } from "../../config";

const FLOW_URL = "https://labs.google/fx/tools/flow";
const AUTH_STATE_PATH = path.join(process.cwd(), "tokens", "google-flow-auth.json");
const TIMEOUT_MS = 180_000; // 3 minutes for video generation

export interface FlowVideoResult {
  videoPath: string;
  duration: number;
}

/**
 * Authenticate with Google Flow (one-time setup)
 * Opens browser for user to sign in, saves session
 */
export async function authenticateGoogleFlow(): Promise<void> {
  console.log("[google-flow] Opening browser for authentication...");
  console.log("[google-flow] Sign in with your Google account.");

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(FLOW_URL);

  // Wait for user to complete sign in (up to 5 minutes)
  console.log("[google-flow] Waiting for sign in... (complete in browser)");
  await page.waitForURL("**/labs.google/**", { timeout: 300_000 });

  // Wait for Flow interface to load
  await page.waitForTimeout(5000);

  // Save auth state
  const authDir = path.dirname(AUTH_STATE_PATH);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  await context.storageState({ path: AUTH_STATE_PATH });
  console.log("[google-flow] Authentication saved to:", AUTH_STATE_PATH);

  await browser.close();
  console.log("[google-flow] Authentication complete!");
}

/**
 * Generate video using Google Flow web interface
 */
export async function generateVideoWithFlow(
  prompt: string,
  duration: number = 8
): Promise<FlowVideoResult> {
  console.log("[google-flow] Starting video generation...");
  console.log("[google-flow] Prompt:", prompt.substring(0, 120) + "...");

  // Check if auth exists
  if (!fs.existsSync(AUTH_STATE_PATH)) {
    throw new Error(
      "Google Flow not authenticated. Run: npx tsx src/auth-google-flow.ts"
    );
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: AUTH_STATE_PATH,
  });
  const page = await context.newPage();

  try {
    // Navigate to Flow
    await page.goto(FLOW_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Check if we're logged in
    const isLoggedIn = await page
      .locator('button:has-text("Sign in"), a:has-text("Sign in")')
      .count();
    if (isLoggedIn > 0) {
      throw new Error("Not logged in. Please re-authenticate: npx tsx src/auth-google-flow.ts");
    }

    // Click "Start from scratch" or find the text-to-video option
    const startButton = page.locator('button:has-text("Start from scratch"), div:has-text("Start from scratch")').first();
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(2000);
    }

    // Find and fill the prompt textarea
    const promptInput = page.locator('textarea, [contenteditable="true"], input[type="text"]').first();
    await promptInput.waitFor({ state: "visible", timeout: 10000 });
    await promptInput.click();
    await promptInput.fill(prompt);
    await page.waitForTimeout(1000);

    // Select duration (8 seconds is default)
    // Look for duration selector
    const durationSelector = page.locator('button:has-text("8s"), [data-duration="8"]').first();
    if (await durationSelector.isVisible()) {
      await durationSelector.click();
    }

    // Click Generate button
    const generateButton = page.locator('button:has-text("Generate"), button[aria-label="Generate"]').first();
    await generateButton.waitFor({ state: "visible", timeout: 10000 });
    await generateButton.click();

    console.log("[google-flow] Generation started, waiting for completion...");

    // Wait for video to generate (poll for completion)
    const videoUrl = await waitForVideoCompletion(page);
    console.log("[google-flow] Video URL:", videoUrl.substring(0, 100) + "...");

    // Download the video
    const outputPath = path.join(config.paths.output, `flow_raw_${Date.now()}.mp4`);
    await downloadVideo(videoUrl, outputPath);

    console.log("[google-flow] Video saved to:", outputPath);
    return { videoPath: outputPath, duration: 8 };
  } finally {
    await browser.close();
  }
}

async function waitForVideoCompletion(page: Page): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < TIMEOUT_MS) {
    // Check for completed video
    const videoElement = page.locator('video source, video[src]').first();
    if (await videoElement.isVisible()) {
      const src = await videoElement.getAttribute("src");
      if (src && src.includes("http")) {
        return src;
      }
    }

    // Check for download button
    const downloadButton = page.locator('button:has-text("Download"), a:has-text("Download")').first();
    if (await downloadButton.isVisible()) {
      // Get the video URL from the download link
      const href = await downloadButton.getAttribute("href");
      if (href) return href;
    }

    // Check for error
    const errorElement = page.locator('.error, [role="alert"]').first();
    if (await errorElement.isVisible()) {
      const errorText = await errorElement.textContent();
      throw new Error(`Generation failed: ${errorText}`);
    }

    console.log("[google-flow] Waiting for generation...");
    await page.waitForTimeout(5000);
  }

  throw new Error("Video generation timed out after 3 minutes");
}

async function downloadVideo(url: string, outputPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download video: ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  console.log(`[google-flow] Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
}
