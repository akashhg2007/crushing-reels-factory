import { authenticateGoogleFlow } from "./modules/video-gen/google-flow";

async function main() {
  console.log("=== Google Flow Authentication ===");
  console.log("A browser window will open. Sign in with your Google account.");
  console.log("Make sure you have Google Flow access at labs.google/fx/tools/flow");
  console.log("");

  try {
    await authenticateGoogleFlow();
    console.log("\nAuthentication successful!");
    console.log("You can now run the factory with: npx tsx src/index.ts run");
  } catch (err: any) {
    console.error("\nAuthentication failed:", err.message);
    process.exit(1);
  }
}

main();
