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

async function main() {
  console.log("=== Viral Shorts Uploader (2 per run) ===\n");
  
  const videos = fs.readdirSync(CROPPED_DIR)
    .filter(f => f.endsWith(".mp4"))
    .sort();
  
  const uploaded = getUploaded();
  const pending = videos.filter(v => !uploaded.includes(v));
  
  console.log(`Total videos: ${videos.length}`);
  console.log(`Already uploaded: ${uploaded.length}`);
  console.log(`Pending: ${pending.length}\n`);
  
  if (pending.length === 0) {
    console.log("No videos to upload!");
    return;
  }
  
  // Upload 2 videos
  const toUpload = pending.slice(0, 2);
  
  for (let i = 0; i < toUpload.length; i++) {
    const video = toUpload[i];
    const videoPath = path.join(CROPPED_DIR, video);
    
    console.log(`\n--- Video ${i + 1}/2: ${video} ---`);
    
    // Copyright check
    const copyright = checkCopyright(videoPath);
    if (!copyright.safe) {
      console.log(`SKIPPED: ${copyright.reason}`);
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
    
    // Wait between uploads
    if (i < toUpload.length - 1) {
      console.log("Waiting 30 seconds...");
      await new Promise(r => setTimeout(r, 30_000));
    }
  }
  
  console.log("\n=== Done! ===");
  console.log(`Total uploaded: ${uploaded.length}`);
}

main().catch(console.error);
