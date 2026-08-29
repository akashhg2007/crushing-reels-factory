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
import { generateVideo } from "../video-gen";
import { processVideo } from "../video-processor";
import { uploadToYouTube } from "../youtube";

const VIDEOS_PER_DAY = 6;
const START_HOUR = 8; // Start at 8 AM UTC
const END_HOUR = 20; // End at 8 PM UTC
const INTERVAL_MINUTES = Math.floor((END_HOUR - START_HOUR) * 60 / VIDEOS_PER_DAY);

/**
 * Run the full pipeline for one video with a specific template.
 * @param template - The object template to use
 * @param testMode - If true, skip YouTube upload (for testing)
 */
export async function runPipelineOnce(template: ObjectTemplate, testMode = false): Promise<boolean> {
  console.log("\n--- VIDEO PIPELINE START ---");
  console.log(`Object: ${template.name} (${template.material})`);
  if (testMode) console.log("⚠️  TEST MODE — YouTube upload will be skipped");

  const db = loadDb();
  const prompt = generatePrompt(template);
  const title = generateTitle(template);
  const description = generateDescription(template);
  const tags = generateTags(template);

  console.log("Prompt:", prompt.substring(0, 150) + "...");

  const job = createJob(db, 0, prompt);
  updateJob(db, job.id, { status: "generating" });

  try {
    // Step 1: Generate video
    console.log("\n[Step 1] Generating video...");
    const genResult = await generateVideo(prompt);
    updateJob(db, job.id, { status: "processing", videoPath: genResult.videoPath });

    // Step 2: Process video
    console.log("\n[Step 2] Processing video...");
    const processed = processVideo(genResult.videoPath);
    console.log(`Output: ${processed.width}x${processed.height}, ${processed.fps}fps, ${processed.duration}s`);

    if (testMode) {
      // Skip YouTube upload in test mode
      updateJob(db, job.id, { status: "done" });
      console.log("\n=== TEST MODE COMPLETE ===");
      console.log(`Object: ${template.name}`);
      console.log(`Video saved: ${processed.outputPath}`);
      console.log("==========================\n");
      return true;
    }

    // Step 3: Upload to YouTube
    console.log("\n[Step 3] Uploading to YouTube...");
    updateJob(db, job.id, { status: "uploading" });
    const ytResult = await uploadToYouTube(processed.outputPath, title, description, tags);

    // Step 4: Record success
    updateJob(db, job.id, { status: "done" });

    console.log("\n=== VIDEO COMPLETE ===");
    console.log(`Object: ${template.name}`);
    console.log(`YouTube: ${ytResult.url}`);
    console.log("======================\n");

    return true;
  } catch (err: any) {
    console.error("\nPipeline failed:", err.message);
    updateJob(db, job.id, { status: "failed", error: err.message });
    return false;
  }
}

/**
 * Run all 6 daily videos sequentially.
 * Each video uses a different object template.
 */
export async function runDailyBatch(): Promise<void> {
  console.log("\n========================================");
  console.log("  CRUSHING REELS FACTORY — Daily Batch");
  console.log(`  Generating ${VIDEOS_PER_DAY} videos`);
  console.log("========================================\n");

  const db = loadDb();
  const templates = getTemplates();

  // Find templates not yet used today
  const usedToday = db.jobs
    .filter((j) => {
      if (!j.completedAt) return false;
      const jobDate = new Date(j.completedAt).toDateString();
      return jobDate === new Date().toDateString() && j.status === "done";
    })
    .map((j) => j.prompt);

  const available = templates.filter(
    (t) => !usedToday.some((p) => p.includes(t.name))
  );

  if (available.length === 0) {
    console.log("All templates used today. Resetting pool...");
    // Shuffle and allow reuse
    const shuffled = [...templates].sort(() => Math.random() - 0.5);
    return runBatchFromTemplates(shuffled.slice(0, VIDEOS_PER_DAY));
  }

  // Shuffle available templates
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  const toUse = shuffled.slice(0, VIDEOS_PER_DAY);
  await runBatchFromTemplates(toUse);
}

async function runBatchFromTemplates(templates: ObjectTemplate[]): Promise<void> {
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < templates.length; i++) {
    console.log(`\n>>> Video ${i + 1}/${templates.length}: ${templates[i].name}`);

    const success = await runPipelineOnce(templates[i]);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Small delay between videos to avoid rate limits
    if (i < templates.length - 1) {
      console.log("Waiting 30 seconds before next video...");
      await new Promise((r) => setTimeout(r, 30_000));
    }
  }

  console.log("\n========================================");
  console.log("  DAILY BATCH COMPLETE");
  console.log(`  Success: ${successCount}/${templates.length}`);
  console.log(`  Failed: ${failCount}/${templates.length}`);
  console.log("========================================\n");
}

/**
 * Start the daily scheduler.
 * Runs 6 videos per day at spaced intervals (8 AM to 8 PM UTC).
 */
export function startScheduler(): void {
  console.log("[scheduler] Starting daily scheduler...");
  console.log(`[scheduler] ${VIDEOS_PER_DAY} videos per day, every ${INTERVAL_MINUTES} minutes`);
  console.log("[scheduler] Schedule: 8:00, 10:00, 12:00, 14:00, 16:00, 18:00 UTC");

  // Run at specific hours: 8, 10, 12, 14, 16, 18 UTC
  const schedule = "0 8,10,12,14,16,18 * * *";

  cron.schedule(schedule, () => {
    runDailyBatch().catch((err) => {
      console.error("[scheduler] Unhandled error:", err);
    });
  });

  console.log("[scheduler] Scheduler active!");
}

/**
 * Run one video immediately (for manual testing).
 */
export async function runSingleNow(testMode = false): Promise<void> {
  const templates = getTemplates();
  // Use a counter to cycle through templates instead of random
  const counter = loadDb().jobs.length || 0;
  const template = templates[counter % templates.length];
  await runPipelineOnce(template, testMode);
}
