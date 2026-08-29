import fs from "fs";
import path from "path";
import readline from "readline";

const TOKEN_DIR = path.join(process.cwd(), "tokens");
const API_KEY_FILE = path.join(TOKEN_DIR, "magic-hour.json");

async function main() {
  console.log("=== Magic Hour API Key Setup ===\n");
  console.log("1. Go to https://magichour.ai/developer");
  console.log("2. Sign up (free, no credit card required)");
  console.log("3. Copy your API key\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question("Paste your API key: ", resolve);
  });

  rl.close();

  if (!answer.trim()) {
    console.error("No API key provided. Exiting.");
    process.exit(1);
  }

  // Save the API key
  if (!fs.existsSync(TOKEN_DIR)) {
    fs.mkdirSync(TOKEN_DIR, { recursive: true });
  }

  fs.writeFileSync(
    API_KEY_FILE,
    JSON.stringify({ apiKey: answer.trim() }, null, 2)
  );

  console.log("\nAPI key saved to:", API_KEY_FILE);
  console.log("\nYou can now run: npx tsx src/index.ts run");
}

main();
