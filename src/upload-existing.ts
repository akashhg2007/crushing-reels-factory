import fs from "fs";
import path from "path";
import { uploadToYouTube } from "./modules/youtube/upload";
import { getTemplates, generateTitle, generateDescription, generateTags } from "./modules/prompt-engine";

const OUTPUT_DIR = path.join(process.cwd(), "output");

async function main() {
  console.log("=== Upload Existing Videos to YouTube ===\n");

  // Get all processed videos
  const videos = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.startsWith("processed_") && f.endsWith(".mp4"))
    .sort();

  if (videos.length === 0) {
    console.log("No processed videos found in output/");
    return;
  }

  console.log(`Found ${videos.length} processed video(s):\n`);
  videos.forEach((v, i) => {
    const stats = fs.statSync(path.join(OUTPUT_DIR, v));
    console.log(`  ${i + 1}. ${v} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  });

  const templates = getTemplates();

  for (let i = 0; i < videos.length; i++) {
    const videoFile = videos[i];
    const videoPath = path.join(OUTPUT_DIR, videoFile);
    const template = templates[i % templates.length];

    console.log(`\n--- Uploading ${i + 1}/${videos.length}: ${videoFile} ---`);
    console.log(`Object: ${template.name}`);

    const title = generateTitle(template);
    const description = generateDescription(template);
    const tags = generateTags(template);

    console.log(`Title: ${title}`);

    try {
      const result = await uploadToYouTube(videoPath, title, description, tags);
      console.log(`✅ Uploaded: ${result.url}`);
    } catch (err: any) {
      console.error(`❌ Failed: ${err.message}`);
    }

    // Delay between uploads
    if (i < videos.length - 1) {
      console.log("Waiting 30 seconds...");
      await new Promise(r => setTimeout(r, 30_000));
    }
  }

  console.log("\n=== Upload Complete ===");
}

main().catch(console.error);
