import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const config = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
  },
  youtube: {
    clientId: process.env.YOUTUBE_CLIENT_ID || "",
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET || "",
    redirectUri: process.env.YOUTUBE_REDIRECT_URI || "http://localhost:3000/oauth2callback",
  },
  port: parseInt(process.env.PORT || "3000", 10),
  paths: {
    output: path.resolve(__dirname, "../../output"),
    tokens: path.resolve(__dirname, "../../tokens"),
    data: path.resolve(__dirname, "../../data"),
  },
};
