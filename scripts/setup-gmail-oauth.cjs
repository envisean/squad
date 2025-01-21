const { config } = require('dotenv');
const { OAuth2Client } = require('google-auth-library');
const http = require('http');
const open = require('open');

// Load environment variables
config({ path: '.env.local' });

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.labels'
];

async function getGmailToken() {
  const oauth2Client = new OAuth2Client(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http://localhost:3000/oauth2callback'
  );

  // Generate auth url
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'  // Force to get refresh token
  });

  console.log('Authorize this app by visiting this url:', authUrl);
  
  // Open the URL in browser
  await open(authUrl);

  // Create server to handle callback
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const code = url.searchParams.get('code');

      if (code) {
        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        console.log('\nAuthorization successful!');
        console.log('\nAdd these to your .env.local file:');
        console.log('\nGMAIL_ACCESS_TOKEN=' + tokens.access_token);
        console.log('GMAIL_REFRESH_TOKEN=' + tokens.refresh_token);
        console.log('GMAIL_TOKEN_EXPIRY=' + tokens.expiry_date);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Authorization successful!</h1><p>You can close this window and check your terminal for the tokens.</p>');
        
        // Close server and exit
        server.close();
        process.exit(0);
      }

    } catch (error) {
      console.error('Error getting tokens:', error);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end('<h1>Authorization failed!</h1><p>Check the console for more information.</p>');
      server.close();
      process.exit(1);
    }
  });

  // Start server
  server.listen(3000, () => {
    console.log('\nWaiting for authorization...');
  });
}

getGmailToken();