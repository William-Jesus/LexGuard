import OpenAI from 'openai'
import { ContractAnalysisSchema, ContractAnalysis } from '@/types/contract'

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

const SYSTEM_PROMPT = `Você é um revisor contratual especializado. Sua função é analisar contratos juridicamente e identificar riscos, cláusulas ausentes, divergências em relação ao modelo aprovado e sugerir ajustes.

Regras absolutas:
- Nunca declare que um contrato está aprovado juridicamente ou que está correto
- Nunca substitua a validação por um profissional jurídico humano
- Toda sugestão deve ter requiresHumanValidation: true
- Retorne EXCLUSIVAMENTE JSON válido, sem markdown, sem texto fora do JSON
- O campo mandatoryDisclaimer deve ser exatamente: "Esta análise foi gerada por IA e deve ser validada por um profissional jurídico antes de qualquer decisão ou uso formal."

Analise os seguintes pontos: partes envolvidas, objeto do contrato, prazo, valor e pagamento, multas e penalidades, rescisão, foro e jurisdição, confidencialidade, LGPD/privacidade, propriedade intelectual, riscos trabalhistas, obrigações principais, cláusulas ausentes relevantes, divergências em relação ao modelo aprovado.`

export async function analyzeContract(params: {
  contractText: string
  modelText: string
  contractType: string
  contractName: string
  observations?: string
}): Promise<ContractAnalysis> {
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o'
  const start = Date.now()

  const userPrompt = `Tipo de contrato: ${params.contractType}
Nome: ${params.contractName}
${params.observations ? `Observações adicionais: ${params.observations}` : ''}

=== CONTRATO A REVISAR ===
${params.contractText}

=== MODELO APROVADO ===
${params.modelText}

Retorne a análise no seguinte formato JSON:
{
  "executiveSummary": "",
  "contractType": "",
  "mainData": {
    "parties": [],
    "object": "",
    "term": "",
    "value": "",
    "paymentTerms": "",
    "penalties": "",
    "termination": "",
    "jurisdiction": "",
    "mainObligations": []
  },
  "generalRisk": "baixo | medio | alto",
  "criticalPoints": [{ "title": "", "riskLevel": "baixo | medio | alto", "description": "", "recommendation": "" }],
  "missingClauses": [{ "clause": "", "whyItMatters": "", "suggestion": "" }],
  "modelDivergences": [{ "topic": "", "contractTextSummary": "", "modelTextSummary": "", "difference": "", "recommendation": "" }],
  "suggestedAdjustments": [{ "clause": "", "currentIssue": "", "suggestedText": "", "requiresHumanValidation": true }],
  "humanValidationChecklist": [{ "item": "", "status": "pending" }],
  "mandatoryDisclaimer": "Esta análise foi gerada por IA e deve ser validada por um profissional jurídico antes de qualquer decisão ou uso formal."
}`

  const response = await getOpenAI().chat.completions.create({
    model,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  })

  const raw = response.choices[0]?.message?.content ?? ''
  const parsed = JSON.parse(raw)
  const validated = ContractAnalysisSchema.safeParse(parsed)

  const duration = Date.now() - start

  if (!validated.success) {
    console.log(`[LexGuard] analysis failed schema validation | type=${params.contractType} | duration=${duration}ms`)
    throw new Error('INVALID_AI_RESPONSE')
  }

  console.log(`[LexGuard] analysis ok | type=${params.contractType} | risk=${validated.data.generalRisk} | duration=${duration}ms`)
  return validated.data
}
