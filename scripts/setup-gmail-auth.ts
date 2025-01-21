import { google } from 'googleapis';
import { config } from 'dotenv';
import * as http from 'http';
import open from 'open';
import { writeFileSync } from 'fs';

// Load environment variables
config({ path: '.env.local' });

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send'
];

async function getGmailCredentials() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http://localhost:3000/oauth2callback'
  );

  // Generate auth URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  console.log('Authorize this app by visiting:', authUrl);
  await open(authUrl);

  // Create server to handle callback
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const code = url.searchParams.get('code');

      if (code) {
        // Get tokens
        const { tokens } = await oauth2Client.getToken(code);
        console.log('\nCredentials obtained successfully!');

        // Save credentials to .env.local
        const envContent = `
# Gmail OAuth2 Credentials
GMAIL_REFRESH_TOKEN=${tokens.refresh_token}
GMAIL_ACCESS_TOKEN=${tokens.access_token}
GMAIL_TOKEN_EXPIRY=${tokens.expiry_date}
`;

        writeFileSync('.env.local.gmail', envContent);
        console.log('\nCredentials saved to .env.local.gmail');

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Authentication successful!</h1><p>You can close this window.</p>');
        server.close();
      }
    } catch (error) {
      console.error('Error getting tokens:', error);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end('<h1>Authentication failed!</h1><p>Please check the console.</p>');
      server.close();
    }
  });

  server.listen(3000, () => {
    console.log('\nWaiting for authentication...');
  });
}

getGmailCredentials();