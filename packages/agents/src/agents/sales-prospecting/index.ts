import { BaseAgent, type AgentTask, type TaskResult } from '@squad/core';
import { z } from 'zod';
import { VectorStore } from "@langchain/core/vectorstores";
import { ChatOpenAI } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { ProspectSchema, ProspectingConfigSchema, type ProspectingConfig } from './types';
import { BaseMessage } from "@langchain/core/messages";

const TaskInputSchema = z.object({
  query: z.string(),
  config: ProspectingConfigSchema.optional(),
  vectorStore: z.instanceof(VectorStore),
  outputProcessor: z.function()
    .args(z.array(ProspectSchema))
    .returns(z.promise(z.void()))
    .optional()
});

export class SalesProspectingAgent extends BaseAgent {
  name = 'sales-prospecting';
  description = 'Analyze content and identify potential sales prospects';
  version = '0.1.0';

  private config: ProspectingConfig;
  private llm: ChatOpenAI;

  constructor(config: ProspectingConfig) {
    super();
    this.config = ProspectingConfigSchema.parse(config);
    this.llm = new ChatOpenAI({
      modelName: "gpt-4-turbo-preview",
      temperature: 0.1
    });
  }

  async validateInput(input: unknown): Promise<boolean> {
    return TaskInputSchema.safeParse(input).success;
  }

  async processTask(task: { type: string; id: string; input?: unknown; metadata?: Record<string, unknown> }) {
    try {
      const { query, config, vectorStore, outputProcessor } = TaskInputSchema.parse(task.input);
      
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Search relevant documents
      const results = await vectorStore.similaritySearch(query, 5);

      // Extract and score prospects
      const prospects = await this.extractProspects(results);
      
      // Filter and enrich prospects
      const enrichedProspects = await this.enrichProspects(prospects);

      // Score and sort prospects
      const scoredProspects = this.scoreProspects(enrichedProspects);

      // Process output if handler provided
      if (outputProcessor) {
        await outputProcessor(scoredProspects);
      }

      return {
        status: 'success' as const,
        data: scoredProspects,
        metadata: {
          totalProspects: scoredProspects.length,
          averageScore: scoredProspects.reduce((acc, p) => acc + (p.score || 0), 0) / scoredProspects.length,
          query,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'failure' as const,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  private async extractProspects(documents: Document[]): Promise<Array<z.infer<typeof ProspectSchema>>> {
    const systemPrompt = `You are a sales prospecting assistant. Analyze the text and extract potential prospects.
      Format the response as a JSON array of prospects with these fields:
      - name (string, required)
      - title (string, optional)
      - company (string, optional)
      - linkedin_url (string, optional)
      - email (string, optional)`;

    const userPrompt = `
      Focus on individuals who match these criteria:
      - Industries: ${this.config.searchCriteria.industries?.join(', ')}
      - Roles: ${this.config.searchCriteria.roles?.join(', ')}
      - Company Size: ${this.config.searchCriteria.companySize?.join(', ')}
      - Location: ${this.config.searchCriteria.location?.join(', ')}

      Text to analyze:
      ${documents.map(doc => doc.pageContent).join('\n\n')}`;

    const response = await this.llm.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    // Handle different response content types
    let responseText = '';
    if (typeof response.content === 'string') {
      responseText = response.content;
    } else if (Array.isArray(response.content)) {
      // Handle array of message content
      const firstContent = response.content[0];
      if (typeof firstContent === 'string') {
        responseText = firstContent;
      } else if ('type' in firstContent && firstContent.type === 'text') {
        responseText = firstContent.text;
      }
    }

    if (!responseText) {
      throw new Error('Failed to get valid response from LLM');
    }

    const prospects = JSON.parse(responseText);
    return prospects.map((p: unknown) => ProspectSchema.parse(p));
  }

  private async enrichProspects(prospects: Array<z.infer<typeof ProspectSchema>>): Promise<Array<z.infer<typeof ProspectSchema>>> {
    // TODO: Implement enrichment with LinkedIn/Clearbit/Apollo if needed
    return prospects;
  }

  private scoreProspects(prospects: Array<z.infer<typeof ProspectSchema>>): Array<z.infer<typeof ProspectSchema>> {
    return prospects.map(prospect => {
      const { weights } = this.config.scoring;
      let score = 0;

      if (prospect.title && this.config.searchCriteria.roles?.some(
        role => prospect.title?.toLowerCase().includes(role.toLowerCase())
      )) {
        score += weights.roleMatch;
      }

      return {
        ...prospect,
        score: Math.min(1, score)
      };
    }).filter(p => (p.score || 0) >= this.config.scoring.minScore);
  }
} 