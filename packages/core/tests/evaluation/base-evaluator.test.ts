import { ChatOpenAI } from '@langchain/openai';
import { BaseEvaluator } from '../../src/evaluation/base-evaluator';
import type { EvaluatorConfig } from '../../src/types/evaluation';

describe('BaseEvaluator', () => {
  let evaluator: BaseEvaluator;
  
  beforeEach(() => {
    const config: EvaluatorConfig = {
      model: new ChatOpenAI({
        modelName: 'gpt-3.5-turbo',
        temperature: 0,
      }),
      criteria: {
        accuracy: 0.9,
        relevance: 0.8,
        coherence: 0.7,
      },
    };
    
    evaluator = new BaseEvaluator(config);
  });

  it('should create an instance with valid config', () => {
    expect(evaluator).toBeInstanceOf(BaseEvaluator);
  });

  it('should evaluate output and return valid result', async () => {
    const result = await evaluator.evaluate({
      input: 'What is the capital of France?',
      output: 'The capital of France is Paris.',
    });

    expect(result).toHaveProperty('scores');
    expect(result).toHaveProperty('feedback');
    expect(result).toHaveProperty('metadata');
    expect(result).toHaveProperty('timestamp');

    expect(result.scores).toHaveProperty('accuracy');
    expect(result.scores.accuracy).toBeGreaterThanOrEqual(0);
    expect(result.scores.accuracy).toBeLessThanOrEqual(1);
  });

  it('should handle batch evaluation', async () => {
    const items = [
      {
        input: 'What is 2+2?',
        output: '4',
      },
      {
        input: 'What is the capital of France?',
        output: 'Paris',
      },
    ];

    const results = await evaluator.batchEvaluate(items);

    expect(results).toHaveLength(2);
    results.forEach(result => {
      expect(result).toHaveProperty('scores');
      expect(result).toHaveProperty('feedback');
    });
  });

  it('should handle evaluation with context', async () => {
    const result = await evaluator.evaluate({
      input: 'Review this code',
      output: 'The code looks good',
      context: {
        language: 'typescript',
        framework: 'react',
      },
    });

    expect(result).toHaveProperty('scores');
    expect(result.metadata).toHaveProperty('context');
  });

  it('should handle errors gracefully', async () => {
    await expect(
      evaluator.evaluate({
        input: null,
        output: undefined,
      })
    ).rejects.toThrow();
  });
});