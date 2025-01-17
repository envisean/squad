import { ChatOpenAI } from '@langchain/openai';
import { 
  BaseEvaluator,
  CodeReviewEvaluator,
  BusinessMetricsEvaluator,
  EvaluationChainBuilder,
} from '../../src/evaluation';
import type { EvaluatorConfig } from '../../src/types/evaluation';

describe('EvaluationChain', () => {
  const baseConfig: EvaluatorConfig = {
    model: new ChatOpenAI({
      modelName: 'gpt-3.5-turbo',
      temperature: 0,
    }),
    criteria: {
      accuracy: 0.9,
      relevance: 0.8,
    },
  };

  it('should compose multiple evaluators', async () => {
    const chain = new EvaluationChainBuilder()
      .addEvaluator(new BaseEvaluator(baseConfig))
      .addEvaluator(new CodeReviewEvaluator({
        ...baseConfig,
        criteria: {
          ...baseConfig.criteria,
          securityAwareness: 0.9,
        },
      }))
      .addEvaluator(new BusinessMetricsEvaluator(
        {
          ...baseConfig,
          criteria: {
            businessValue: {
              costEfficiency: 0.8,
              timeEfficiency: 0.7,
              qualityScore: 0.9,
            },
          },
        },
        {
          costPerToken: 0.0001,
          timeLimit: 5000,
          qualityThreshold: 0.8,
        }
      ))
      .build();

    const result = await chain.evaluate({
      input: 'function example() { console.log("test"); }',
      output: 'Add return type and remove console.log',
      context: {
        startTime: Date.now() - 1000,
        endTime: Date.now(),
      },
    });

    expect(result.scores).toHaveProperty('accuracy');
    expect(result.scores).toHaveProperty('securityAwareness');
    expect(result.scores).toHaveProperty('businessValue');
    expect(result.feedback).toBeTruthy();
  });

  it('should handle empty chain', () => {
    expect(() => {
      new EvaluationChainBuilder().build();
    }).toThrow('No evaluators added to the chain');
  });

  it('should combine scores correctly', async () => {
    const evaluator1 = new BaseEvaluator({
      ...baseConfig,
      criteria: { metric1: 0.5 },
    });

    const evaluator2 = new BaseEvaluator({
      ...baseConfig,
      criteria: { metric1: 0.7 },
    });

    const chain = new EvaluationChainBuilder()
      .addEvaluator(evaluator1)
      .addEvaluator(evaluator2)
      .build();

    const result = await chain.evaluate({
      input: 'test',
      output: 'test result',
    });

    // Average of 0.5 and 0.7
    expect(result.scores.metric1).toBeCloseTo(0.6);
  });

  it('should preserve object-type scores', async () => {
    const businessEvaluator = new BusinessMetricsEvaluator(
      {
        ...baseConfig,
        criteria: {
          businessValue: {
            costEfficiency: 0.8,
            timeEfficiency: 0.7,
            qualityScore: 0.9,
          },
        },
      },
      {
        costPerToken: 0.0001,
        timeLimit: 5000,
        qualityThreshold: 0.8,
      }
    );

    const chain = new EvaluationChainBuilder()
      .addEvaluator(businessEvaluator)
      .build();

    const result = await chain.evaluate({
      input: 'test',
      output: 'test result',
      context: {
        startTime: Date.now() - 1000,
        endTime: Date.now(),
      },
    });

    expect(result.scores.businessValue).toEqual({
      costEfficiency: expect.any(Number),
      timeEfficiency: expect.any(Number),
      qualityScore: expect.any(Number),
    });
  });
});