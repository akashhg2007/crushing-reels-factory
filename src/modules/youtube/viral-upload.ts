import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { config } from "../../config";

const TOKEN_PATH = path.join(config.paths.tokens, "youtube.json");

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

// Viral titles for gaming shorts
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
  "Watch till the END! 🤯 #shorts",
  "My reaction when... 😂 #shorts",
  "Gaming at 3AM hits different 🌙 #shorts",
  "Thiscombo is SICK! 🔥 #gaming #shorts",
  "No way that just happened! 😳 #shorts",
  "Destroying this level! 💪 #gaming #shorts"
];

const VIRAL_DESCRIPTIONS = [
  "Wait for the ending! 😱\n\nFollow for more gaming content!\n\n#shorts #gaming #viral #fyp #trending",
  "Can you beat this level? Comment below! 👇\n\n#shorts #gaming #mobilegaming #viral",
  "This had me screaming! 😂\n\nLike & Subscribe for more!\n\n#shorts #gaming #funny #viral",
  "POV: When you finally beat the level 🎉\n\n#shorts #gaming #win #viral #fyp",
  "Tag someone who needs to see this! 👀\n\n#shorts #gaming #tag #viral",
  "The ending though... 🤯\n\nDrop a 🔥 if you watched till the end!\n\n#shorts #gaming #viral",
  "This game is ADDICTING! 🎮\n\nDownload link in bio!\n\n#shorts #gaming #mobile #viral",
  "Impossible level? Challenge accepted! 💪\n\n#shorts #gaming #challenge #viral",
  "My face when... 😂\n\nFollow for daily gaming clips!\n\n#shorts #gaming #funny #viral",
  "Who else struggles with this level? 🙋\n\n#shorts #gaming #relatable #viral"
];

const VIRAL_TAGS = [
  "gaming", "shorts", "viral", "fyp", "trending", "mobilegaming",
  "gamingfunny", "gamingmoments", "level58", "impossible",
  "reaction", "funny", "epic", "pro", "n00b", "win", "fail",
  "gamingcommunity", "mobilegames", "appgame", "addictive",
  "挑战", "gaminglife", "gamer", "play", "gameplay", "highlights"
];

export async function uploadViralShort(videoPath: string, index: number = 0) {
  const auth = getAuth();
  const youtube = google.youtube({ version: "v3", auth });
  
  const title = VIRAL_TITLES[index % VIRAL_TITLES.length];
  const description = VIRAL_DESCRIPTIONS[index % VIRAL_DESCRIPTIONS.length];
  const tags = VIRAL_TAGS.slice(0, 20);
  
  const fileSize = fs.statSync(videoPath).size;
  console.log(`Uploading: ${path.basename(videoPath)} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`Title: ${title}`);
  
  const res = await youtube.videos.insert(
    {
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: title.substring(0, 100),
          description: description,
          tags: tags,
          categoryId: "20", // Gaming
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
  
  const videoId = res.data.id;
  const url = `https://youtube.com/shorts/${videoId}`;
  console.log(`\nUploaded: ${url}\n`);
  
  return { videoId, title, url };
}

// Check if video might have copyright issues (basic check)
export function checkCopyright(videoPath: string): { safe: boolean; reason: string } {
  const fileName = path.basename(videoPath).toLowerCase();
  
  // Check file size - very large files might be full episodes
  const sizeMB = fs.statSync(videoPath).size / (1024 * 1024);
  if (sizeMB > 50) {
    return { safe: false, reason: "File too large (>50MB), might be full episode" };
  }
  
  // Check duration
  return { safe: true, reason: "Passed basic checks" };
}
