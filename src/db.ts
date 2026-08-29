import fs from "fs";
import path from "path";
import { config } from "./config";

export interface ObjectEntry {
  id: number;
  name: string;
  material: string;
  category: string;
  used: boolean;
  youtubeId?: string;
  videoPath?: string;
  publishedAt?: string;
  createdAt: string;
}

export interface VideoJob {
  id: number;
  objectId: number;
  status: "pending" | "generating" | "processing" | "uploading" | "done" | "failed";
  prompt: string;
  videoPath?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

interface Database {
  objects: ObjectEntry[];
  jobs: VideoJob[];
  nextObjectId: number;
  nextJobId: number;
}

const DB_PATH = path.join(config.paths.data, "db.json");

function getDefaultDb(): Database {
  return { objects: [], jobs: [], nextObjectId: 1, nextJobId: 1 };
}

export function loadDb(): Database {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    }
  } catch (e) {
    console.error("Failed to load DB, creating fresh:", e);
  }
  return getDefaultDb();
}

export function saveDb(db: Database): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

export function getNextObject(db: Database): ObjectEntry | undefined {
  return db.objects.find((o) => !o.used);
}

export function markObjectUsed(
  db: Database,
  id: number,
  youtubeId: string,
  videoPath: string
): void {
  const obj = db.objects.find((o) => o.id === id);
  if (obj) {
    obj.used = true;
    obj.youtubeId = youtubeId;
    obj.videoPath = videoPath;
    obj.publishedAt = new Date().toISOString();
  }
  saveDb(db);
}

export function createJob(db: Database, objectId: number, prompt: string): VideoJob {
  const job: VideoJob = {
    id: db.nextJobId++,
    objectId,
    status: "pending",
    prompt,
    createdAt: new Date().toISOString(),
  };
  db.jobs.push(job);
  saveDb(db);
  return job;
}

export function updateJob(db: Database, jobId: number, updates: Partial<VideoJob>): void {
  const job = db.jobs.find((j) => j.id === jobId);
  if (job) {
    Object.assign(job, updates);
    if (updates.status === "done" || updates.status === "failed") {
      job.completedAt = new Date().toISOString();
    }
  }
  saveDb(db);
}

export function loadObjectsFromFile(): void {
  const db = loadDb();
  if (db.objects.length > 0) return;

  const objectsPath = path.join(config.paths.data, "objects.json");
  if (!fs.existsSync(objectsPath)) {
    console.error("objects.json not found at", objectsPath);
    return;
  }

  const raw = JSON.parse(fs.readFileSync(objectsPath, "utf-8"));
  db.objects = raw.objects.map((o: any, i: number) => ({
    id: i + 1,
    name: o.name,
    material: o.material,
    category: o.category,
    used: false,
    createdAt: new Date().toISOString(),
  }));
  db.nextObjectId = db.objects.length + 1;
  saveDb(db);
  console.log(`Loaded ${db.objects.length} objects into database`);
}
