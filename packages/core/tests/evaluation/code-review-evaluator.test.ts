import { ChatOpenAI } from '@langchain/openai';
import { CodeReviewEvaluator } from '../../src/evaluation/code-review-evaluator';
import type { EvaluatorConfig } from '../../src/types/evaluation';

describe('CodeReviewEvaluator', () => {
  let evaluator: CodeReviewEvaluator;
  
  beforeEach(() => {
    const config: EvaluatorConfig = {
      model: new ChatOpenAI({
        modelName: 'gpt-4',
        temperature: 0,
      }),
      criteria: {
        accuracy: 0.9,
        securityAwareness: 0.9,
        codeQuality: 0.85,
      },
    };
    
    evaluator = new CodeReviewEvaluator(config);
  });

  it('should evaluate code review output', async () => {
    const result = await evaluator.evaluate({
      input: `
        function processUserData(data) {
          return data.map(item => ({
            ...item,
            password: btoa(item.password)
          }));
        }
      `,
      output: `
        Security Issue: Using btoa for password encoding is not secure.
        Recommendation: Use proper password hashing with bcrypt or similar.
        Code Style: Consider adding type annotations.
        Performance: Map operation looks good.
      `,
      context: {
        language: 'typescript',
        securityCritical: true,
      },
    });

    expect(result.scores).toHaveProperty('securityAwareness');
    expect(result.scores).toHaveProperty('codeQuality');
    expect(result.scores.securityAwareness).toBeGreaterThan(0.8);
  });

  it('should consider security context', async () => {
    const securityResult = await evaluator.evaluate({
      input: `
        app.get('/api/users', (req, res) => {
          res.json(users);
        });
      `,
      output: `
        Security Issue: No authentication check.
        Add middleware to verify user authentication.
      `,
      context: {
        securityCritical: true,
      },
    });

    const normalResult = await evaluator.evaluate({
      input: `
        function formatName(name) {
          return name.trim().toLowerCase();
        }
      `,
      output: `
        Add input validation for name parameter.
        Consider handling empty string case.
      `,
      context: {
        securityCritical: false,
      },
    });

    expect(securityResult.scores.securityAwareness)
      .toBeGreaterThan(normalResult.scores.securityAwareness);
  });

  it('should evaluate code quality aspects', async () => {
    const result = await evaluator.evaluate({
      input: `
        function calculateTotal(items) {
          let t = 0;
          for(let i = 0; i < items.length; i++) {
            t = t + items[i].p * items[i].q;
          }
          return t;
        }
      `,
      output: `
        Code Quality Issues:
        1. Poor variable naming (t, p, q)
        2. Use reduce instead of for loop
        3. Missing type annotations
        4. No input validation
        
        Suggested Refactor:
        function calculateTotal(items: Item[]): number {
          return items.reduce(
            (total, item) => total + item.price * item.quantity,
            0
          );
        }
      `,
      context: {
        language: 'typescript',
      },
    });

    expect(result.scores.codeQuality).toBeDefined();
    expect(result.scores.codeQuality).toBeGreaterThan(0.7);
    expect(result.feedback).toContain('variable naming');
  });
});