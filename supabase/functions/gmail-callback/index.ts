import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || !state) {
      throw new Error('Missing code or state');
    }

    // Extract user ID from state
    const [originalState, userId] = state.split(':');

    // Exchange code for tokens
    const tokens = await exchangeCode(code);

    // Get user email
    const email = await getUserEmail(tokens.access_token);

    // Store credentials in database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error: upsertError } = await supabase
      .from('gmail_credentials')
      .upsert({
        user_id: userId,
        email_address: email,
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000),
        is_active: true,
        sync_status: 'pending_initial_sync',
        metadata: {
          scopes: tokens.scope.split(' '),
          token_type: tokens.token_type
        }
      });

    if (upsertError) throw upsertError;

    // Redirect back to app
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/settings/email?setup=complete'
      }
    });

  } catch (error) {
    console.error('Error handling callback:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});

async function exchangeCode(code: string): Promise<TokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      code,
      client_id: Deno.env.get('GMAIL_CLIENT_ID')!,
      client_secret: Deno.env.get('GMAIL_CLIENT_SECRET')!,
      redirect_uri: Deno.env.get('GMAIL_REDIRECT_URI')!,
      grant_type: 'authorization_code'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  return response.json();
}

async function getUserEmail(accessToken: string): Promise<string> {
  const response = await fetch(
    'https://www.googleapis.com/oauth2/v2/userinfo',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get user info: ${error}`);
  }

  const data = await response.json();
  return data.email;
}