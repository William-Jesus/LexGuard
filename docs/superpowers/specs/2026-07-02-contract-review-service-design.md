# contract-review-service — Design (Sprint 1 / MVP)

## Objetivo

Ferramenta interna para análise preliminar de contratos: o usuário envia um contrato novo e um modelo aprovado, escolhe o tipo de contrato, e recebe um relatório gerado por IA (resumo, dados principais, riscos, cláusulas ausentes, divergências e sugestões), exportável em PDF e DOCX.

A IA nunca aprova juridicamente um contrato, nunca declara que ele está correto, nunca reescreve o contrato original, e toda sugestão é sempre marcada como pendente de validação humana.

## Escopo desta versão

Apenas o fluxo descrito nos critérios de aceite da Sprint 1 (ver seção "Critérios de aceite"). Explicitamente fora de escopo: login, dashboard, workflow de aprovação, histórico persistente, banco vetorial, edição colaborativa, assinatura digital, integração jurídica externa, aprovação/reescrita automática do contrato.

## Localização do projeto

Novo projeto, isolado do repositório Flutter existente (`curso_flutter/projeto_perguntas`), criado em `/Users/williamjesus/Desktop/contract-review-service`.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- OpenAI API (modelo default `gpt-4o`, configurável via `OPENAI_MODEL`)
- `pdf-parse` — extração de texto de PDF com texto selecionável
- `mammoth` — extração de texto de DOCX
- `@react-pdf/renderer` — geração do relatório em PDF
- `docx` — geração do relatório em DOCX
- `zod` — validação de schema (upload e resposta da IA)
- `vitest` — testes

## Armazenamento

Totalmente efêmero, em memória, por request. Nenhum arquivo enviado ou resultado de análise é persistido em disco ou banco de dados. Isso é suficiente para o escopo da Sprint 1 (sem histórico completo) e reduz superfície de risco com dados sensíveis.

## Estrutura de arquivos

```
/app
  /page.tsx
  /api
    /analyze-contract/route.ts
    /export-report/route.ts
/components
  ContractUploadForm.tsx
  AnalysisResult.tsx
  RiskBadge.tsx
  SuggestionList.tsx
  HumanValidationChecklist.tsx
/lib
  extractTextFromPdf.ts
  extractTextFromDocx.ts
  openaiContractAnalysis.ts
  generateReport.ts
  validation.ts
/types
  contract.ts
```

## Fluxo de dados

1. **Upload** — `ContractUploadForm` monta `FormData` (nome do contrato, tipo, arquivo do contrato, arquivo do modelo aprovado, observações opcionais) e faz `POST /api/analyze-contract`.
2. **Validação** (`lib/validation.ts`) — extensão permitida (`.pdf`/`.docx`), tamanho máximo (`MAX_FILE_SIZE_MB`, default 10MB), campos obrigatórios presentes. Falha → HTTP 400 com mensagem amigável.
3. **Extração de texto** — `extractTextFromPdf` ou `extractTextFromDocx`, conforme extensão, aplicada ao contrato e ao modelo. Se o texto extraído vier vazio ou abaixo de um limiar mínimo de caracteres, a rota retorna HTTP 422 com a mensagem: "Não foi possível extrair o texto deste arquivo. Envie um PDF com texto selecionável ou um arquivo DOCX."
4. **Chamada à IA** (`lib/openaiContractAnalysis.ts`) — envia o prompt-base (ver seção "Prompt") junto com texto do contrato, texto do modelo, tipo de contrato e observações à OpenAI, solicitando `response_format: json_object`.
5. **Validação do retorno da IA** — o JSON recebido é validado contra um schema `zod` definido em `types/contract.ts`. Se não for compatível, a rota retorna HTTP 502 com mensagem "Não foi possível gerar a análise no momento. Tente novamente.".
6. **Resposta** — `{ analysis, meta: { contractName, contractType, analyzedAt } }`, sem persistir nada.
7. **Renderização** — `AnalysisResult` (com `RiskBadge`, `SuggestionList`, `HumanValidationChecklist`) exibe o resultado a partir do estado local do componente client.
8. **Exportação** — ao clicar em "Exportar PDF" ou "Exportar DOCX", o client reenvia o JSON de análise já obtido (não os arquivos originais) para `POST /api/export-report?format=pdf|docx`. `lib/generateReport.ts` monta o binário correspondente; a resposta usa `Content-Disposition: attachment`. O aviso obrigatório de validação humana é fixo no template do relatório e na tela de resultado, independente do texto retornado pela IA.

## Modelo de resposta da IA

Conforme especificado pelo usuário — ver `types/contract.ts` (schema `zod` espelhando este formato):

```json
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
  "criticalPoints": [
    { "title": "", "riskLevel": "baixo | medio | alto", "description": "", "recommendation": "" }
  ],
  "missingClauses": [
    { "clause": "", "whyItMatters": "", "suggestion": "" }
  ],
  "modelDivergences": [
    { "topic": "", "contractTextSummary": "", "modelTextSummary": "", "difference": "", "recommendation": "" }
  ],
  "suggestedAdjustments": [
    { "clause": "", "currentIssue": "", "suggestedText": "", "requiresHumanValidation": true }
  ],
  "humanValidationChecklist": [
    { "item": "", "status": "pending" }
  ],
  "mandatoryDisclaimer": "Esta análise foi gerada por IA e deve ser validada por um profissional jurídico antes de qualquer decisão ou uso formal."
}
```

## Prompt base

Conforme especificado pelo usuário: o assistente atua como revisor contratual, nunca declara aprovação jurídica ou correção do contrato, nunca substitui validação humana, toda sugestão é pendente de validação humana, considera os pontos de análise listados (partes, objeto, prazo, valor, pagamento, multa, rescisão, foro, confidencialidade, LGPD, propriedade intelectual, riscos trabalhistas, obrigações, cláusulas ausentes, divergências vs. modelo), e retorna exclusivamente JSON válido, sem markdown e sem texto fora do JSON.

## Erros e segurança

- Respostas de erro padronizadas: `{ error, code }`, com status HTTP apropriado (400 validação, 422 falha de extração, 502 falha da IA, 500 inesperado). A UI mapeia `code` para mensagem amigável.
- Logs (`console.log`) registram apenas metadados operacionais: tipo de contrato, nível de risco resultante, duração da análise, sucesso/falha. Nunca o texto do contrato, do modelo, nem o payload bruto da IA.
- Arquivos enviados são lidos apenas em memória (`ArrayBuffer`/`Buffer`) durante o request; nunca gravados em disco nem reenviados/sobrescritos.
- Limite de tamanho de arquivo e validação de extensão/MIME type aplicados antes de qualquer processamento.
- A IA nunca pode declarar aprovação jurídica: reforçado tanto no prompt quanto pelo disclaimer fixo (hardcoded) na UI e no relatório exportado, independente da resposta da IA.

## Testes

- `extractTextFromPdf` / `extractTextFromDocx`: fixtures cobrindo PDF com texto extraível, PDF sem texto (simulando escaneado), e DOCX válido; verificam o texto extraído e o caminho de erro.
- `validation.ts`: arquivo acima do limite de tamanho, extensão inválida, campos obrigatórios ausentes.
- `openaiContractAnalysis`: chamada à OpenAI mockada (sem bater na API real em teste), cobrindo parsing de resposta válida e rejeição de JSON fora do schema.
- `generateReport`: garante que o PDF e o DOCX gerados contêm o disclaimer obrigatório e as seções exigidas (resumo, risco geral, pontos críticos, cláusulas ausentes, divergências, sugestões, checklist).

## Critérios de aceite (Sprint 1)

- Projeto Next.js rodando localmente.
- Tela de upload funcional (nome, tipo, upload de contrato e modelo, observações opcionais).
- Extração de texto de PDF/DOCX funcionando, com erro amigável em caso de falha.
- Chamada à OpenAI funcionando e retornando análise estruturada e validada.
- Resultado exibido de forma organizada na tela.
- Exportação de relatório em PDF e DOCX.
- Contrato original nunca alterado.
- Toda análise exibe aviso de validação humana.
- Erros de arquivo inválido ou falha de extração tratados com mensagem clara.

## Fora de escopo (próxima sprint ou além)

Login complexo, dashboard avançado, workflow de aprovação, histórico persistente, banco vetorial, edição colaborativa, assinatura digital, integração com processos jurídicos, aprovação automática de contrato, reescrita automática do contrato original.
