import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { getAuthenticatedClient } from "./auth";

export interface UploadResult {
  videoId: string;
  title: string;
  url: string;
}

/**
 * Upload a video to YouTube as a Short.
 *
 * Requirements for Shorts classification:
 * - 9:16 aspect ratio (1080x1920)
 * - 60 seconds or less (we do 8s)
 * - Include #Shorts in title or description
 */
export async function uploadToYouTube(
  videoPath: string,
  title: string,
  description: string,
  tags: string[]
): Promise<UploadResult> {
  console.log("[youtube-upload] Starting upload:", path.basename(videoPath));

  const auth = await getAuthenticatedClient();
  const youtube = google.youtube({ version: "v3", auth });

  const fileSize = fs.statSync(videoPath).size;
  console.log("[youtube-upload] File size:", (fileSize / 1024 / 1024).toFixed(2), "MB");

  const res = await youtube.videos.insert(
    {
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: title.substring(0, 100), // YouTube max 100 chars
          description: description.substring(0, 5000),
          tags: tags,
          categoryId: "22", // People & Blogs
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
      // Resumable upload with progress tracking
      onUploadProgress: (evt: any) => {
        const progress = Math.round((evt.bytesRead / fileSize) * 100);
        process.stdout.write(`\r[youtube-upload] Progress: ${progress}%`);
      },
    }
  );

  const videoId = res.data.id;
  if (!videoId) {
    throw new Error("Upload succeeded but no video ID returned");
  }

  const url = `https://youtube.com/shorts/${videoId}`;
  console.log("\n[youtube-upload] Upload complete!");
  console.log("[youtube-upload] Video ID:", videoId);
  console.log("[youtube-upload] URL:", url);

  return { videoId, title, url };
}
