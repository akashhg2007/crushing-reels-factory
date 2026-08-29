import { authenticateMetaAI } from "./modules/video-gen/meta-ai";

async function main() {
  console.log("=== Meta AI Authentication ===");
  console.log("A browser window will open. Sign in with your Facebook or Instagram account.");
  console.log("");

  try {
    await authenticateMetaAI();
    console.log("\nAuthentication successful!");
    console.log("You can now run the factory with: npx tsx src/index.ts run");
  } catch (err: any) {
    console.error("\nAuthentication failed:", err.message);
    process.exit(1);
  }
}

main();
