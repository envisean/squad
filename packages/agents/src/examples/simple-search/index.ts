import { BaseAgent, type AgentTask, type TaskResult } from '@squad/core';
import { z } from 'zod';
import { VectorStore } from "@langchain/core/vectorstores";
import { ChatOpenAI } from "@langchain/openai";

// Simple input schema
const TaskInputSchema = z.object({
  query: z.string(),
  vectorStore: z.instanceof(VectorStore)
});

export class SimpleSearchAgent extends BaseAgent {
  name = 'simple-search';
  description = 'Simple document search and summarization';
  version = '0.1.0';

  private llm: ChatOpenAI;

  constructor() {
    super();
    this.llm = new ChatOpenAI({
      modelName: "gpt-4-turbo-preview",
      temperature: 0.1
    });
  }

  async validateInput(input: unknown): Promise<boolean> {
    return TaskInputSchema.safeParse(input).success;
  }

  async processTask(task: AgentTask): Promise<TaskResult> {
    try {
      const { query, vectorStore } = TaskInputSchema.parse(task.input);
      
      // Search for relevant documents
      const results = await vectorStore.similaritySearch(query, 3);

      // Create a simple prompt for the LLM
      const prompt = `Based on the following documents, answer this query: "${query}"

Documents:
${results.map((doc, i) => `[${i + 1}] ${doc.pageContent}`).join('\n\n')}

Provide a concise answer based only on the information in these documents.`;

      // Get response from LLM
      const response = await this.llm.invoke([
        { role: 'user', content: prompt }
      ]);

      return {
        status: 'success',
        data: {
          answer: response.content,
          sourceDocs: results.map(doc => ({
            content: doc.pageContent,
            metadata: doc.metadata
          }))
        },
        metadata: {
          docsFound: results.length,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        status: 'failure',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    }
  }
} 