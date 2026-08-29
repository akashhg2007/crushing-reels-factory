import fs from "fs";
import path from "path";

const TOKENS_DIR = path.join(process.cwd(), "tokens");
const TOKEN_FILE = path.join(TOKENS_DIR, "puter.json");

async function main() {
  console.log("=== Puter.js Authentication ===");
  console.log("A browser window will open. Sign in to your Puter account.");
  console.log("");

  // Dynamic import for ESM compatibility
  const { getAuthToken } = await import("@heyputer/puter.js/src/init.cjs");

  const token = await getAuthToken("https://puter.com");

  if (!token) {
    console.error("No token received. Authentication failed.");
    process.exit(1);
  }

  console.log("Authentication successful!");
  console.log("Token:", token.substring(0, 20) + "...");

  // Save token
  if (!fs.existsSync(TOKENS_DIR)) {
    fs.mkdirSync(TOKENS_DIR, { recursive: true });
  }

  fs.writeFileSync(TOKEN_FILE, JSON.stringify({ token }, null, 2));
  console.log(`Token saved to: ${TOKEN_FILE}`);
  console.log("");
  console.log("You can now run the factory with: npx tsx src/index.ts run");
}

main().catch((err) => {
  console.error("Auth failed:", err);
  process.exit(1);
});
