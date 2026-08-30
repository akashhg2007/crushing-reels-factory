import cron from "node-cron";
import fs from "fs";
import path from "path";
import { uploadViralShort, checkCopyright } from "./modules/youtube/viral-upload";

const CROPPED_DIR = path.join(process.cwd(), "cropped");
const UPLOADED_LOG = path.join(process.cwd(), "uploaded.json");

function getUploaded(): string[] {
  if (fs.existsSync(UPLOADED_LOG)) {
    return JSON.parse(fs.readFileSync(UPLOADED_LOG, "utf-8"));
  }
  return [];
}

function saveUploaded(ids: string[]) {
  fs.writeFileSync(UPLOADED_LOG, JSON.stringify(ids, null, 2));
}

async function uploadTwoVideos() {
  console.log(`\n[${new Date().toISOString()}] Starting scheduled upload...`);
  
  const videos = fs.readdirSync(CROPPED_DIR)
    .filter(f => f.endsWith(".mp4"))
    .sort();
  
  const uploaded = getUploaded();
  const pending = videos.filter(v => !uploaded.includes(v));
  
  if (pending.length === 0) {
    console.log("No videos to upload!");
    return;
  }
  
  const toUpload = pending.slice(0, 2);
  
  for (let i = 0; i < toUpload.length; i++) {
    const video = toUpload[i];
    const videoPath = path.join(CROPPED_DIR, video);
    
    const copyright = checkCopyright(videoPath);
    if (!copyright.safe) {
      console.log(`SKIPPED ${video}: ${copyright.reason}`);
      continue;
    }
    
    try {
      const result = await uploadViralShort(videoPath, uploaded.length + i);
      uploaded.push(video);
      saveUploaded(uploaded);
      console.log(`SUCCESS: ${result.url}`);
    } catch (err: any) {
      console.error(`FAILED: ${err.message}`);
    }
    
    if (i < toUpload.length - 1) {
      await new Promise(r => setTimeout(r, 30_000));
    }
  }
  
  console.log(`Total uploaded: ${uploaded.length}`);
}

// Schedule: 12 PM and 8 PM (viral timestamps)
cron.schedule("0 12 * * *", uploadTwoVideos);   // 12:00 PM
cron.schedule("0 20 * * *", uploadTwoVideos);   // 8:00 PM

console.log("=== Upload Scheduler Started ===");
console.log("Scheduled: 12:00 PM and 8:00 PM daily");
console.log("Press Ctrl+C to stop\n");

// Run once on start for testing
uploadTwoVideos();
