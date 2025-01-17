import { z } from 'zod';
import type { BaseLanguageModel } from 'langchain/base_language';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BasePromptTemplate } from '@langchain/core/prompts';

export const EvaluationCriteriaSchema = z.object({
  // LangChain standard criteria
  accuracy: z.number().min(0).max(1).optional(),
  relevance: z.number().min(0).max(1).optional(),
  coherence: z.number().min(0).max(1).optional(),
  conciseness: z.number().min(0).max(1).optional(),
  harmlessness: z.number().min(0).max(1).optional(),

  // Business metrics
  businessValue: z.object({
    costEfficiency: z.number().min(0).max(1),
    timeEfficiency: z.number().min(0).max(1),
    qualityScore: z.number().min(0).max(1),
  }).optional(),

  // Domain-specific metrics
  domainAccuracy: z.object({
    technicalPrecision: z.number().min(0).max(1),
    industryCompliance: z.number().min(0).max(1),
    contextRelevance: z.number().min(0).max(1),
  }).optional(),

  // Custom criteria
  custom: z.record(z.number().min(0).max(1)).optional(),
});

export type EvaluationCriteria = z.infer<typeof EvaluationCriteriaSchema>;

export interface EvaluationResult {
  scores: EvaluationCriteria;
  feedback: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

export interface EvaluationMetrics {
  taskId: string;
  agentId: string;
  evaluationId: string;
  criteria: EvaluationCriteria;
  result: EvaluationResult;
  raw?: Record<string, unknown>;
}

export interface EvaluatorConfig {
  model: BaseLanguageModel | BaseChatModel;
  criteria: EvaluationCriteria;
  prompts?: {
    evaluation?: BasePromptTemplate;
    feedback?: BasePromptTemplate;
  };
  reference?: {
    examples?: Array<{
      input: unknown;
      output: unknown;
      score: EvaluationCriteria;
    }>;
    guidelines?: string;
  };
}

export interface Evaluator {
  evaluate(params: {
    input: unknown;
    output: unknown;
    context?: Record<string, unknown>;
  }): Promise<EvaluationResult>;
  
  batchEvaluate(items: Array<{
    input: unknown;
    output: unknown;
    context?: Record<string, unknown>;
  }>): Promise<EvaluationResult[]>;
}

// Evaluation chain types
export interface EvaluationChain {
  criteria: EvaluationCriteria;
  evaluate(input: unknown, output: unknown): Promise<EvaluationResult>;
}

export interface BusinessMetricsChain extends EvaluationChain {
  calculateCost(input: unknown, output: unknown): Promise<number>;
  measureTime(startTime: number, endTime: number): number;
  assessQuality(output: unknown): Promise<number>;
}

export interface ComplianceChain extends EvaluationChain {
  checkCompliance(output: unknown): Promise<{
    compliant: boolean;
    violations: string[];
    score: number;
  }>;
}