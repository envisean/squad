import { useState, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Loader2, Mail, CheckCircle, XCircle } from 'lucide-react';

export function GmailSetup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<any>(null);
  const supabase = useSupabaseClient();
  const user = useUser();

  useEffect(() => {
    // Check if already connected
    if (user) {
      checkExistingConnection();
    }
  }, [user]);

  const checkExistingConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('gmail_credentials')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      setCredentials(data);
    } catch (error) {
      console.error('Error checking credentials:', error);
      // Don't show error - just means no connection yet
    }
  };

  const startOAuthFlow = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Generate state for security
      const state = crypto.randomUUID();
      sessionStorage.setItem('gmail_oauth_state', state);

      // Get OAuth URL from our Edge Function
      const { data, error } = await supabase.functions.invoke('gmail-auth', {
        body: { state }
      });

      if (error) throw error;

      // Store current URL for redirect back
      sessionStorage.setItem('gmail_setup_redirect', window.location.href);

      // Redirect to Google OAuth
      window.location.href = data.url;

    } catch (error: any) {
      console.error('Error starting OAuth flow:', error);
      setError(error.message || 'Failed to start Gmail authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectGmail = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { error } = await supabase
        .from('gmail_credentials')
        .update({ is_active: false })
        .eq('user_id', user!.id)
        .eq('id', credentials.id);

      if (error) throw error;

      setCredentials(null);
    } catch (error: any) {
      console.error('Error disconnecting Gmail:', error);
      setError(error.message || 'Failed to disconnect Gmail');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Gmail Integration
        </CardTitle>
        <CardDescription>
          Connect your Gmail account to enable the email assistant
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {credentials ? (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Connected</AlertTitle>
              <AlertDescription>
                Gmail account {credentials.email_address} is connected and active
              </AlertDescription>
            </Alert>

            <div className="text-sm text-muted-foreground">
              <p>Last sync: {new Date(credentials.last_sync_at).toLocaleString()}</p>
              <p>Status: {credentials.sync_status}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The email assistant needs access to your Gmail account to:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground">
              <li>Read and process your emails</li>
              <li>Send responses on your behalf</li>
              <li>Manage labels and organization</li>
              <li>Schedule meetings and follow-ups</li>
            </ul>
          </div>
        )}
      </CardContent>

      <CardFooter>
        {credentials ? (
          <Button
            variant="destructive"
            onClick={disconnectGmail}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Disconnect Gmail
          </Button>
        ) : (
          <Button
            onClick={startOAuthFlow}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect Gmail
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}