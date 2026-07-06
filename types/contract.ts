import { z } from 'zod'

export const RiskLevelSchema = z.enum(['baixo', 'medio', 'alto'])
export type RiskLevel = z.infer<typeof RiskLevelSchema>

export const MainDataSchema = z.object({
  parties: z.array(z.string()),
  object: z.string(),
  term: z.string(),
  value: z.string(),
  paymentTerms: z.string(),
  penalties: z.string(),
  termination: z.string(),
  jurisdiction: z.string(),
  mainObligations: z.array(z.string()),
})
export type MainData = z.infer<typeof MainDataSchema>

export const CriticalPointSchema = z.object({
  title: z.string(),
  riskLevel: RiskLevelSchema,
  description: z.string(),
  recommendation: z.string(),
})
export type CriticalPoint = z.infer<typeof CriticalPointSchema>

export const MissingClauseSchema = z.object({
  clause: z.string(),
  whyItMatters: z.string(),
  suggestion: z.string(),
})
export type MissingClause = z.infer<typeof MissingClauseSchema>

export const ModelDivergenceSchema = z.object({
  topic: z.string(),
  contractTextSummary: z.string(),
  modelTextSummary: z.string(),
  difference: z.string(),
  recommendation: z.string(),
})
export type ModelDivergence = z.infer<typeof ModelDivergenceSchema>

export const SuggestedAdjustmentSchema = z.object({
  clause: z.string(),
  currentIssue: z.string(),
  suggestedText: z.string(),
  requiresHumanValidation: z.literal(true),
})
export type SuggestedAdjustment = z.infer<typeof SuggestedAdjustmentSchema>

export const ChecklistItemSchema = z.object({
  item: z.string(),
  status: z.literal('pending'),
})
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>

export const MANDATORY_DISCLAIMER =
  'Esta análise foi gerada por IA e deve ser validada por um profissional jurídico antes de qualquer decisão ou uso formal.'

export const AnalysisResultSchema = z.object({
  executiveSummary: z.string(),
  contractType: z.string(),
  mainData: MainDataSchema,
  generalRisk: RiskLevelSchema,
  criticalPoints: z.array(CriticalPointSchema),
  missingClauses: z.array(MissingClauseSchema),
  modelDivergences: z.array(ModelDivergenceSchema),
  suggestedAdjustments: z.array(SuggestedAdjustmentSchema),
  humanValidationChecklist: z.array(ChecklistItemSchema),
  mandatoryDisclaimer: z.string(),
})
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>

export const CONTRACT_TYPES = [
  'Contrato PJ',
  'Contrato Trabalhista',
  'Prestação de Serviços',
  'NDA',
  'Aditivo',
  'Outro',
] as const
export type ContractType = (typeof CONTRACT_TYPES)[number]

export interface AnalysisMeta {
  contractName: string
  contractType: ContractType
  analyzedAt: string
}
