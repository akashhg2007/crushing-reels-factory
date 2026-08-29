import http from "http";
import { runDailyBatch, startScheduler, runPipelineOnce } from "./modules/scheduler";
import { getTemplates } from "./modules/prompt-engine";

const PORT = process.env.PORT || 3000;

/**
 * Serve mode: runs the scheduler + HTTP server for health checks.
 * This is the mode used in cloud deployment.
 */
export async function serve(): Promise<void> {
  console.log("========================================");
  console.log("  AI CRUSHING REELS FACTORY");
  console.log("  Cloud Mode — Running 24/7");
  console.log("========================================\n");

  // Start HTTP server for health checks
  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
      return;
    }

    if (req.url === "/status") {
      const db = require("./db").loadDb();
      const recentJobs = db.jobs.slice(-10).reverse();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify(
          {
            status: "running",
            uptime: process.uptime(),
            totalJobs: db.jobs.length,
            recentJobs,
          },
          null,
          2
        )
      );
      return;
    }

    if (req.url === "/run" && req.method === "POST") {
      // Trigger a manual run
      runDailyBatch().catch(console.error);
      res.writeHead(202, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "batch started" }));
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  });

  server.listen(PORT, () => {
    console.log(`[serve] Health check: http://localhost:${PORT}/health`);
    console.log(`[serve] Status: http://localhost:${PORT}/status`);
    console.log(`[serve] Manual trigger: POST http://localhost:${PORT}/run`);
  });

  // Start the daily scheduler
  startScheduler();

  console.log("[serve] Factory is running! Videos will generate at 8,10,12,14,16,18 UTC");
}
