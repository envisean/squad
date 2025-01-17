import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from 'langchain/output_parsers';
import type { BaseLanguageModel } from 'langchain/base_language';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
  EvaluationCriteria,
  EvaluationResult,
  Evaluator,
  EvaluatorConfig,
} from '../types/evaluation';

const DEFAULT_EVALUATION_TEMPLATE = `You are an expert evaluator tasked with assessing the quality of AI agent outputs.

Context:
{context}

Input:
{input}

Output to evaluate:
{output}

Evaluation criteria:
{criteria}

Please evaluate the output based on the given criteria. For each criterion, provide a score between 0 and 1,
where 1 represents perfect alignment with the criterion and 0 represents complete failure to meet the criterion.

Provide your evaluation in the following format:
{format_instructions}

Additional guidelines:
- Be objective and consistent in your scoring
- Provide specific examples to justify your scores
- Consider both technical accuracy and practical usefulness
- If a criterion is not applicable, you may omit it from the scoring`;

export class BaseEvaluator implements Evaluator {
  protected model: BaseLanguageModel | BaseChatModel;
  protected criteria: EvaluationCriteria;
  protected prompt: ChatPromptTemplate;
  protected outputParser: StructuredOutputParser;

  constructor(config: EvaluatorConfig) {
    this.model = config.model;
    this.criteria = config.criteria;
    
    // Set up the output parser for structured evaluation results
    this.outputParser = StructuredOutputParser.fromNamesAndDescriptions({
      scores: "An object containing numerical scores (0-1) for each evaluation criterion",
      feedback: "Detailed feedback explaining the evaluation scores",
      metadata: "Additional context or notes about the evaluation",
    });

    // Create the evaluation prompt
    this.prompt = ChatPromptTemplate.fromTemplate(
      config.prompts?.evaluation?.template || DEFAULT_EVALUATION_TEMPLATE
    );
  }

  async evaluate(params: {
    input: unknown;
    output: unknown;
    context?: Record<string, unknown>;
  }): Promise<EvaluationResult> {
    const { input, output, context = {} } = params;

    try {
      // Format the prompt with input data
      const formattedPrompt = await this.prompt.format({
        input: JSON.stringify(input),
        output: JSON.stringify(output),
        context: JSON.stringify(context),
        criteria: JSON.stringify(this.criteria),
        format_instructions: this.outputParser.getFormatInstructions(),
      });

      // Get evaluation from the model
      const response = await this.model.invoke(formattedPrompt);
      
      // Parse the response
      const parsed = await this.outputParser.parse(response);

      return {
        scores: parsed.scores,
        feedback: parsed.feedback,
        metadata: parsed.metadata,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Evaluation failed:', error);
      throw new Error(`Failed to evaluate output: ${error.message}`);
    }
  }

  async batchEvaluate(items: Array<{
    input: unknown;
    output: unknown;
    context?: Record<string, unknown>;
  }>): Promise<EvaluationResult[]> {
    return Promise.all(items.map(item => this.evaluate(item)));
  }

  protected validateScores(scores: Record<string, number>): void {
    for (const [criterion, score] of Object.entries(scores)) {
      if (typeof score !== 'number' || score < 0 || score > 1) {
        throw new Error(
          `Invalid score for criterion '${criterion}': ${score}. Scores must be numbers between 0 and 1.`
        );
      }
    }
  }
}