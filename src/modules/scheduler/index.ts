import fs from "fs";
import path from "path";
import cron from "node-cron";
import { loadDb, saveDb, createJob, updateJob } from "../../db";
import {
  getTemplates,
  generatePrompt,
  generateTitle,
  generateDescription,
  generateTags,
  ObjectTemplate,
} from "../prompt-engine";
import { uploadToYouTube } from "../youtube";

const OUTPUT_DIR = path.join(process.cwd(), "output");
const VIDEOS_PER_DAY = 6;

/**
 * Re-upload an existing processed video to YouTube with new title/description
 */
export async function reUploadRandom(): Promise<boolean> {
  const db = loadDb();
  const templates = getTemplates();

  // Get all processed videos
  const videos = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.startsWith("processed_") && f.endsWith(".mp4"));

  if (videos.length === 0) {
    console.log("[reupload] No processed videos found!");
    return false;
  }

  // Pick a random video
  const videoFile = videos[Math.floor(Math.random() * videos.length)];
  const videoPath = path.join(OUTPUT_DIR, videoFile);

  // Pick a random template for title/description
  const template = templates[Math.floor(Math.random() * templates.length)];

  const title = generateTitle(template);
  const description = generateDescription(template);
  const tags = generateTags(template);

  console.log(`\n--- RE-UPLOAD ---`);
  console.log(`Video: ${videoFile}`);
  console.log(`Object: ${template.name}`);
  console.log(`Title: ${title}`);

  const job = createJob(db, template.name.charCodeAt(0), `Re-upload: ${template.name}`);

  try {
    const ytResult = await uploadToYouTube(videoPath, title, description, tags);
    updateJob(db, job.id, { status: "done" });

    console.log(`✅ Uploaded: ${ytResult.url}`);
    return true;
  } catch (err: any) {
    console.error(`❌ Failed: ${err.message}`);
    updateJob(db, job.id, { status: "failed", error: err.message });
    return false;
  }
}

/**
 * Run batch of re-uploads
 */
export async function runDailyBatch(): Promise<void> {
  console.log("\n========================================");
  console.log("  CRUSHING REELS FACTORY — Re-Upload Batch");
  console.log(`  Uploading ${VIDEOS_PER_DAY} existing videos`);
  console.log("========================================\n");

  let successCount = 0;

  for (let i = 0; i < VIDEOS_PER_DAY; i++) {
    console.log(`\n>>> Upload ${i + 1}/${VIDEOS_PER_DAY}`);
    const success = await reUploadRandom();
    if (success) successCount++;

    // Delay between uploads
    if (i < VIDEOS_PER_DAY - 1) {
      console.log("Waiting 30 seconds...");
      await new Promise(r => setTimeout(r, 30_000));
    }
  }

  console.log("\n========================================");
  console.log("  DAILY RE-UPLOAD COMPLETE");
  console.log(`  Success: ${successCount}/${VIDEOS_PER_DAY}`);
  console.log("========================================\n");
}

/**
 * Start the daily scheduler.
 * Runs 6 re-uploads per day at 8,10,12,14,16,18 UTC.
 */
export function startScheduler(): void {
  console.log("[scheduler] Starting daily scheduler...");
  console.log(`[scheduler] ${VIDEOS_PER_DAY} re-uploads per day`);
  console.log("[scheduler] Schedule: 8:00, 10:00, 12:00, 14:00, 16:00, 18:00 UTC");

  const schedule = "0 8,10,12,14,16,18 * * *";

  cron.schedule(schedule, () => {
    runDailyBatch().catch((err) => {
      console.error("[scheduler] Unhandled error:", err);
    });
  });

  console.log("[scheduler] Scheduler active!");
}

/**
 * Run pipeline once (kept for compatibility)
 */
export async function runPipelineOnce(template: ObjectTemplate, testMode = false): Promise<boolean> {
  return reUploadRandom();
}

/**
 * Run single now (for manual trigger)
 */
export async function runSingleNow(testMode = false): Promise<void> {
  await reUploadRandom();
}
