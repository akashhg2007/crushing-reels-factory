import { runPipelineOnce, runDailyBatch, runSingleNow, startScheduler } from "./modules/scheduler";
import { getTemplates } from "./modules/prompt-engine";

const args = process.argv.slice(2);
const command = args[0] || "help";

async function main() {
  console.log("========================================");
  console.log("  AI CRUSHING REELS FACTORY");
  console.log("  YouTube Shorts Edition");
  console.log("  6 Videos Per Day");
  console.log("========================================\n");

  switch (command) {
    case "serve":
      // Cloud mode: scheduler + health check server
      const { serve } = await import("./serve");
      await serve();
      break;

    case "run":
      // Run one random video now
      const isTest = args.includes("--test");
      await runSingleNow(isTest);
      break;

    case "batch":
      // Run all 6 daily videos now
      await runDailyBatch();
      break;

    case "object":
      // Run a specific object
      const objectName = args.slice(1).join(" ");
      if (!objectName) {
        console.log("Usage: npx tsx src/index.ts object <object name>");
        console.log("Example: npx tsx src/index.ts object watermelon");
        process.exit(1);
      }
      const templates = getTemplates();
      const template = templates.find(
        (t) => t.name.toLowerCase() === objectName.toLowerCase()
      );
      if (!template) {
        console.log(`Object "${objectName}" not found. Available:`);
        templates.forEach((t) => console.log(`  - ${t.name}`));
        process.exit(1);
      }
      await runPipelineOnce(template);
      break;

    case "list":
      // List all available objects
      const allTemplates = getTemplates();
      console.log("Available objects:");
      allTemplates.forEach((t, i) => {
        console.log(`  ${i + 1}. ${t.name} (${t.material}) - ${t.category}`);
      });
      break;

    case "schedule":
      // Start the daily scheduler
      startScheduler();
      process.on("SIGINT", () => {
        console.log("\nShutting down scheduler...");
        process.exit(0);
      });
      break;

    case "auth":
      // Test YouTube OAuth flow
      const { getAuthenticatedClient } = await import("./modules/youtube/auth");
      await getAuthenticatedClient();
      console.log("\nYouTube authentication successful!");
      break;

    default:
      console.log("Commands:");
      console.log("  npx tsx src/index.ts serve            — Cloud mode (24/7 scheduler)");
      console.log("  npx tsx src/index.ts run              — Generate 1 random video now");
      console.log("  npx tsx src/index.ts batch            — Generate all 6 daily videos now");
      console.log("  npx tsx src/index.ts object <name>    — Generate specific object");
      console.log("  npx tsx src/index.ts list             — List all 20 objects");
      console.log("  npx tsx src/index.ts schedule         — Start daily scheduler (6/day)");
      console.log("  npx tsx src/index.ts auth             — Set up YouTube OAuth tokens");
      console.log("");
      console.log("Examples:");
      console.log("  npx tsx src/index.ts object watermelon");
      console.log("  npx tsx src/index.ts object glass bottle");
      break;
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
