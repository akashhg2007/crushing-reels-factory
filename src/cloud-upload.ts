import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { google } from "googleapis";
import { config } from "./config";

const TOKEN_PATH = path.join(process.cwd(), "tokens", "youtube.json");
const URLS_FILE = path.join(process.cwd(), "downloads", "upload_urls.txt");
const UPLOADED_LOG = path.join(process.cwd(), "cloud_uploaded.json");
const TEMP_DIR = path.join(process.cwd(), "temp");

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const VIRAL_TITLES = [
  "This Level is IMPOSSIBLE! 😱 #shorts",
  "POV: You're stuck at Level 58 💀 #shorts",
  "When the game gets REAL #gaming #shorts",
  "I can't believe I passed this! 🔥 #shorts",
  "This boss is UNDEFEATED! 👑 #gaming #shorts",
  "Wait for it... 😂 #shorts #gaming",
  "Pro vs Noob moments 🎮 #shorts",
  "Almost had a heart attack! 💪 #shorts",
  "The hardest level EVER! 😤 #gaming #shorts",
  "Watch till the END! 🤯 #shorts"
];

const VIRAL_DESCRIPTIONS = [
  "Wait for the ending! 😱\n\nFollow for more gaming content!\n\n#shorts #gaming #viral #fyp #trending",
  "Can you beat this level? Comment below! 👇\n\n#shorts #gaming #mobilegaming #viral",
  "This had me screaming! 😂\n\nLike & Subscribe for more!\n\n#shorts #gaming #funny #viral",
  "POV: When you finally beat the level 🎉\n\n#shorts #gaming #win #viral #fyp",
  "Tag someone who needs to see this! 👀\n\n#shorts #gaming #tag #viral"
];

function getAuth() {
  const oauth2 = new google.auth.OAuth2(
    config.youtube.clientId,
    config.youtube.clientSecret,
    config.youtube.redirectUri
  );
  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
  oauth2.setCredentials(tokens);
  return oauth2;
}

function getUploaded(): string[] {
  if (fs.existsSync(UPLOADED_LOG)) {
    return JSON.parse(fs.readFileSync(UPLOADED_LOG, "utf-8"));
  }
  return [];
}

function saveUploaded(ids: string[]) {
  fs.writeFileSync(UPLOADED_LOG, JSON.stringify(ids, null, 2));
}

function loadUrls(): { id: string; url: string }[] {
  const content = fs.readFileSync(URLS_FILE, "utf-8");
  return content.split("\n").filter(l => l.trim()).map(line => {
    const [id, url] = line.split(": ");
    return { id: id.trim(), url: url.trim() };
  });
}

function downloadFile(url: string, dest: string): void {
  execSync(`curl -L -o "${dest}" "${url}"`, { timeout: 120000 });
}

async function uploadToYouTube(videoPath: string, title: string, description: string) {
  const auth = getAuth();
  const youtube = google.youtube({ version: "v3", auth });
  const fileSize = fs.statSync(videoPath).size;
  
  const res = await youtube.videos.insert(
    {
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: title.substring(0, 100),
          description: description,
          tags: ["gaming", "shorts", "viral", "fyp", "mobilegaming", "funny"],
          categoryId: "20",
        },
        status: {
          privacyStatus: "public",
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: fs.createReadStream(videoPath),
      },
    },
    {
      onUploadProgress: (evt: any) => {
        const progress = Math.round((evt.bytesRead / fileSize) * 100);
        process.stdout.write(`\rProgress: ${progress}%`);
      },
    }
  );
  
  return { videoId: res.data.id, url: `https://youtube.com/shorts/${res.data.id}` };
}

export async function uploadTwoFromCloud() {
  console.log(`\n[${new Date().toISOString()}] Uploading 2 videos from cloud...\n`);
  
  const urls = loadUrls();
  const uploaded = getUploaded();
  const pending = urls.filter(u => !uploaded.includes(u.id));
  
  console.log(`Total in cloud: ${urls.length}`);
  console.log(`Already uploaded: ${uploaded.length}`);
  console.log(`Pending: ${pending.length}\n`);
  
  if (pending.length === 0) {
    console.log("No videos to upload!");
    return;
  }
  
  // Pick 2 with different sizes (different durations)
  const sorted = pending.sort((a, b) => {
    const sizeA = fs.existsSync(path.join(TEMP_DIR, `${a.id}.mp4`)) 
      ? fs.statSync(path.join(TEMP_DIR, `${a.id}.mp4`)).size : 0;
    const sizeB = fs.existsSync(path.join(TEMP_DIR, `${b.id}.mp4`)) 
      ? fs.statSync(path.join(TEMP_DIR, `${b.id}.mp4`)).size : 0;
    return sizeA - sizeB;
  });
  
  const toUpload = sorted.slice(0, 2);
  
  for (let i = 0; i < toUpload.length; i++) {
    const { id, url } = toUpload[i];
    const tempFile = path.join(TEMP_DIR, `${id}.mp4`);
    
    console.log(`--- Video ${i + 1}/2: ${id} ---`);
    
    // Download from cloud
    console.log(`Downloading from cloud...`);
    try {
      downloadFile(url, tempFile);
      const size = fs.statSync(tempFile).size / (1024 * 1024);
      console.log(`Downloaded: ${size.toFixed(2)} MB`);
    } catch (err: any) {
      console.error(`Download failed: ${err.message}`);
      continue;
    }
    
    // Upload to YouTube
    const title = VIRAL_TITLES[(uploaded.length + i) % VIRAL_TITLES.length];
    const desc = VIRAL_DESCRIPTIONS[(uploaded.length + i) % VIRAL_DESCRIPTIONS.length];
    
    try {
      const result = await uploadToYouTube(tempFile, title, desc);
      uploaded.push(id);
      saveUploaded(uploaded);
      console.log(`\nSUCCESS: ${result.url}\n`);
    } catch (err: any) {
      console.error(`\nFAILED: ${err.message}\n`);
    }
    
    // Cleanup temp file
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    
    if (i < toUpload.length - 1) {
      console.log("Waiting 30 seconds...");
      await new Promise(r => setTimeout(r, 30_000));
    }
  }
  
  console.log(`Total uploaded from cloud: ${uploaded.length}`);
}

// Run if called directly
if (require.main === module) {
  uploadTwoFromCloud().catch(console.error);
}
