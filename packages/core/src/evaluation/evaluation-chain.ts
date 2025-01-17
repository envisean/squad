import type { 
  Evaluator,
  EvaluationResult,
  EvaluationChain,
  EvaluationCriteria,
} from '../types/evaluation';

export class CompositeEvaluator implements Evaluator {
  private evaluators: Evaluator[];

  constructor(evaluators: Evaluator[]) {
    this.evaluators = evaluators;
  }

  async evaluate(params: {
    input: unknown;
    output: unknown;
    context?: Record<string, unknown>;
  }): Promise<EvaluationResult> {
    // Run all evaluators in parallel
    const results = await Promise.all(
      this.evaluators.map(evaluator => evaluator.evaluate(params))
    );

    // Combine scores and feedback
    return this.combineResults(results);
  }

  async batchEvaluate(items: Array<{
    input: unknown;
    output: unknown;
    context?: Record<string, unknown>;
  }>): Promise<EvaluationResult[]> {
    return Promise.all(items.map(item => this.evaluate(item)));
  }

  private combineResults(results: EvaluationResult[]): EvaluationResult {
    const combinedScores: EvaluationCriteria = {};
    const feedbacks: string[] = [];
    const metadata: Record<string, unknown> = {};

    // Combine scores by averaging
    results.forEach(result => {
      Object.entries(result.scores).forEach(([criterion, score]) => {
        if (typeof score === 'number') {
          if (!combinedScores[criterion]) {
            combinedScores[criterion] = score;
          } else {
            combinedScores[criterion] = (combinedScores[criterion] as number + score) / 2;
          }
        } else if (typeof score === 'object') {
          combinedScores[criterion] = score;
        }
      });

      feedbacks.push(result.feedback);
      Object.assign(metadata, result.metadata);
    });

    return {
      scores: combinedScores,
      feedback: feedbacks.join('\n\n'),
      metadata: {
        ...metadata,
        evaluatorCount: results.length,
      },
      timestamp: new Date(),
    };
  }
}

export class EvaluationChainBuilder {
  private evaluators: Evaluator[] = [];

  addEvaluator(evaluator: Evaluator): this {
    this.evaluators.push(evaluator);
    return this;
  }

  addChain(chain: EvaluationChain): this {
    this.evaluators.push({
      evaluate: async (params) => ({
        scores: await chain.evaluate(params.input, params.output),
        feedback: '',
        metadata: {},
        timestamp: new Date(),
      }),
      batchEvaluate: async (items) => {
        return Promise.all(
          items.map(async item => ({
            scores: await chain.evaluate(item.input, item.output),
            feedback: '',
            metadata: {},
            timestamp: new Date(),
          }))
        );
      },
    });
    return this;
  }

  build(): Evaluator {
    if (this.evaluators.length === 0) {
      throw new Error('No evaluators added to the chain');
    }
    return new CompositeEvaluator(this.evaluators);
  }
}