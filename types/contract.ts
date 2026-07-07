import { z } from 'zod'

const RiskLevelSchema = z.enum(['baixo', 'medio', 'alto'])

export const CriticalPointSchema = z.object({
  title: z.string(),
  riskLevel: RiskLevelSchema,
  description: z.string(),
  recommendation: z.string(),
})

export const MissingClauseSchema = z.object({
  clause: z.string(),
  whyItMatters: z.string(),
  suggestion: z.string(),
})

export const ModelDivergenceSchema = z.object({
  topic: z.string(),
  contractTextSummary: z.string(),
  modelTextSummary: z.string(),
  difference: z.string(),
  recommendation: z.string(),
})

export const SuggestedAdjustmentSchema = z.object({
  clause: z.string(),
  currentIssue: z.string(),
  suggestedText: z.string(),
  requiresHumanValidation: z.literal(true),
})

export const HumanValidationItemSchema = z.object({
  item: z.string(),
  status: z.literal('pending'),
})

export const ContractAnalysisSchema = z.object({
  executiveSummary: z.string(),
  contractType: z.string(),
  mainData: z.object({
    parties: z.array(z.string()),
    object: z.string(),
    term: z.string(),
    value: z.string(),
    paymentTerms: z.string(),
    penalties: z.string(),
    termination: z.string(),
    jurisdiction: z.string(),
    mainObligations: z.array(z.string()),
  }),
  generalRisk: RiskLevelSchema,
  criticalPoints: z.array(CriticalPointSchema),
  missingClauses: z.array(MissingClauseSchema),
  modelDivergences: z.array(ModelDivergenceSchema),
  suggestedAdjustments: z.array(SuggestedAdjustmentSchema),
  humanValidationChecklist: z.array(HumanValidationItemSchema),
  mandatoryDisclaimer: z.string(),
})

export type ContractAnalysis = z.infer<typeof ContractAnalysisSchema>
export type RiskLevel = z.infer<typeof RiskLevelSchema>
export type CriticalPoint = z.infer<typeof CriticalPointSchema>
export type MissingClause = z.infer<typeof MissingClauseSchema>
export type ModelDivergence = z.infer<typeof ModelDivergenceSchema>
export type SuggestedAdjustment = z.infer<typeof SuggestedAdjustmentSchema>
export type HumanValidationItem = z.infer<typeof HumanValidationItemSchema>

export const CONTRACT_TYPES = [
  'Contrato PJ',
  'Contrato Trabalhista',
  'Prestação de Serviços',
  'NDA',
  'Aditivo',
  'Outro',
] as const

export const MANDATORY_DISCLAIMER =
  'Esta análise foi gerada por IA e deve ser validada por um profissional jurídico antes de qualquer decisão ou uso formal.'

export const EXTRACTION_ERROR_MESSAGE =
  'Não foi possível extrair o texto deste arquivo. Envie um PDF com texto selecionável ou um arquivo DOCX.'

export const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB ?? '10', 10)
export const ALLOWED_EXTENSIONS = ['.pdf', '.docx'] as const
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const
