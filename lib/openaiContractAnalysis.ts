import OpenAI from 'openai'
import { AnalysisResultSchema, type AnalysisResult, type ContractType } from '@/types/contract'

export class AiAnalysisError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiAnalysisError'
  }
}

export const CONTRACT_REVIEW_SYSTEM_PROMPT = `Você é um assistente de revisão contratual. Sua função é analisar contratos com base em um modelo previamente aprovado, identificar riscos, cláusulas ausentes, divergências relevantes e sugerir ajustes de redação.

Você não deve declarar que o contrato está juridicamente aprovado.
Você não deve afirmar que o contrato está correto.
Você não deve substituir a validação de um profissional jurídico.
Toda sugestão deve ser apresentada como pendente de validação humana.

Analise o contrato considerando:

- tipo de contrato;
- partes envolvidas;
- objeto;
- prazo;
- valor;
- forma de pagamento;
- multa;
- rescisão;
- foro;
- confidencialidade;
- LGPD;
- propriedade intelectual;
- riscos trabalhistas;
- obrigações das partes;
- cláusulas ausentes;
- divergências em relação ao modelo aprovado.

Compare o contrato novo com o modelo aprovado enviado pelo usuário.

Retorne exclusivamente um JSON válido no formato solicitado.
Não retorne markdown.
Não inclua texto fora do JSON.`

export interface AnalyzeContractInput {
  contractText: string
  modelText: string
  contractType: ContractType
  observations: string
}

function buildUserPrompt(input: AnalyzeContractInput): string {
  return `Tipo de contrato: ${input.contractType}

Observações do usuário: ${input.observations || 'Nenhuma observação adicional.'}

=== TEXTO DO CONTRATO A SER ANALISADO ===
${input.contractText}

=== TEXTO DO MODELO APROVADO ===
${input.modelText}`
}

export async function analyzeContract(
  input: AnalyzeContractInput,
  client: Pick<OpenAI, 'chat'> = new OpenAI()
): Promise<AnalysisResult> {
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o'

  const response = await client.chat.completions.create({
    model,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: CONTRACT_REVIEW_SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(input) },
    ],
  })

  const rawContent = (response as any).choices?.[0]?.message?.content

  if (!rawContent) {
    throw new AiAnalysisError('A IA não retornou conteúdo.')
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(rawContent)
  } catch {
    throw new AiAnalysisError('A IA retornou um conteúdo que não é um JSON válido.')
  }

  const validated = AnalysisResultSchema.safeParse(parsedJson)
  if (!validated.success) {
    throw new AiAnalysisError('A IA retornou um JSON fora do formato esperado.')
  }

  return validated.data
}
