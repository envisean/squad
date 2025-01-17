import { BaseEvaluator } from './base-evaluator';
import type { EvaluationResult, EvaluatorConfig } from '../types/evaluation';

const CODE_REVIEW_TEMPLATE = `You are an expert code reviewer tasked with evaluating the quality of an AI agent's code review.

Context about the codebase:
{context}

Code changes to review:
{input}

AI agent's code review:
{output}

Evaluation criteria:
{criteria}

Please evaluate the code review based on the given criteria, considering:
- Technical accuracy of the feedback
- Completeness of the review
- Actionability of suggestions
- Security considerations
- Best practices adherence
- Code style and standards

Provide your evaluation in the following format:
{format_instructions}

Additional guidelines:
- Consider both the correctness and helpfulness of the review
- Evaluate whether security concerns were properly identified
- Assess if the review provides clear, actionable feedback
- Consider if the review maintains a constructive tone`;

interface CodeReviewContext {
  language: string;
  framework?: string;
  securityCritical?: boolean;
  styleguide?: string;
}

export class CodeReviewEvaluator extends BaseEvaluator {
  constructor(config: EvaluatorConfig) {
    super({
      ...config,
      prompts: {
        ...config.prompts,
        evaluation: {
          template: CODE_REVIEW_TEMPLATE,
        },
      },
    });
  }

  async evaluate(params: {
    input: unknown;
    output: unknown;
    context?: CodeReviewContext;
  }): Promise<EvaluationResult> {
    // Add specialized code review metrics
    const result = await super.evaluate(params);

    // Enhance the evaluation with code-specific metrics
    const enhancedScores = {
      ...result.scores,
      codeQuality: await this.evaluateCodeQuality(params),
      securityAwareness: await this.evaluateSecurityAwareness(params),
    };

    return {
      ...result,
      scores: enhancedScores,
    };
  }

  private async evaluateCodeQuality(params: {
    input: unknown;
    output: unknown;
    context?: CodeReviewContext;
  }): Promise<number> {
    // Implement code quality evaluation logic
    // This could include:
    // - Static analysis results
    // - Best practices adherence
    // - Code style consistency
    return 0.9; // Placeholder
  }

  private async evaluateSecurityAwareness(params: {
    input: unknown;
    output: unknown;
    context?: CodeReviewContext;
  }): Promise<number> {
    // Implement security awareness evaluation logic
    // This could include:
    // - Detection of security vulnerabilities
    // - Secure coding practices
    // - Authentication/authorization concerns
    return 0.85; // Placeholder
  }
}