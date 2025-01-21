import { EmailAgent } from '../packages/agents/src/email/email-agent';
import { config } from 'dotenv';
import { GmailLoader } from 'langchain/document_loaders/web/gmail';

// Load environment variables
config({ path: '.env.local' });

async function testEmailReading() {
  try {
    console.log('Initializing email agent...');
    
    const agent = new EmailAgent({
      gmailCredentials: {
        clientId: process.env.GMAIL_CLIENT_ID!,
        clientSecret: process.env.GMAIL_CLIENT_SECRET!,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN!
      },
      openaiApiKey: process.env.OPENAI_API_KEY!,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      agentEmail: process.env.AGENT_EMAIL!,
      ownerEmail: process.env.OWNER_EMAIL!
    });

    // Initialize the agent
    await agent.initialize();

    // Create a Gmail loader directly for testing
    const loader = new GmailLoader({
      email: process.env.OWNER_EMAIL!,
      clientId: process.env.GMAIL_CLIENT_ID!,
      clientSecret: process.env.GMAIL_CLIENT_SECRET!,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN!,
      // Only get recent emails for testing
      searchQuery: 'newer_than:1d'
    });

    console.log('Loading recent emails...');
    const docs = await loader.load();
    console.log(`Found ${docs.length} recent emails`);

    // Process each email
    for (const doc of docs.slice(0, 3)) { // Process first 3 emails for testing
      console.log('\nProcessing email:', doc.metadata.subject);
      
      // Convert LangChain document to our Email type
      const email = {
        id: doc.metadata.messageId,
        threadId: doc.metadata.threadId,
        from: doc.metadata.from,
        to: Array.isArray(doc.metadata.to) ? doc.metadata.to : [doc.metadata.to],
        subject: doc.metadata.subject,
        body: {
          text: doc.pageContent,
          html: doc.metadata.textHtml
        },
        timestamp: new Date(doc.metadata.time)
      };

      try {
        const result = await agent.processEmail(email);
        console.log('Processing result:', JSON.stringify(result, null, 2));
      } catch (error) {
        console.error('Error processing email:', error);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testEmailReading();