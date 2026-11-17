import { z } from 'zod';
import { DocumentType, RuleOperator, RuleSeverity, SchemeCode } from '../enums.js';

export const ruleConditionSchema = z.object({
  id: z.string().min(1),
  field: z.string().min(1),
  operator: z.nativeEnum(RuleOperator),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.union([z.string(), z.number()])),
  ]),
  errorMessage: z.string().min(1),
  severity: z.nativeEnum(RuleSeverity).default(RuleSeverity.BLOCKING),
});

export type RuleCondition = z.infer<typeof ruleConditionSchema>;

export const ruleGroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  logicalOperator: z.enum(['AND', 'OR']).default('AND'),
  conditions: z.array(ruleConditionSchema),
});

export type RuleGroup = z.infer<typeof ruleGroupSchema>;

export const scoringCriterionSchema = z.object({
  criterion: z.string().min(1),
  maxWeight: z.number().positive(),
  scoringField: z.string().min(1),
  description: z.string().optional(),
});

export type ScoringCriterion = z.infer<typeof scoringCriterionSchema>;

export const schemeRuleSetSchema = z.object({
  schemeCode: z.nativeEnum(SchemeCode),
  academicYear: z.string().min(4),
  incomeCeiling: z.number().nonnegative(),
  minAge: z.number().int().nonnegative().optional(),
  maxAge: z.number().int().nonnegative().optional(),
  minMarksPercentage: z.number().min(0).max(100).optional(),
  requiredDocumentTypes: z.array(z.nativeEnum(DocumentType)),
  eligibilityGroups: z.array(ruleGroupSchema),
  scoringCriteria: z.array(scoringCriterionSchema).optional(),
});

export type SchemeRuleSet = z.infer<typeof schemeRuleSetSchema>;

export const ruleEvaluationResultSchema = z.object({
  conditionId: z.string(),
  field: z.string(),
  expectedValue: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.union([z.string(), z.number()])),
  ]),
  actualValue: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.undefined(),
  ]),
  passed: z.boolean(),
  severity: z.nativeEnum(RuleSeverity),
  message: z.string(),
});

export type RuleEvaluationResult = z.infer<typeof ruleEvaluationResultSchema>;

export const overallEvaluationSummarySchema = z.object({
  applicationId: z.string().min(1),
  schemeCode: z.nativeEnum(SchemeCode),
  schemeVersionId: z.string().min(1),
  isEligible: z.boolean(),
  blockingFailuresCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
  results: z.array(ruleEvaluationResultSchema),
  evaluatedAt: z.string().datetime(),
});

export type OverallEvaluationSummary = z.infer<typeof overallEvaluationSummarySchema>;
