import { config } from "dotenv";
import { OAuth2Client } from "google-auth-library";

// Load environment variables
config({ path: ".env.local" });

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.labels"
];

async function getGmailToken() {
  const oauth2Client = new OAuth2Client(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    "postmessage"  // Special value that enables copy/paste workflow
  );

  // Generate auth url
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent"  // Force to get refresh token
  });

  console.log("\nPlease visit this URL to authorize the application:");
  console.log("\n", authUrl);
  console.log("\nAfter authorization, you will get a code. Please enter it here:");

  // Read the code from stdin
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  process.stdin.on("data", async (code) => {
    try {
      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code.trim());
      console.log("\nAuthorization successful!");
      console.log("\nAdd these to your .env.local file:");
      console.log("\nGMAIL_ACCESS_TOKEN=" + tokens.access_token);
      console.log("GMAIL_REFRESH_TOKEN=" + tokens.refresh_token);
      console.log("GMAIL_TOKEN_EXPIRY=" + tokens.expiry_date);
      process.exit(0);
    } catch (error) {
      console.error("Error getting tokens:", error);
      process.exit(1);
    }
  });
}

getGmailToken();
