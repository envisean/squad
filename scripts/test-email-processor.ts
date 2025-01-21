import { config } from 'dotenv';
import { EmailProcessor } from '../packages/agents/src/email/processors/email-processor';
import { Email } from '../packages/agents/src/email/types';

// Load environment variables
config({ path: '.env.local' });

async function testEmailProcessor() {
  try {
    // Initialize processor
    const processor = new EmailProcessor({
      openaiApiKey: process.env.OPENAI_API_KEY!,
      modelName: 'gpt-4',
      temperature: 0.3
    });

    // Create Gmail loader
    const loader = await EmailProcessor.createGmailLoader({
      email: process.env.OWNER_EMAIL!,
      clientId: process.env.GMAIL_CLIENT_ID!,
      clientSecret: process.env.GMAIL_CLIENT_SECRET!,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN!,
      query: 'newer_than:1d'
    });

    console.log('Loading recent emails...');
    const docs = await loader.load();
    console.log(`Found ${docs.length} emails`);

    // Process first 3 emails
    for (const doc of docs.slice(0, 3)) {
      console.log('\nProcessing email:', doc.metadata.subject);
      
      // Convert to our Email type
      const email: Email = {
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

      // Process email
      const result = await processor.processEmail(email);
      console.log('Processing result:', JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testEmailProcessor();