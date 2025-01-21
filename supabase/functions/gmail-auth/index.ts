import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.labels'
];

serve(async (req) => {
  try {
    const { state } = await req.json();
    const authUser = await getAuthUser(req);
    
    if (!authUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    // Generate OAuth URL
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', Deno.env.get('GMAIL_CLIENT_ID')!);
    url.searchParams.set('redirect_uri', Deno.env.get('GMAIL_REDIRECT_URI')!);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', SCOPES.join(' '));
    url.searchParams.set('state', state);
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');

    // Include user ID in state
    const enhancedState = `${state}:${authUser.id}`;
    url.searchParams.set('state', enhancedState);

    return new Response(
      JSON.stringify({ url: url.toString() }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error generating auth URL:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});

async function getAuthUser(req: Request) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) throw error;
    return user;

  } catch (error) {
    console.error('Error getting auth user:', error);
    return null;
  }
}