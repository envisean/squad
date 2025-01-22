import { BaseAgent, type AgentTask, type TaskResult } from '@squad/core';
import { BaseLearningSystem } from '@squad/core/learning';
import { GmailLoader } from 'langchain/document_loaders/web/gmail';
import { OpenAI } from 'langchain/llms/openai';
import { PromptTemplate } from 'langchain/prompts';
import { LLMChain } from 'langchain/chains';
import {
  Email,
  EmailProcessingResult,
  EmailProcessingResultSchema
} from './types';

export interface EmailAgentConfig {
  gmailCredentials: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  };
  openaiApiKey: string;
  supabaseUrl: string;
  supabaseKey: string;
  agentEmail: string;
  ownerEmail: string;
}

export class EmailAgent extends BaseAgent {
  private gmail: GmailLoader;
  private llm: OpenAI;
  private learningSystem: BaseLearningSystem;
  private config: EmailAgentConfig;

  constructor(config: EmailAgentConfig) {
    super();
    this.config = config;
    
    // Initialize Gmail loader
    this.gmail = new GmailLoader({
      email: config.ownerEmail,
      clientId: config.gmailCredentials.clientId,
      clientSecret: config.gmailCredentials.clientSecret,
      refreshToken: config.gmailCredentials.refreshToken
    });

    // Initialize LLM
    this.llm = new OpenAI({
      openAIApiKey: config.openaiApiKey,
      modelName: 'gpt-4',
      temperature: 0.3
    });

    // Initialize learning system
    this.learningSystem = new BaseLearningSystem({
      supabaseUrl: config.supabaseUrl,
      supabaseKey: config.supabaseKey,
      openaiApiKey: config.openaiApiKey,
      agentId: this.getId(),
      environment: 'production'
    });
  }

  async initialize(): Promise<void> {
    await this.learningSystem.initialize();
    // Set up Gmail watch (for notifications)
    await this.gmail.watch();
  }

  async processEmail(email: Email): Promise<EmailProcessingResult> {
    try {
      // Create experience context
      const experience = {
        id: email.id,
        type: 'email_processing',
        timestamp: new Date(),
        content: email,
        actions: [],
        outcomes: [],
        metadata: {},
        context: {
          agent_id: this.getId(),
          environment: 'production'
        }
      };

      // Process the email
      const result = await this.analyzeEmail(email);
      experience.actions.push({
        type: 'analysis',
        result,
        timestamp: new Date()
      });

      // Extract action items
      const actionItems = await this.extractActionItems(email);
      experience.actions.push({
        type: 'action_extraction',
        result: actionItems,
        timestamp: new Date()
      });

      // Generate response if needed
      let suggestedResponse: string | undefined;
      if (this.shouldRespond(result)) {
        suggestedResponse = await this.generateResponse(email, result);
        experience.actions.push({
          type: 'response_generation',
          result: suggestedResponse,
          timestamp: new Date()
        });
      }

      // Compile processing result
      const processingResult: EmailProcessingResult = {
        email_id: email.id,
        classification: result,
        action_items: actionItems,
        suggested_response: suggestedResponse,
        next_steps: this.determineNextSteps(result, actionItems),
        metadata: {
          processed_by: this.getId(),
          processed_at: new Date()
        }
      };

      // Store experience
      await this.learningSystem.processExperience(experience);

      return EmailProcessingResultSchema.parse(processingResult);

    } catch (error) {
      console.error('Error processing email:', error);
      throw error;
    }
  }

  private async analyzeEmail(email: Email) {
    const prompt = PromptTemplate.fromTemplate(`
      Analyze the following email and provide a detailed classification:

      Subject: {subject}
      From: {from}
      Body: {body}

      Provide the following in JSON format:
      1. Priority (urgent/high/medium/low)
      2. Categories (array of relevant categories)
      3. Confidence score (0-1)
      4. Whether it requires human attention
      5. Sentiment (positive/neutral/negative)
      6. Additional metadata

      Consider:
      - Sender importance
      - Content urgency
      - Required actions
      - Time sensitivity
      - Previous interactions (if available)
    `);

    const chain = new LLMChain({
      llm: this.llm,
      prompt
    });

    const result = await chain.call({
      subject: email.subject,
      from: email.from,
      body: email.body.text
    });

    return JSON.parse(result.text);
  }

  private async extractActionItems(email: Email) {
    const prompt = PromptTemplate.fromTemplate(`
      Extract action items from the following email:

      Subject: {subject}
      Body: {body}

      Provide action items in JSON format with:
      - Type (task/meeting/follow_up/delegation)
      - Description
      - Due date (if mentioned)
      - Assignee (if specified)
      - Priority
      - Status (always 'pending' for new items)
    `);

    const chain = new LLMChain({
      llm: this.llm,
      prompt
    });

    const result = await chain.call({
      subject: email.subject,
      body: email.body.text
    });

    return JSON.parse(result.text);
  }

  private shouldRespond(classification: any): boolean {
    return (
      classification.requires_human === false &&
      (classification.categories.includes('meeting') ||
       classification.categories.includes('follow_up'))
    );
  }

  private async generateResponse(email: Email, classification: any) {
    // Query similar past responses
    const similarExperiences = await this.learningSystem.queryExperiences(
      email.subject + ' ' + email.body.text
    );

    const prompt = PromptTemplate.fromTemplate(`
      Generate a response to the following email:

      Subject: {subject}
      From: {from}
      Body: {body}

      Classification: {classification}

      Similar past responses: {similar_responses}

      Generate a professional and contextually appropriate response.
      Consider:
      - Email tone and formality
      - Required actions or confirmations
      - Previous interactions
      - Time sensitivity
    `);

    const chain = new LLMChain({
      llm: this.llm,
      prompt
    });

    const result = await chain.call({
      subject: email.subject,
      from: email.from,
      body: email.body.text,
      classification: JSON.stringify(classification),
      similar_responses: JSON.stringify(similarExperiences)
    });

    return result.text;
  }

  private determineNextSteps(
    classification: any,
    actionItems: any[]
  ): string[] {
    const steps: string[] = [];

    if (classification.requires_human) {
      steps.push('Escalate to human for review');
    }

    if (actionItems.length > 0) {
      steps.push('Create tasks in task management system');
    }

    if (classification.categories.includes('meeting')) {
      steps.push('Schedule meeting using calendar agent');
    }

    if (classification.categories.includes('delegation')) {
      steps.push('Forward to appropriate team member');
    }

    return steps;
  }
}