import { ChatOpenAI } from '@langchain/openai'
import { PromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { StructuredOutputParser } from '@langchain/core/output_parsers'
import { z } from 'zod'
import { BaseAgent } from '../../../../core/src/base-agent'
import { AgentTask, TaskResult, AgentConfig, AgentStatus, AgentState } from '../../../../core/src/types'

import {
  DocumentSummarizationInput,
  DocumentSummarizationOutput,
  DocumentSummarizationInputSchema,
  DocumentSummarizationOutputSchema,
} from './types'

const BRIEF_SUMMARY_TEMPLATE = `Create a brief summary of the following document:

{content}

Focus on the main points and key takeaways. Keep the summary concise and clear.

Length: {maxLength} characters (if specified)
Format: {format}

Summary:`

const DETAILED_SUMMARY_TEMPLATE = `Create a detailed summary of the following document, preserving its structure:

{content}

Analyze the document's structure and content to create:
1. A high-level overview
2. Detailed section summaries
3. Key points and insights

Original structure should be {preserveStructure} preserved.
Format: {format}

Summary:`

const COMPREHENSIVE_SUMMARY_TEMPLATE = `Create a comprehensive analysis and summary of the following document:

{content}

Provide:
1. A thorough overview of the main content
2. Detailed analysis of each major section
3. Discussion of key themes and insights
4. Important details and supporting evidence
5. Connections between different parts

Original structure should be {preserveStructure} preserved.
Format: {format}

Summary:`

export class DocumentSummarizationAgent extends BaseAgent {
  private model: ChatOpenAI
  private briefTemplate: PromptTemplate
  private detailedTemplate: PromptTemplate
  private comprehensiveTemplate: PromptTemplate

  name = 'document-summarization'
  version = '1.0.0'
  description = 'Generates summaries of documents with various levels of detail'

  constructor(config: { openAIApiKey: string }) {
    const agentConfig: AgentConfig = {
      type: 'job',
      name: 'document-summarization',
      version: '1.0.0'
    };
    const initialState: AgentState = {
      status: AgentStatus.IDLE
    };
    super(agentConfig, initialState);
    
    this.model = new ChatOpenAI({
      openAIApiKey: config.openAIApiKey,
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.2
    });

    this.briefTemplate = PromptTemplate.fromTemplate(BRIEF_SUMMARY_TEMPLATE)
    this.detailedTemplate = PromptTemplate.fromTemplate(DETAILED_SUMMARY_TEMPLATE)
    this.comprehensiveTemplate = PromptTemplate.fromTemplate(COMPREHENSIVE_SUMMARY_TEMPLATE)
  }

  async validateInput(input: unknown): Promise<boolean> {
    try {
      DocumentSummarizationInputSchema.parse(input)
      return true
    } catch (error) {
      return false
    }
  }

  async processTask(task: AgentTask): Promise<TaskResult> {
    const startTime = Date.now()

    try {
      this.updateState({ status: AgentStatus.RUNNING })
      // Validate and parse input
      const input = DocumentSummarizationInputSchema.parse(task.input)

      // Create chain for generating summary
      const template = this.getTemplateForType(input.options.summaryType)
      const chain = RunnableSequence.from([template, this.model, new StringOutputParser()])

      // Generate summary
      const summary = await chain.invoke({
        content: input.document.content,
        maxLength: input.options.maxLength || 'not specified',
        format: input.options.format || 'text',
        preserveStructure: input.options.preserveStructure ? 'to be' : 'not to be',
      })

      // Calculate metadata
      const endTime = Date.now()
      const processingTime = endTime - startTime
      const originalLength = input.document.content.length
      const summaryLength = summary.length
      const compressionRatio = originalLength / summaryLength

      // Format output based on summary type
      const output = await this.formatOutput(summary, input.options.summaryType, {
        originalLength,
        summaryLength,
        compressionRatio,
        processingTime,
      })

      // Track metrics
      await this.reportMetrics({
        status: 'success',
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration: processingTime,
        metadata: {
          documentLength: originalLength,
          summaryLength,
          compressionRatio,
        }
      })

      this.updateState({ status: AgentStatus.IDLE })
      return {
        taskId: task.id,
        status: 'success',
        output: DocumentSummarizationOutputSchema.parse(output),
        metadata: {
          processingTime,
          compressionRatio,
        }
      }
    } catch (error) {
      this.updateState({ status: AgentStatus.ERROR })
      // Report error metrics
      await this.reportMetrics({
        status: 'failure',
        startTime: new Date(startTime),
        endTime: new Date(),
        error: error instanceof Error ? error.message : String(error)
      })
      return {
        taskId: task.id,
        status: 'failure',
        output: null,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private getTemplateForType(
    type: DocumentSummarizationInput['options']['summaryType']
  ): PromptTemplate {
    switch (type) {
      case 'brief':
        return this.briefTemplate
      case 'detailed':
        return this.detailedTemplate
      case 'comprehensive':
        return this.comprehensiveTemplate
      default:
        throw new Error(`Unsupported summary type: ${type}`)
    }
  }

  private async formatOutput(
    summary: string,
    type: DocumentSummarizationInput['options']['summaryType'],
    metadata: DocumentSummarizationOutput['summary']['metadata']
  ): Promise<DocumentSummarizationOutput> {
    // Extract key points using a separate LLM call
    const keyPointsChain = RunnableSequence.from([
      PromptTemplate.fromTemplate(
        'Extract the key points from this summary as a numbered list:\n\n{summary}'
      ),
      this.model,
      new StringOutputParser(),
    ])

    const keyPointsRaw = await keyPointsChain.invoke({ summary })
    const keyPoints = keyPointsRaw
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^\d+\.\s*/, '').trim())

    if (type === 'brief') {
      return {
        summary: {
          brief: summary,
          keyPoints,
          metadata,
        },
      }
    }

    // For detailed and comprehensive summaries, parse the structure
    const structuredSummary = await this.parseStructuredSummary(summary)

    return {
      summary: {
        brief: structuredSummary.overview,
        detailed: {
          overview: structuredSummary.overview,
          sections: structuredSummary.sections,
        },
        keyPoints,
        metadata,
      },
    }
  }

  private async parseStructuredSummary(summary: string) {
    const parser = StructuredOutputParser.fromZodSchema(
      z.object({
        overview: z.string().describe('A high-level summary of the entire document'),
        sections: z.array(
          z.object({
            title: z.string().describe('The section title'),
            content: z.string().describe('The section content'),
            subsections: z
              .array(
                z.object({
                  title: z.string().describe('The subsection title'),
                  content: z.string().describe('The subsection content'),
                })
              )
              .optional()
              .describe('Optional array of subsections'),
          })
        ),
      })
    )

    const formatInstructions = parser.getFormatInstructions()

    const prompt = new PromptTemplate({
      template: `Parse the following summary into a structured format.
{format_instructions}

Summary to parse:
{summary}`,
      inputVariables: ['summary'],
      partialVariables: { format_instructions: formatInstructions },
    })

    const chain = RunnableSequence.from([prompt, this.model, new StringOutputParser()])

    try {
      const response = await chain.invoke({ summary })
      return parser.parse(response)
    } catch (error) {
      console.error('Failed to parse structured response:', error)
      throw error
    }
  }
}
