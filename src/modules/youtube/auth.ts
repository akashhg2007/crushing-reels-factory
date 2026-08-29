import { google } from "googleapis";
import fs from "fs";
import path from "path";
import http from "http";
import { config } from "../../config";

const TOKEN_PATH = path.join(config.paths.tokens, "youtube.json");
const SCOPES = ["https://www.googleapis.com/auth/youtube.upload"];

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    config.youtube.clientId,
    config.youtube.clientSecret,
    config.youtube.redirectUri
  );
}

/**
 * Load saved tokens or start OAuth flow.
 */
export async function getAuthenticatedClient(): Promise<any> {
  const oauth2Client = getOAuth2Client();

  // Try loading saved tokens
  if (fs.existsSync(TOKEN_PATH)) {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
    oauth2Client.setCredentials(tokens);

    // Check if token is expired and refresh if needed
    if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
      console.log("[youtube-auth] Token expired, refreshing...");
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
        saveTokens(credentials);
        console.log("[youtube-auth] Token refreshed successfully");
      } catch (err) {
        console.error("[youtube-auth] Token refresh failed, starting new auth flow");
        return startAuthFlow();
      }
    }

    return oauth2Client;
  }

  // No tokens — start OAuth flow
  return startAuthFlow();
}

function startAuthFlow(): Promise<any> {
  return new Promise((resolve, reject) => {
    const oauth2Client = getOAuth2Client();
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
    });

    console.log("\n========================================");
    console.log("YOUTUBE AUTHORIZATION REQUIRED");
    console.log("========================================");
    console.log("\nOpen this URL in your browser:\n");
    console.log(authUrl);
    console.log("\nWaiting for authorization...\n");

    // Start temporary server to receive callback
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url!, `http://localhost:${config.port}`);

      if (url.pathname === "/oauth2callback") {
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        if (error) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`<h1>Authorization failed: ${error}</h1><p>Close this tab and try again.</p>`);
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }

        if (code) {
          try {
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);
            saveTokens(tokens);

            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(
              "<h1>Authorization successful!</h1>" +
                "<p>You can close this tab. The app is ready to use.</p>"
            );
            server.close();
            resolve(oauth2Client);
          } catch (err: any) {
            res.writeHead(500, { "Content-Type": "text/html" });
            res.end(`<h1>Token exchange failed: ${err.message}</h1>`);
            server.close();
            reject(err);
          }
          return;
        }
      }

      res.writeHead(404);
      res.end("Not found");
    });

    server.listen(config.port, () => {
      console.log(`OAuth callback server listening on port ${config.port}`);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error("OAuth flow timed out after 5 minutes"));
    }, 5 * 60 * 1000);
  });
}

function saveTokens(tokens: any): void {
  fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2), "utf-8");
  console.log("[youtube-auth] Tokens saved to", TOKEN_PATH);
}
