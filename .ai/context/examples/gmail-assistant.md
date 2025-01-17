# Gmail Inbox Assistant Agent

This agent helps manage email inbox by categorizing emails, drafting responses, and creating tasks from emails.

## Implementation

```typescript
import { BaseAgent } from '@squad/agents';
import { ComposioToolSet, Action, App } from 'composio-langchain';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { SupabaseVectorStore } from '@squad/integrations';

interface EmailTask {
  subject: string;
  from: string;
  body: string;
  priority: 'high' | 'medium' | 'low';
  requires_response: boolean;
  deadline?: Date;
}

export class GmailAssistantAgent extends BaseAgent {
  private tools: ComposioToolSet;
  private model: ChatOpenAI;
  private vectorStore: SupabaseVectorStore;
  private responseTemplates: Map<string, string>;

  constructor(config: AgentConfig) {
    super(config);
    
    this.model = new ChatOpenAI({
      modelName: 'gpt-4',
      temperature: 0.7
    });

    this.tools = new ComposioToolSet({
      api_key: process.env.COMPOSIO_API_KEY,
      apps: [App.GMAIL, App.CLICKUP],
      // Configure managed execution environment
      workspace_config: {
        type: 'docker',
        resources: { cpu: 1, memory: '2Gi' }
      }
    });

    // Initialize vector store for email context
    this.vectorStore = new SupabaseVectorStore({
      tableName: 'email_embeddings',
      queryName: 'match_emails'
    });
  }

  async initialize(): Promise<void> {
    await this.tools.initialize();
    await this.loadResponseTemplates();
    await this.setupEmailTriggers();
  }

  private async setupEmailTriggers(): Promise<void> {
    // Set up Gmail webhook for new emails
    await this.tools.execute(
      Action.GMAIL_CREATE_WATCH,
      {
        topicName: 'new-email-notifications',
        labelIds: ['INBOX']
      }
    );
  }

  async processNewEmail(email: EmailTask): Promise<void> {
    // Analyze email content
    const analysis = await this.analyzeEmail(email);
    
    // Store email embedding for context
    await this.vectorStore.addDocuments([{
      pageContent: `${email.subject}\n${email.body}`,
      metadata: {
        from: email.from,
        date: new Date().toISOString(),
        category: analysis.category
      }
    }]);

    // Handle email based on analysis
    if (analysis.requires_action) {
      await this.createTask(email, analysis);
    }

    if (analysis.requires_response) {
      await this.draftResponse(email, analysis);
    }

    // Apply labels and organize
    await this.organizeEmail(email, analysis);
  }

  private async analyzeEmail(email: EmailTask) {
    // Get similar past emails for context
    const similarEmails = await this.vectorStore.similaritySearch(
      `${email.subject}\n${email.body}`,
      5
    );

    // Analyze with LLM
    const analysis = await this.model.predict(
      `Analyze this email and determine:
      1. Priority level
      2. If it requires action
      3. If it needs a response
      4. Category/label
      5. Suggested next steps

      Email:
      From: ${email.from}
      Subject: ${email.subject}
      Body: ${email.body}

      Similar past emails:
      ${similarEmails.map(e => e.pageContent).join('\n\n')}
      `
    );

    return JSON.parse(analysis);
  }

  private async createTask(email: EmailTask, analysis: any): Promise<void> {
    // Create ClickUp task
    await this.tools.execute(
      Action.CLICKUP_CREATE_TASK,
      {
        list_id: process.env.CLICKUP_INBOX_LIST_ID,
        name: `[Email] ${email.subject}`,
        description: `From: ${email.from}\n\n${email.body}\n\nAnalysis: ${JSON.stringify(analysis, null, 2)}`,
        priority: analysis.priority,
        due_date: analysis.deadline,
        tags: [analysis.category]
      }
    );
  }

  private async draftResponse(email: EmailTask, analysis: any): Promise<void> {
    // Get relevant response template
    const template = this.responseTemplates.get(analysis.category) || '';

    // Generate response
    const response = await this.model.predict(
      `Draft a response to this email using the following template as a guide:
      ${template}

      Original Email:
      From: ${email.from}
      Subject: ${email.subject}
      Body: ${email.body}

      Analysis: ${JSON.stringify(analysis, null, 2)}

      Draft a professional and contextually appropriate response.`
    );

    // Create draft email
    await this.tools.execute(
      Action.GMAIL_CREATE_DRAFT,
      {
        to: email.from,
        subject: `Re: ${email.subject}`,
        body: response
      }
    );
  }

  private async organizeEmail(email: EmailTask, analysis: any): Promise<void> {
    // Apply labels based on analysis
    await this.tools.execute(
      Action.GMAIL_MODIFY_MESSAGE,
      {
        id: email.id,
        addLabelIds: [analysis.category],
        removeLabelIds: ['INBOX']
      }
    );
  }

  private async loadResponseTemplates(): Promise<void> {
    this.responseTemplates = new Map([
      ['meeting_request', 'Thank you for your meeting request. I have reviewed my schedule and...'],
      ['project_update', 'Thank you for the project update. I appreciate the detailed information...'],
      ['urgent_issue', 'I acknowledge receipt of your urgent message regarding...'],
      // Add more templates
    ]);
  }
}

// Example usage with Supabase Edge Function
serve(async (req) => {
  const agent = new GmailAssistantAgent({
    id: 'gmail-assistant',
    name: 'Email Assistant',
    description: 'Manages email inbox and creates tasks'
  });

  const { email } = await req.json();
  await agent.processNewEmail(email);

  return new Response(
    JSON.stringify({ status: 'processed' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

## Configuration

```typescript
// config/email-assistant-config.ts
export const emailAssistantConfig = {
  priority_keywords: {
    high: ['urgent', 'asap', 'emergency'],
    medium: ['important', 'needed', 'required'],
    low: ['fyi', 'update', 'newsletter']
  },
  email_categories: [
    'meeting_request',
    'project_update',
    'urgent_issue',
    'task_assignment',
    'general_inquiry'
  ],
  response_delay: {
    high: 1, // hours
    medium: 4,
    low: 24
  },
  auto_response_enabled: true,
  task_creation_rules: {
    create_for_categories: ['meeting_request', 'task_assignment'],
    always_create_for_senders: ['boss@company.com', 'client@important.com']
  }
};
```

## Deployment

1. **Set up Supabase Edge Function:**
```bash
supabase functions new gmail-assistant
supabase functions deploy gmail-assistant
```

2. **Configure Gmail Webhook:**
```bash
curl -X POST "https://www.googleapis.com/gmail/v1/users/me/watch" \
  -H "Authorization: Bearer $GMAIL_TOKEN" \
  -d '{
    "topicName": "projects/your-project/topics/new-email-notifications",
    "labelIds": ["INBOX"]
  }'
```

3. **Set up Pub/Sub subscription:**
```bash
gcloud pubsub subscriptions create gmail-notifications \
  --topic new-email-notifications \
  --push-endpoint="https://your-project.supabase.co/functions/v1/gmail-assistant"
```

## Monitoring

```typescript
interface EmailMetrics {
  processed_count: number;
  response_rate: number;
  average_response_time: number;
  category_distribution: Record<string, number>;
  task_creation_rate: number;
}

// Add to agent class
class GmailAssistantAgent {
  private metrics: EmailMetrics;

  async collectMetrics(): Promise<void> {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));

    // Get email statistics
    const stats = await this.tools.execute(
      Action.GMAIL_GET_STATISTICS,
      {
        startTime: startOfDay.toISOString(),
        endTime: new Date().toISOString()
      }
    );

    // Update metrics
    this.metrics = {
      processed_count: stats.processed,
      response_rate: stats.responses / stats.processed,
      average_response_time: stats.averageResponseTime,
      category_distribution: stats.categories,
      task_creation_rate: stats.tasksCreated / stats.processed
    };

    // Store metrics in Supabase
    await this.storeMetrics(this.metrics);
  }
}
```

## Best Practices

1. **Email Processing:**
   - Use sentiment analysis for priority detection
   - Maintain conversation context
   - Handle email threads appropriately
   - Respect email importance markers

2. **Response Generation:**
   - Use templates as guides, not rigid responses
   - Maintain professional tone
   - Include relevant context
   - Flag uncertain responses for review

3. **Task Management:**
   - Set appropriate due dates
   - Include full context in task descriptions
   - Link back to original emails
   - Update email status when tasks are completed

4. **Security:**
   - Handle sensitive information appropriately
   - Implement rate limiting
   - Log all automated actions
   - Regular token rotation

5. **Performance:**
   - Cache frequently used templates
   - Batch similar operations
   - Implement retry logic for API calls
   - Regular cleanup of old embeddings