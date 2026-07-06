# contract-review-service (LexGuard)

Ferramenta interna para análise preliminar de contratos com IA. Recebe um contrato e um modelo aprovado, e devolve um relatório estruturado (resumo, riscos, cláusulas ausentes, divergências e sugestões), exportável em PDF e DOCX.

A IA nunca aprova juridicamente um contrato, nunca declara que ele está correto e nunca reescreve o contrato original. Toda sugestão é apresentada como pendente de validação humana.

## Instalação

```bash
npm install
```

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```
OPENAI_API_KEY=       # obrigatória
OPENAI_MODEL=gpt-4o   # opcional, default gpt-4o
MAX_FILE_SIZE_MB=10   # opcional, default 10
```

## Rodando localmente

```bash
npm run dev
```

Acesse http://localhost:3000.

## Testes

```bash
npm test
```

## Exemplo de uso

1. Preencha o nome do contrato (ex: "NDA Fornecedor X").
2. Escolha o tipo de contrato.
3. Envie o contrato a ser analisado (PDF com texto selecionável ou DOCX).
4. Envie o modelo aprovado de referência (PDF ou DOCX).
5. Opcionalmente, adicione observações.
6. Clique em "Analisar contrato" e aguarde o resultado.
7. Exporte o relatório em PDF ou DOCX, se desejar.

## Entregue nesta Sprint 1

- Upload de contrato + modelo aprovado com validação de extensão e tamanho.
- Extração de texto de PDF (com texto selecionável) e DOCX, com mensagem de erro clara quando não é possível extrair.
- Chamada à OpenAI retornando análise estruturada e validada contra um schema.
- Tela de resultado com resumo, dados principais, risco geral, pontos críticos, cláusulas ausentes, divergências, sugestões e checklist de validação humana.
- Exportação do relatório em PDF e DOCX, sempre com o aviso obrigatório de validação humana.
- Processamento 100% em memória — nada é persistido em disco ou banco de dados.
- Logs limitados a metadados operacionais (tipo de contrato, risco, duração), sem expor texto de contratos.

## Fora de escopo desta Sprint (próximas)

Login, dashboard avançado, workflow de aprovação, histórico persistente, banco vetorial, edição colaborativa, assinatura digital, integração com processos jurídicos, aprovação/reescrita automática do contrato.
