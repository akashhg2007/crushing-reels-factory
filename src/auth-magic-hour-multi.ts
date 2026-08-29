import fs from "fs";
import path from "path";
import readline from "readline";

const TOKEN_DIR = path.join(process.cwd(), "tokens");
const API_KEY_FILE = path.join(TOKEN_DIR, "magic-hour.json");

async function main() {
  console.log("=== Magic Hour Multi-Key Setup ===\n");
  console.log("Add multiple API keys for automatic fallback when one runs out.\n");
  console.log("Get keys at: https://magichour.ai/developer\n");

  // Load existing keys
  let existingKeys: string[] = [];
  if (fs.existsSync(API_KEY_FILE)) {
    const data = JSON.parse(fs.readFileSync(API_KEY_FILE, "utf-8"));
    if (Array.isArray(data.apiKeys)) {
      existingKeys = data.apiKeys;
    } else if (data.apiKey) {
      existingKeys = [data.apiKey];
    }
  }

  if (existingKeys.length > 0) {
    console.log("Existing keys:");
    existingKeys.forEach((k, i) => {
      console.log(`  ${i + 1}. ${k.substring(0, 15)}...${k.substring(k.length - 4)}`);
    });
    console.log("");
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question("Enter new API key (or comma-separated for multiple): ", resolve);
  });

  rl.close();

  if (!answer.trim()) {
    console.log("No keys provided. Exiting.");
    process.exit(1);
  }

  // Parse new keys
  const newKeys = answer.split(",").map(k => k.trim()).filter(Boolean);

  // Merge with existing
  const allKeys = [...new Set([...existingKeys, ...newKeys])];

  // Save
  if (!fs.existsSync(TOKEN_DIR)) {
    fs.mkdirSync(TOKEN_DIR, { recursive: true });
  }

  fs.writeFileSync(
    API_KEY_FILE,
    JSON.stringify({ apiKeys: allKeys }, null, 2)
  );

  console.log(`\nSaved ${allKeys.length} API key(s):`);
  allKeys.forEach((k, i) => {
    console.log(`  ${i + 1}. ${k.substring(0, 15)}...${k.substring(k.length - 4)}`);
  });

  console.log("\nYou can now run: npx tsx src/index.ts run");
}

main();
