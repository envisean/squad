# @squad/core

Core package for the Squad AI agent platform, providing fundamental types, evaluation frameworks, and utilities.

## Evaluation Framework

The evaluation framework provides tools to assess AI agent performance using both LangChain's capabilities and custom business metrics.

### Basic Usage

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { 
  BaseEvaluator,
  CodeReviewEvaluator,
  BusinessMetricsEvaluator,
  EvaluationChainBuilder,
} from '@squad/core';

// Create a basic evaluator
const baseEvaluator = new BaseEvaluator({
  model: new ChatOpenAI(),
  criteria: {
    accuracy: 0.9,
    relevance: 0.8,
    coherence: 0.7,
  },
});

// Create a specialized code review evaluator
const codeReviewEvaluator = new CodeReviewEvaluator({
  model: new ChatOpenAI(),
  criteria: {
    accuracy: 0.95,
    securityAwareness: 0.9,
    codeQuality: 0.85,
  },
});

// Create a business metrics evaluator
const businessEvaluator = new BusinessMetricsEvaluator(
  {
    model: new ChatOpenAI(),
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

// Compose evaluators into a chain
const evaluationChain = new EvaluationChainBuilder()
  .addEvaluator(baseEvaluator)
  .addEvaluator(codeReviewEvaluator)
  .addEvaluator(businessEvaluator)
  .build();

// Use the evaluation chain
const result = await evaluationChain.evaluate({
  input: {
    code: 'function example() { ... }',
    context: { language: 'typescript' },
  },
  output: {
    review: 'This code needs improvement...',
    suggestions: ['...'],
  },
  context: {
    startTime: Date.now(),
    securityCritical: true,
  },
});

console.log('Evaluation Results:', result);
```

### Custom Evaluators

You can create custom evaluators by extending the BaseEvaluator:

```typescript
import { BaseEvaluator, EvaluatorConfig } from '@squad/core';

class CustomEvaluator extends BaseEvaluator {
  constructor(config: EvaluatorConfig) {
    super(config);
  }

  async evaluate(params: {
    input: unknown;
    output: unknown;
    context?: Record<string, unknown>;
  }) {
    const baseResult = await super.evaluate(params);
    
    // Add custom evaluation logic
    const customScores = {
      customMetric1: 0.9,
      customMetric2: 0.8,
    };

    return {
      ...baseResult,
      scores: {
        ...baseResult.scores,
        custom: customScores,
      },
    };
  }
}
```

### Integration with LangChain

The evaluation framework integrates seamlessly with LangChain's tools:

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { BaseEvaluator } from '@squad/core';

// Use LangChain's models and prompts
const evaluator = new BaseEvaluator({
  model: new ChatOpenAI({
    temperature: 0.1,
    modelName: 'gpt-4',
  }),
  criteria: {
    accuracy: 0.9,
    relevance: 0.8,
  },
  prompts: {
    evaluation: PromptTemplate.fromTemplate(`
      Evaluate the following output...
      {output}
      Based on these criteria...
      {criteria}
    `),
  },
});
```

## Types

The package provides TypeScript types for all components:

```typescript
import type {
  EvaluationCriteria,
  EvaluationResult,
  Evaluator,
  EvaluatorConfig,
  BusinessMetricsChain,
} from '@squad/core';

// Use types in your code
const criteria: EvaluationCriteria = {
  accuracy: 0.9,
  businessValue: {
    costEfficiency: 0.8,
    timeEfficiency: 0.7,
    qualityScore: 0.9,
  },
};
```

## Testing

To run the tests:

```bash
pnpm test
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request