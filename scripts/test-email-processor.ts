import { config } from 'dotenv';
import { EmailProcessor } from '../packages/agents/src/email/processors/email-processor';

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

    // Load emails
    console.log('Loading recent emails...');
    const emails = await EmailProcessor.loadEmails({
      email: process.env.OWNER_EMAIL!,
      clientId: process.env.GMAIL_CLIENT_ID!,
      clientSecret: process.env.GMAIL_CLIENT_SECRET!,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN!,
      query: 'newer_than:1d'
    });

    console.log(`Found ${emails.length} emails`);

    // Process each email
    for (const email of emails) {
      console.log('\n-----------------------------------');
      console.log(`Processing email: ${email.subject}`);
      console.log(`From: ${email.from}`);
      console.log(`Time: ${email.timestamp}`);
      
      try {
        const result = await processor.processEmail(email);
        console.log('\nAnalysis Results:');
        console.log('Priority:', result.classification.priority);
        console.log('Categories:', result.classification.categories);
        console.log('Requires Human:', result.classification.requires_human);
        console.log('Sentiment:', result.classification.sentiment);
        
        if (result.action_items.length > 0) {
          console.log('\nAction Items:');
          result.action_items.forEach((item, index) => {
            console.log(`\n${index + 1}. ${item.type.toUpperCase()}`);
            console.log(`   Description: ${item.description}`);
            if (item.due_date) console.log(`   Due: ${item.due_date}`);
            if (item.assignee) console.log(`   Assignee: ${item.assignee}`);
            console.log(`   Priority: ${item.priority}`);
          });
        }

        console.log('\nNext Steps:');
        result.next_steps.forEach((step, index) => {
          console.log(`${index + 1}. ${step}`);
        });

      } catch (error) {
        console.error('Error processing email:', error);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testEmailProcessor();