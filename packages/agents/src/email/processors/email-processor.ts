import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { LLMChain } from 'langchain/chains';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { 
  Email, 
  EmailClassification,
  EmailProcessingResult,
  ActionItem 
} from '../types';

export interface EmailProcessorConfig {
  openaiApiKey: string;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
}

export class EmailProcessor {
  private llm: ChatOpenAI;
  private classificationChain: LLMChain;
  private actionItemChain: LLMChain;

  constructor(config: EmailProcessorConfig) {
    this.llm = new ChatOpenAI({
      openAIApiKey: config.openaiApiKey,
      modelName: config.modelName || 'gpt-4',
      temperature: config.temperature || 0.3,
      maxTokens: config.maxTokens || 1000
    });

    // Initialize classification chain
    this.classificationChain = new LLMChain({
      llm: this.llm,
      prompt: PromptTemplate.fromTemplate(`
        Analyze the following email and classify it:

        Subject: {subject}
        From: {from}
        Body: {body}

        Provide a JSON response with:
        1. priority: "urgent" | "high" | "medium" | "low"
        2. categories: array of relevant categories (action_required, meeting, fyi, delegation, follow_up, personal, newsletter)
        3. confidence: number between 0 and 1
        4. requires_human: boolean
        5. sentiment: "positive" | "neutral" | "negative"
        6. metadata: any additional useful information

        Consider:
        - Sender importance and relationship
        - Content urgency and importance
        - Required actions or decisions
        - Time sensitivity
        - Previous context (if available)
      `)
    });

    // Initialize action item chain
    this.actionItemChain = new LLMChain({
      llm: this.llm,
      prompt: PromptTemplate.fromTemplate(`
        Extract action items from the following email:

        Subject: {subject}
        From: {from}
        Body: {body}

        Provide a JSON array of action items, where each item has:
        1. type: "task" | "meeting" | "follow_up" | "delegation"
        2. description: clear description of what needs to be done
        3. due_date: date if mentioned (ISO format) or null
        4. assignee: who should do it (if specified) or null
        5. priority: "high" | "medium" | "low"
        6. status: always "pending" for new items
        7. metadata: any additional context

        Focus on:
        - Clear, actionable items
        - Explicit and implicit tasks
        - Deadlines and time constraints
        - Dependencies and prerequisites
        - Required participants or stakeholders
      `)
    });
  }

  async processEmail(email: Email): Promise<EmailProcessingResult> {
    try {
      // Classify email
      const classification = await this.classifyEmail(email);

      // Extract action items
      const actionItems = await this.extractActionItems(email);

      // Generate next steps
      const nextSteps = this.determineNextSteps(classification, actionItems);

      // Compile result
      return {
        email_id: email.id,
        classification,
        action_items: actionItems,
        next_steps,
        metadata: {
          processed_at: new Date().toISOString(),
          processor_version: '1.0.0'
        }
      };

    } catch (error) {
      console.error('Error processing email:', error);
      throw error;
    }
  }

  private async classifyEmail(email: Email): Promise<EmailClassification> {
    const { text: classificationText } = await this.classificationChain.call({
      subject: email.subject,
      from: email.from,
      body: email.body.text
    });

    return JSON.parse(classificationText);
  }

  private async extractActionItems(email: Email): Promise<ActionItem[]> {
    const { text: actionItemsText } = await this.actionItemChain.call({
      subject: email.subject,
      from: email.from,
      body: email.body.text
    });

    return JSON.parse(actionItemsText);
  }

  private determineNextSteps(
    classification: EmailClassification,
    actionItems: ActionItem[]
  ): string[] {
    const steps: string[] = [];

    // Add steps based on classification
    if (classification.requires_human) {
      steps.push('Requires human review and response');
    }

    if (classification.priority === 'urgent' || classification.priority === 'high') {
      steps.push('Prioritize for immediate attention');
    }

    // Add steps for action items
    if (actionItems.length > 0) {
      steps.push(`Create ${actionItems.length} tasks in task management system`);
      
      const meetingItems = actionItems.filter(item => item.type === 'meeting');
      if (meetingItems.length > 0) {
        steps.push('Schedule required meetings');
      }

      const delegationItems = actionItems.filter(item => item.type === 'delegation');
      if (delegationItems.length > 0) {
        steps.push('Delegate tasks to team members');
      }
    }

    // Add category-specific steps
    if (classification.categories.includes('follow_up')) {
      steps.push('Set follow-up reminder');
    }

    return steps;
  }

  static async loadEmails(config: {
    email: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    query?: string;
  }): Promise<Email[]> {
    // Create OAuth2 client
    const oauth2Client = new OAuth2Client(
      config.clientId,
      config.clientSecret,
      'http://localhost:3000/oauth2callback'
    );

    // Set credentials
    oauth2Client.setCredentials({
      refresh_token: config.refreshToken
    });

    // Create Gmail client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // List messages
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: config.query || 'newer_than:1d'
    });

    if (!response.data.messages) {
      return [];
    }

    // Get full message details
    const emails: Email[] = [];
    for (const message of response.data.messages.slice(0, 3)) { // Limit to 3 for testing
      const details = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
        format: 'full'
      });

      const headers = details.data.payload?.headers;
      if (!headers) continue;

      const getHeader = (name: string) => 
        headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      const email: Email = {
        id: details.data.id!,
        threadId: details.data.threadId!,
        from: getHeader('from'),
        to: getHeader('to').split(',').map(e => e.trim()),
        subject: getHeader('subject'),
        body: {
          text: details.data.snippet || '',
          html: details.data.payload?.body?.data 
            ? Buffer.from(details.data.payload.body.data, 'base64').toString('utf8')
            : ''
        },
        timestamp: new Date(parseInt(details.data.internalDate!))
      };

      emails.push(email);
    }

    return emails;
  }
}