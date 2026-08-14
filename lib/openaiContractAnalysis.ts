import OpenAI from 'openai'
import { ContractAnalysisSchema, ContractAnalysis } from '@/types/contract'

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

const SYSTEM_PROMPT = `Você é um revisor contratual especializado em direito do trabalho e contratos empresariais brasileiros, atuando EXCLUSIVAMENTE na defesa dos interesses da empresa CONTRATANTE/EMPREGADORA.

Sua missão é identificar tudo que fragiliza a empresa: erros jurídicos, cláusulas ausentes, imprecisões que um advogado trabalhista do outro lado poderia explorar em ação judicial.

PERSPECTIVA OBRIGATÓRIA: analise sempre do ponto de vista da empresa empregadora/contratante. Riscos = riscos para a EMPRESA, não para o funcionário ou prestador.

Legislação de referência principal: CLT, LGPD (Lei 13.709/2018), Código Civil. Para contratos em corretoras/consultorias de seguros: normas SUSEP e ANVEP.

Checklist obrigatório de análise (verifique cada item):
1. Qualificação completa das partes — endereço, CPF/CNPJ, RG, estado civil (viabiliza notificações válidas por AR em caso de abandono de emprego)
2. Prazo e prorrogação — para contrato de experiência: máximo 90 dias em até 2 períodos (Art. 445 CLT). Prorrogação além desse prazo converte automaticamente em contrato por prazo indeterminado
3. Função e atribuições detalhadas — vago = passivo. Descreva as tarefas reais para evitar desvio de função
4. Remuneração, comissões e variáveis — se houver comissão: especificar base de cálculo, incidência de DSR, estorno em cancelamento
5. Banco de horas — se usar compensação: exige Acordo Individual escrito (máx. 6 meses, Art. 59 CLT) ou Acordo Coletivo
6. LGPD e confidencialidade — obrigatório quando a empresa lida com dados pessoais de clientes (seguros, saúde, financeiro)
7. Cláusula de atualização cadastral e AR — sem ela, notificação de abandono de emprego pode ser invalidada judicialmente
8. Cláusula de não-concorrência e não-aliciamento — quando aplicável ao setor/cargo
9. Foro e jurisdição — sempre o município da empresa
10. Propriedade intelectual — produções durante o contrato pertencem à empresa

Quando a base de contratos da empresa estiver disponível:
- Use os padrões e cláusulas aprovados como referência direta
- Aponte explicitamente o que o contrato analisado tem de diferente dos padrões da empresa
- Identifique cláusulas presentes nos contratos aprovados que estão ausentes no contrato analisado

Regras absolutas:
- Nunca declare que um contrato está aprovado juridicamente ou que está correto
- Nunca substitua a validação por um profissional jurídico humano
- Toda sugestão deve ter requiresHumanValidation: true
- Retorne EXCLUSIVAMENTE JSON válido, sem markdown, sem texto fora do JSON
- O campo mandatoryDisclaimer deve ser exatamente: "Esta análise foi gerada por IA e deve ser validada por um profissional jurídico antes de qualquer decisão ou uso formal."
- Seja específico: cite artigos de lei, mencione os valores/datas/nomes do contrato analisado, não seja genérico`

export async function analyzeContract(params: {
  contractText: string
  modelText?: string
  kbContext?: string
  contractType: string
  contractName: string
  observations?: string
}): Promise<ContractAnalysis> {
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o'
  const start = Date.now()

  const hasKb = !!params.kbContext
  const hasModel = !!params.modelText

  const referenceSection = params.modelText
    ? `=== MODELO APROVADO (use como referência principal) ===\n${params.modelText}`
    : params.kbContext
      ? `=== PADRÕES DE CONTRATOS APROVADOS DA EMPRESA (trechos relevantes da base de conhecimento) ===
Use esses padrões como referência: compare o contrato analisado com eles e aponte divergências no campo "modelDivergences".
${params.kbContext}`
      : '=== NENHUMA BASE DE REFERÊNCIA DISPONÍVEL — analise apenas com base na legislação vigente ==='

  const perspectiveNote = `LEMBRE-SE: analise protegendo os interesses da empresa ${params.contractType.includes('Trabalhista') || params.contractType.includes('PJ') ? 'empregadora/contratante' : 'contratante'}. Identifique o que a expõe a risco legal ou financeiro.`

  const userPrompt = `Tipo de contrato: ${params.contractType}
Nome: ${params.contractName}
${params.observations ? `Observações do revisor: ${params.observations}` : ''}
${perspectiveNote}
Base de referência disponível: ${hasModel ? 'modelo aprovado' : hasKb ? `base da empresa (${params.kbContext?.split('\n').filter(l => l.startsWith('[')).length ?? 0} trechos)` : 'nenhuma'}

REGRAS DE COMPLETUDE — OBRIGATÓRIAS:
- Liste TODOS os problemas encontrados. NÃO limite o número de itens em nenhuma lista.
- Se encontrar 6 pontos críticos, liste os 6. Se encontrar 8 cláusulas ausentes, liste as 8.
- Para CADA criticalPoint identificado, inclua o ajuste correspondente em suggestedAdjustments com o texto sugerido concreto.
- Para CADA modelDivergence identificada, inclua também em suggestedAdjustments o texto corrigido.
- Nunca deixe suggestedText vazio — sempre forneça o texto exato a ser inserido ou substituído no contrato.
- Para erros de prazo/data: calcule e indique as datas corretas explicitamente.

=== CONTRATO A REVISAR ===
${params.contractText}

${referenceSection}

Retorne a análise no seguinte formato JSON:
{
  "executiveSummary": "resumo executivo direto ao ponto, do ponto de vista da empresa: principais riscos identificados e urgência de correção. Cite os problemas mais graves pelo nome.",
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
  "criticalPoints": [{ "title": "nome curto do problema", "riskLevel": "baixo | medio | alto", "description": "descreva o risco para a empresa com artigo de lei quando aplicável, citando valores/datas reais do contrato", "recommendation": "ação concreta e específica que a empresa deve tomar agora" }],
  "missingClauses": [{ "clause": "nome da cláusula ausente", "whyItMatters": "por que a ausência expõe a empresa a risco legal ou financeiro", "suggestion": "texto completo da cláusula sugerida para incluir no contrato" }],
  "modelDivergences": [{ "topic": "", "contractTextSummary": "o que o contrato diz atualmente", "modelTextSummary": "o que o padrão da empresa exige / o que a lei determina", "difference": "qual é a divergência e o impacto para a empresa", "recommendation": "como corrigir" }],
  "suggestedAdjustments": [{ "clause": "nome da cláusula a ajustar", "currentIssue": "problema atual descrito de forma objetiva", "suggestedText": "TEXTO COMPLETO e pronto para substituir no contrato — nunca deixar em branco", "requiresHumanValidation": true }],
  "humanValidationChecklist": [{ "item": "ação específica que o jurídico deve validar", "status": "pending" }],
  "mandatoryDisclaimer": "Esta análise foi gerada por IA e deve ser validada por um profissional jurídico antes de qualquer decisão ou uso formal."
}`

  const response = await getOpenAI().chat.completions.create(
    {
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    },
    { timeout: 60000 }
  )

  const raw = response.choices[0]?.message?.content ?? ''
  if (!raw) throw new Error('AI response content is empty')

  const parsed = JSON.parse(raw)
  const validated = ContractAnalysisSchema.safeParse(parsed)

  const duration = Date.now() - start

  if (!validated.success) {
    console.log(`[LexGuard] analysis failed schema validation | type=${params.contractType} | duration=${duration}ms | issues=${JSON.stringify(validated.error.issues)}`)
    throw new Error(`INVALID_AI_RESPONSE: ${validated.error.issues.map(i => i.message).join(', ')}`)
  }

  console.log(`[LexGuard] analysis ok | type=${params.contractType} | risk=${validated.data.generalRisk} | kb=${hasKb} | model=${hasModel} | duration=${duration}ms`)
  return validated.data
}
