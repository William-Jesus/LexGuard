# Contract Review Service MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Sprint 1 MVP of contract-review-service: a Next.js app where a user uploads a contract and an approved model, picks a contract type, and gets back an AI-generated structured analysis (summary, risks, missing clauses, divergences, suggestions) exportable as PDF and DOCX — with no legal approval claims and no persistence of uploaded content.

**Architecture:** Single Next.js App Router project. One page (`app/page.tsx`) renders an upload form and, after a successful call to `POST /api/analyze-contract`, the analysis result with export buttons that call `POST /api/export-report`. Everything is processed in memory per-request; nothing is written to disk or a database. `lib/` holds pure, independently testable functions (extraction, validation, AI call, report generation); `components/` holds presentational/client UI; `types/contract.ts` is the single source of truth for the AI response shape (a `zod` schema + inferred types) used by both API routes and the UI.

**Tech Stack:** Next.js (App Router) + TypeScript + Tailwind CSS, `openai` SDK, `pdf-parse`, `mammoth`, `@react-pdf/renderer`, `docx`, `zod`, `vitest` + `@testing-library/react`.

## Global Constraints

- Project root: `/Users/williamjesus/Desktop/contract-review-service` (separate from any other repo on this machine; already git-initialized with remote `origin` = `https://github.com/William-Jesus/LexGuard.git`, branch `main`).
- Allowed upload extensions: exactly `.pdf` and `.docx`. Allowed MIME types: `application/pdf` and `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
- Max upload size: `MAX_FILE_SIZE_MB` env var, default `10` (megabytes).
- OpenAI model: `OPENAI_MODEL` env var, default `gpt-4o`.
- Contract types (exact list, in this order): `Contrato PJ`, `Contrato Trabalhista`, `Prestação de Serviços`, `NDA`, `Aditivo`, `Outro`.
- Mandatory disclaimer text (verbatim, must appear in the UI and in every exported report regardless of what the AI returns): `Esta análise foi gerada por IA e deve ser validada por um profissional jurídico antes de qualquer decisão ou uso formal.`
- Extraction failure message (verbatim): `Não foi possível extrair o texto deste arquivo. Envie um PDF com texto selecionável ou um arquivo DOCX.`
- Nothing uploaded or generated is ever persisted to disk or a database — all processing is in-memory for the lifetime of a single request.
- Logs (`console.log`) must only ever include operational metadata (contract type, general risk, duration, success/failure) — never raw contract/model text or the raw AI response body.
- The AI must never be allowed to be the sole source of the disclaimer or of "not legally approved" framing — both the system prompt and hardcoded UI/report text enforce this.
- Package manager: npm.

---

### Task 1: Project scaffolding and test tooling

**Files:**
- Create: entire Next.js project via `create-next-app` (package.json, tsconfig.json, app/layout.tsx, app/page.tsx, app/globals.css, next.config.*, tailwind.config.*, postcss.config.*, .eslintrc.json, .gitignore)
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `.env.example`
- Create: `tests/sanity.test.ts`
- Modify: `package.json` (add `test` and `test:watch` scripts)
- Modify: `.gitignore` (ensure `.env` is ignored)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a running Next.js + TypeScript + Tailwind project with import alias `@/*` → project root, and a working `npm test` command (vitest, `node` environment by default, jsdom available per-file via `// @vitest-environment jsdom` docblock) that later tasks' tests rely on.

- [ ] **Step 1: Scaffold the Next.js app**

Run from `/Users/williamjesus/Desktop/contract-review-service`:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
```

When prompted about the existing `docs/` directory or git repo, accept continuing in the current directory.

- [ ] **Step 2: Install runtime and dev dependencies**

```bash
npm install zod pdf-parse mammoth @react-pdf/renderer docx openai
npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/pdf-parse
```

- [ ] **Step 3: Add vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

Create `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: Add npm test scripts**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Add env example**

Create `.env.example`:

```
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o
MAX_FILE_SIZE_MB=10
```

Open `.gitignore` and confirm it ignores `.env*.local`; add a line `.env` if it is not already covered.

- [ ] **Step 6: Write and run a sanity test**

Create `tests/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('project setup', () => {
  it('runs a basic assertion', () => {
    expect(1 + 1).toBe(2)
  })
})
```

Run: `npm test`
Expected: 1 test file, 1 test, PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with test tooling"
```

---

### Task 2: Contract analysis types and schema

**Files:**
- Create: `types/contract.ts`
- Test: `tests/types/contract.test.ts`

**Interfaces:**
- Consumes: nothing beyond `zod` (installed in Task 1).
- Produces: `RiskLevelSchema`/`RiskLevel`, `MainDataSchema`/`MainData`, `CriticalPointSchema`/`CriticalPoint`, `MissingClauseSchema`/`MissingClause`, `ModelDivergenceSchema`/`ModelDivergence`, `SuggestedAdjustmentSchema`/`SuggestedAdjustment`, `ChecklistItemSchema`/`ChecklistItem`, `AnalysisResultSchema`/`AnalysisResult`, `CONTRACT_TYPES`/`ContractType`, `AnalysisMeta`. All later tasks import from `@/types/contract`.

- [ ] **Step 1: Write the failing test**

Create `tests/types/contract.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { AnalysisResultSchema } from '@/types/contract'

const validAnalysis = {
  executiveSummary: 'Resumo do contrato.',
  contractType: 'NDA',
  mainData: {
    parties: ['Empresa A', 'Empresa B'],
    object: 'Confidencialidade mútua',
    term: '2 anos',
    value: 'N/A',
    paymentTerms: 'N/A',
    penalties: 'Multa de R$10.000',
    termination: 'Rescisão com 30 dias de aviso',
    jurisdiction: 'São Paulo/SP',
    mainObligations: ['Não divulgar informações confidenciais'],
  },
  generalRisk: 'baixo',
  criticalPoints: [
    { title: 'Prazo indefinido', riskLevel: 'medio', description: 'desc', recommendation: 'rec' },
  ],
  missingClauses: [
    { clause: 'LGPD', whyItMatters: 'importante', suggestion: 'adicionar cláusula' },
  ],
  modelDivergences: [],
  suggestedAdjustments: [
    { clause: 'Foro', currentIssue: 'ausente', suggestedText: 'texto sugerido', requiresHumanValidation: true },
  ],
  humanValidationChecklist: [{ item: 'Revisar cláusula de confidencialidade', status: 'pending' }],
  mandatoryDisclaimer:
    'Esta análise foi gerada por IA e deve ser validada por um profissional jurídico antes de qualquer decisão ou uso formal.',
}

describe('AnalysisResultSchema', () => {
  it('accepts a valid analysis object', () => {
    const result = AnalysisResultSchema.safeParse(validAnalysis)
    expect(result.success).toBe(true)
  })

  it('rejects an invalid generalRisk value', () => {
    const invalid = { ...validAnalysis, generalRisk: 'extremo' }
    const result = AnalysisResultSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects when a required field is missing', () => {
    const { executiveSummary, ...invalid } = validAnalysis
    const result = AnalysisResultSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/types/contract.test.ts`
Expected: FAIL with a module-not-found error for `@/types/contract`.

- [ ] **Step 3: Write the implementation**

Create `types/contract.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/types/contract.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add types/contract.ts tests/types/contract.test.ts
git commit -m "feat: add contract analysis schema and types"
```

---

### Task 3: Upload validation

**Files:**
- Create: `lib/validation.ts`
- Test: `tests/lib/validation.test.ts`

**Interfaces:**
- Consumes: nothing (uses only the Web `File` API and `process.env.MAX_FILE_SIZE_MB`).
- Produces: `ALLOWED_EXTENSIONS`, `ALLOWED_MIME_TYPES`, `ValidationErrorCode`, `ValidationError`, `ValidationResult`, `getMaxFileSizeBytes(): number`, `validateUploadedFile(file: File | null, label: string): ValidationResult`. Used by `app/api/analyze-contract/route.ts` (Task 13).

- [ ] **Step 1: Write the failing test**

Create `tests/lib/validation.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest'
import { validateUploadedFile } from '@/lib/validation'

function makeFile(name: string, type: string, sizeBytes: number): File {
  const content = new Uint8Array(sizeBytes)
  return new File([content], name, { type })
}

describe('validateUploadedFile', () => {
  afterEach(() => {
    delete process.env.MAX_FILE_SIZE_MB
  })

  it('returns invalid when file is missing', () => {
    const result = validateUploadedFile(null, 'contrato')
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error.code).toBe('FILE_MISSING')
  })

  it('returns invalid for a disallowed extension', () => {
    const file = makeFile('contrato.txt', 'text/plain', 100)
    const result = validateUploadedFile(file, 'contrato')
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error.code).toBe('INVALID_EXTENSION')
  })

  it('returns invalid when file exceeds MAX_FILE_SIZE_MB', () => {
    process.env.MAX_FILE_SIZE_MB = '1'
    const file = makeFile('contrato.pdf', 'application/pdf', 2 * 1024 * 1024)
    const result = validateUploadedFile(file, 'contrato')
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error.code).toBe('FILE_TOO_LARGE')
  })

  it('returns valid for an allowed PDF within size limit', () => {
    const file = makeFile('contrato.pdf', 'application/pdf', 1024)
    const result = validateUploadedFile(file, 'contrato')
    expect(result.valid).toBe(true)
  })

  it('returns valid for an allowed DOCX within size limit', () => {
    const file = makeFile(
      'contrato.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      1024
    )
    const result = validateUploadedFile(file, 'contrato')
    expect(result.valid).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/validation.test.ts`
Expected: FAIL with a module-not-found error for `@/lib/validation`.

- [ ] **Step 3: Write the implementation**

Create `lib/validation.ts`:

```ts
export const ALLOWED_EXTENSIONS = ['.pdf', '.docx'] as const
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export type ValidationErrorCode =
  | 'FILE_MISSING'
  | 'FILE_TOO_LARGE'
  | 'INVALID_EXTENSION'
  | 'INVALID_MIME_TYPE'

export interface ValidationError {
  code: ValidationErrorCode
  message: string
}

export type ValidationResult = { valid: true } | { valid: false; error: ValidationError }

function getExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  return lastDot === -1 ? '' : fileName.slice(lastDot).toLowerCase()
}

export function getMaxFileSizeBytes(): number {
  const mb = Number(process.env.MAX_FILE_SIZE_MB ?? '10')
  return mb * 1024 * 1024
}

export function validateUploadedFile(file: File | null, label: string): ValidationResult {
  if (!file) {
    return { valid: false, error: { code: 'FILE_MISSING', message: `Envie o arquivo: ${label}.` } }
  }

  const extension = getExtension(file.name)
  if (!ALLOWED_EXTENSIONS.includes(extension as (typeof ALLOWED_EXTENSIONS)[number])) {
    return {
      valid: false,
      error: {
        code: 'INVALID_EXTENSION',
        message: `Formato inválido para ${label}. Envie um arquivo PDF ou DOCX.`,
      },
    }
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: {
        code: 'INVALID_MIME_TYPE',
        message: `Tipo de arquivo inválido para ${label}. Envie um arquivo PDF ou DOCX.`,
      },
    }
  }

  if (file.size > getMaxFileSizeBytes()) {
    return {
      valid: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: `${label} excede o tamanho máximo permitido de ${process.env.MAX_FILE_SIZE_MB ?? '10'}MB.`,
      },
    }
  }

  return { valid: true }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/validation.test.ts`
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/validation.ts tests/lib/validation.test.ts
git commit -m "feat: add upload file validation"
```

---

### Task 4: PDF text extraction

**Files:**
- Create: `lib/extractTextFromPdf.ts`
- Test: `tests/lib/extractTextFromPdf.test.ts`

**Interfaces:**
- Consumes: `pdf-parse` (installed in Task 1).
- Produces: `MIN_EXTRACTABLE_CHARS`, `PdfTextExtractionError`, `extractTextFromPdf(buffer: Buffer): Promise<string>`. Used by `app/api/analyze-contract/route.ts` (Task 13) and by Task 7's report test.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/extractTextFromPdf.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { extractTextFromPdf, PdfTextExtractionError } from '@/lib/extractTextFromPdf'

const PDF_WITH_TEXT = `%PDF-1.1
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /Resources << /Font << /F1 5 0 R >> >> /MediaBox [0 0 200 200] /Contents 4 0 R >> endobj
4 0 obj << /Length 58 >>
stream
BT /F1 18 Tf 10 100 Td (Hello World from a real contract) Tj ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
trailer << /Root 1 0 R /Size 6 >>
%%EOF`

const PDF_WITHOUT_TEXT = `%PDF-1.1
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /Resources << >> /MediaBox [0 0 200 200] /Contents 4 0 R >> endobj
4 0 obj << /Length 0 >>
stream
endstream
endobj
trailer << /Root 1 0 R /Size 5 >>
%%EOF`

describe('extractTextFromPdf', () => {
  it('extracts text from a PDF with selectable text', async () => {
    const buffer = Buffer.from(PDF_WITH_TEXT, 'binary')
    const text = await extractTextFromPdf(buffer)
    expect(text).toContain('Hello World from a real contract')
  })

  it('throws PdfTextExtractionError for a PDF with no extractable text', async () => {
    const buffer = Buffer.from(PDF_WITHOUT_TEXT, 'binary')
    await expect(extractTextFromPdf(buffer)).rejects.toThrow(PdfTextExtractionError)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/extractTextFromPdf.test.ts`
Expected: FAIL with a module-not-found error for `@/lib/extractTextFromPdf`.

- [ ] **Step 3: Write the implementation**

Create `lib/extractTextFromPdf.ts`:

```ts
import pdfParse from 'pdf-parse'

export const MIN_EXTRACTABLE_CHARS = 20

export class PdfTextExtractionError extends Error {
  constructor() {
    super(
      'Não foi possível extrair o texto deste arquivo. Envie um PDF com texto selecionável ou um arquivo DOCX.'
    )
    this.name = 'PdfTextExtractionError'
  }
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { text } = await pdfParse(buffer)
  const trimmed = text.trim()

  if (trimmed.length < MIN_EXTRACTABLE_CHARS) {
    throw new PdfTextExtractionError()
  }

  return trimmed
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/extractTextFromPdf.test.ts`
Expected: 2 tests PASS. If the "extracts text" case fails because the fixture PDF is not parsed as expected, run `npm test -- tests/lib/extractTextFromPdf.test.ts` with `console.log(text)` temporarily added to inspect what `pdf-parse` actually returned, and adjust the fixture's `stream`/`Length` values to match (the `Length` value must equal the exact byte length of the content between `stream\n` and `\nendstream`).

- [ ] **Step 5: Commit**

```bash
git add lib/extractTextFromPdf.ts tests/lib/extractTextFromPdf.test.ts
git commit -m "feat: add PDF text extraction"
```

---

### Task 5: DOCX text extraction

**Files:**
- Create: `lib/extractTextFromDocx.ts`
- Test: `tests/lib/extractTextFromDocx.test.ts`

**Interfaces:**
- Consumes: `mammoth` (installed in Task 1), `docx` (installed in Task 1, used only in the test to build fixtures).
- Produces: `DocxTextExtractionError`, `extractTextFromDocx(buffer: Buffer): Promise<string>`. Used by `app/api/analyze-contract/route.ts` (Task 13) and Task 7's report test.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/extractTextFromDocx.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import { extractTextFromDocx, DocxTextExtractionError } from '@/lib/extractTextFromDocx'

async function buildDocxBuffer(text: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: text
          ? [new Paragraph({ children: [new TextRun(text)] })]
          : [new Paragraph({ children: [] })],
      },
    ],
  })
  return Packer.toBuffer(doc)
}

describe('extractTextFromDocx', () => {
  it('extracts text from a DOCX with content', async () => {
    const buffer = await buildDocxBuffer('Hello World from a real contract clause about confidentiality.')
    const text = await extractTextFromDocx(buffer)
    expect(text).toContain('Hello World from a real contract clause about confidentiality.')
  })

  it('throws DocxTextExtractionError for a DOCX with no meaningful content', async () => {
    const buffer = await buildDocxBuffer('')
    await expect(extractTextFromDocx(buffer)).rejects.toThrow(DocxTextExtractionError)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/extractTextFromDocx.test.ts`
Expected: FAIL with a module-not-found error for `@/lib/extractTextFromDocx`.

- [ ] **Step 3: Write the implementation**

Create `lib/extractTextFromDocx.ts`:

```ts
import mammoth from 'mammoth'

export const MIN_EXTRACTABLE_CHARS = 20

export class DocxTextExtractionError extends Error {
  constructor() {
    super(
      'Não foi possível extrair o texto deste arquivo. Envie um PDF com texto selecionável ou um arquivo DOCX.'
    )
    this.name = 'DocxTextExtractionError'
  }
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer })
  const trimmed = value.trim()

  if (trimmed.length < MIN_EXTRACTABLE_CHARS) {
    throw new DocxTextExtractionError()
  }

  return trimmed
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/extractTextFromDocx.test.ts`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/extractTextFromDocx.ts tests/lib/extractTextFromDocx.test.ts
git commit -m "feat: add DOCX text extraction"
```

---

### Task 6: OpenAI contract analysis call

**Files:**
- Create: `lib/openaiContractAnalysis.ts`
- Test: `tests/lib/openaiContractAnalysis.test.ts`

**Interfaces:**
- Consumes: `AnalysisResultSchema`, `AnalysisResult`, `ContractType` from `@/types/contract` (Task 2); `openai` SDK (installed Task 1); `process.env.OPENAI_MODEL`.
- Produces: `CONTRACT_REVIEW_SYSTEM_PROMPT`, `AnalyzeContractInput`, `AiAnalysisError`, `analyzeContract(input: AnalyzeContractInput, client?: Pick<OpenAI, 'chat'>): Promise<AnalysisResult>`. Used by `app/api/analyze-contract/route.ts` (Task 13).

- [ ] **Step 1: Write the failing test**

Create `tests/lib/openaiContractAnalysis.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analyzeContract, AiAnalysisError } from '@/lib/openaiContractAnalysis'

const validAnalysisJson = JSON.stringify({
  executiveSummary: 'Resumo.',
  contractType: 'NDA',
  mainData: {
    parties: ['A', 'B'],
    object: 'obj',
    term: '1 ano',
    value: 'N/A',
    paymentTerms: 'N/A',
    penalties: 'multa',
    termination: 'rescisão',
    jurisdiction: 'SP',
    mainObligations: ['obrigação'],
  },
  generalRisk: 'baixo',
  criticalPoints: [],
  missingClauses: [],
  modelDivergences: [],
  suggestedAdjustments: [],
  humanValidationChecklist: [],
  mandatoryDisclaimer:
    'Esta análise foi gerada por IA e deve ser validada por um profissional jurídico antes de qualquer decisão ou uso formal.',
})

function makeMockClient(content: string | null) {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content } }],
        }),
      },
    },
  } as any
}

describe('analyzeContract', () => {
  const input = {
    contractText: 'texto do contrato',
    modelText: 'texto do modelo',
    contractType: 'NDA' as const,
    observations: '',
  }

  it('returns a validated analysis when the AI responds with valid JSON', async () => {
    const client = makeMockClient(validAnalysisJson)
    const result = await analyzeContract(input, client)
    expect(result.generalRisk).toBe('baixo')
    expect(client.chat.completions.create).toHaveBeenCalledOnce()
  })

  it('throws AiAnalysisError when the AI response is not valid JSON', async () => {
    const client = makeMockClient('isto não é json')
    await expect(analyzeContract(input, client)).rejects.toThrow(AiAnalysisError)
  })

  it('throws AiAnalysisError when the JSON does not match the expected schema', async () => {
    const client = makeMockClient(JSON.stringify({ foo: 'bar' }))
    await expect(analyzeContract(input, client)).rejects.toThrow(AiAnalysisError)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/openaiContractAnalysis.test.ts`
Expected: FAIL with a module-not-found error for `@/lib/openaiContractAnalysis`.

- [ ] **Step 3: Write the implementation**

Create `lib/openaiContractAnalysis.ts`:

```ts
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
  } as any)

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/openaiContractAnalysis.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/openaiContractAnalysis.ts tests/lib/openaiContractAnalysis.test.ts
git commit -m "feat: add OpenAI contract analysis call"
```

---

### Task 7: Report generation (PDF and DOCX)

**Files:**
- Create: `lib/generateReport.ts`
- Test: `tests/lib/generateReport.test.ts`

**Interfaces:**
- Consumes: `AnalysisResult`, `AnalysisMeta` from `@/types/contract` (Task 2); `@react-pdf/renderer` and `docx` (installed Task 1); `extractTextFromPdf` (Task 4) and `extractTextFromDocx` (Task 5) in the test only, to verify the generated files actually contain the disclaimer.
- Produces: `generateReportPdf(analysis: AnalysisResult, meta: AnalysisMeta): Promise<Buffer>`, `generateReportDocx(analysis: AnalysisResult, meta: AnalysisMeta): Promise<Buffer>`. Used by `app/api/export-report/route.ts` (Task 14).

- [ ] **Step 1: Write the failing test**

Create `tests/lib/generateReport.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateReportPdf, generateReportDocx } from '@/lib/generateReport'
import { extractTextFromPdf } from '@/lib/extractTextFromPdf'
import { extractTextFromDocx } from '@/lib/extractTextFromDocx'
import type { AnalysisResult, AnalysisMeta } from '@/types/contract'

const analysis: AnalysisResult = {
  executiveSummary: 'Este é um resumo executivo de teste com conteúdo suficiente.',
  contractType: 'NDA',
  mainData: {
    parties: ['Empresa A', 'Empresa B'],
    object: 'Confidencialidade',
    term: '2 anos',
    value: 'N/A',
    paymentTerms: 'N/A',
    penalties: 'Multa de R$10.000',
    termination: '30 dias de aviso',
    jurisdiction: 'São Paulo/SP',
    mainObligations: ['Não divulgar informações'],
  },
  generalRisk: 'medio',
  criticalPoints: [
    { title: 'Prazo indefinido', riskLevel: 'medio', description: 'O prazo não está claro.', recommendation: 'Definir prazo exato.' },
  ],
  missingClauses: [{ clause: 'LGPD', whyItMatters: 'Proteção de dados', suggestion: 'Adicionar cláusula de LGPD.' }],
  modelDivergences: [],
  suggestedAdjustments: [
    { clause: 'Foro', currentIssue: 'Ausente', suggestedText: 'Foro da comarca de São Paulo.', requiresHumanValidation: true },
  ],
  humanValidationChecklist: [{ item: 'Revisar cláusula de confidencialidade', status: 'pending' }],
  mandatoryDisclaimer:
    'Esta análise foi gerada por IA e deve ser validada por um profissional jurídico antes de qualquer decisão ou uso formal.',
}

const meta: AnalysisMeta = {
  contractName: 'NDA Fornecedor X',
  contractType: 'NDA',
  analyzedAt: '2026-07-02T10:00:00.000Z',
}

describe('generateReportPdf', () => {
  it('produces a PDF buffer containing the mandatory disclaimer', async () => {
    const buffer = await generateReportPdf(analysis, meta)
    expect(buffer.length).toBeGreaterThan(0)
    const text = await extractTextFromPdf(buffer)
    expect(text).toContain('validado por um profissional jurídico')
  })
})

describe('generateReportDocx', () => {
  it('produces a DOCX buffer containing the mandatory disclaimer', async () => {
    const buffer = await generateReportDocx(analysis, meta)
    expect(buffer.length).toBeGreaterThan(0)
    const text = await extractTextFromDocx(buffer)
    expect(text).toContain('validado por um profissional jurídico')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/generateReport.test.ts`
Expected: FAIL with a module-not-found error for `@/lib/generateReport`.

- [ ] **Step 3: Write the implementation**

Create `lib/generateReport.ts`:

```ts
import React from 'react'
import { renderToBuffer, Document as PdfDocument, Page, Text, StyleSheet } from '@react-pdf/renderer'
import { Document as DocxDocument, Packer, Paragraph, HeadingLevel } from 'docx'
import type { AnalysisResult, AnalysisMeta } from '@/types/contract'

const pdfStyles = StyleSheet.create({
  page: { padding: 32, fontSize: 11 },
  heading: { fontSize: 16, marginBottom: 8, marginTop: 16 },
  subheading: { fontSize: 13, marginBottom: 4, marginTop: 12 },
  text: { marginBottom: 4 },
  disclaimer: { marginTop: 24, fontSize: 10, fontStyle: 'italic' },
})

function ReportPdfDocument({ analysis, meta }: { analysis: AnalysisResult; meta: AnalysisMeta }) {
  return React.createElement(
    PdfDocument,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: pdfStyles.page },
      React.createElement(Text, { style: pdfStyles.heading }, `Relatório de Análise: ${meta.contractName}`),
      React.createElement(Text, { style: pdfStyles.text }, `Tipo de contrato: ${meta.contractType}`),
      React.createElement(Text, { style: pdfStyles.text }, `Data da análise: ${meta.analyzedAt}`),
      React.createElement(Text, { style: pdfStyles.text }, `Risco geral: ${analysis.generalRisk}`),

      React.createElement(Text, { style: pdfStyles.subheading }, 'Resumo executivo'),
      React.createElement(Text, { style: pdfStyles.text }, analysis.executiveSummary),

      React.createElement(Text, { style: pdfStyles.subheading }, 'Pontos críticos'),
      ...analysis.criticalPoints.map((point, i) =>
        React.createElement(
          Text,
          { key: `critical-${i}`, style: pdfStyles.text },
          `${point.title} (${point.riskLevel}): ${point.description} — Recomendação: ${point.recommendation}`
        )
      ),

      React.createElement(Text, { style: pdfStyles.subheading }, 'Cláusulas ausentes'),
      ...analysis.missingClauses.map((clause, i) =>
        React.createElement(
          Text,
          { key: `missing-${i}`, style: pdfStyles.text },
          `${clause.clause}: ${clause.whyItMatters} — Sugestão: ${clause.suggestion}`
        )
      ),

      React.createElement(Text, { style: pdfStyles.subheading }, 'Divergências em relação ao modelo aprovado'),
      ...analysis.modelDivergences.map((divergence, i) =>
        React.createElement(
          Text,
          { key: `divergence-${i}`, style: pdfStyles.text },
          `${divergence.topic}: ${divergence.difference} — Recomendação: ${divergence.recommendation}`
        )
      ),

      React.createElement(Text, { style: pdfStyles.subheading }, 'Sugestões de ajuste (pendentes de validação humana)'),
      ...analysis.suggestedAdjustments.map((adjustment, i) =>
        React.createElement(
          Text,
          { key: `adjustment-${i}`, style: pdfStyles.text },
          `${adjustment.clause}: ${adjustment.currentIssue} — Sugestão: ${adjustment.suggestedText}`
        )
      ),

      React.createElement(Text, { style: pdfStyles.subheading }, 'Checklist para validação humana'),
      ...analysis.humanValidationChecklist.map((item, i) =>
        React.createElement(Text, { key: `checklist-${i}`, style: pdfStyles.text }, `[ ] ${item.item}`)
      ),

      React.createElement(Text, { style: pdfStyles.disclaimer }, analysis.mandatoryDisclaimer)
    )
  )
}

export async function generateReportPdf(analysis: AnalysisResult, meta: AnalysisMeta): Promise<Buffer> {
  return renderToBuffer(React.createElement(ReportPdfDocument, { analysis, meta }) as any)
}

export async function generateReportDocx(analysis: AnalysisResult, meta: AnalysisMeta): Promise<Buffer> {
  const paragraphs: Paragraph[] = [
    new Paragraph({ text: `Relatório de Análise: ${meta.contractName}`, heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: `Tipo de contrato: ${meta.contractType}` }),
    new Paragraph({ text: `Data da análise: ${meta.analyzedAt}` }),
    new Paragraph({ text: `Risco geral: ${analysis.generalRisk}` }),

    new Paragraph({ text: 'Resumo executivo', heading: HeadingLevel.HEADING_2 }),
    new Paragraph({ text: analysis.executiveSummary }),

    new Paragraph({ text: 'Pontos críticos', heading: HeadingLevel.HEADING_2 }),
    ...analysis.criticalPoints.map(
      (point) =>
        new Paragraph({
          text: `${point.title} (${point.riskLevel}): ${point.description} — Recomendação: ${point.recommendation}`,
        })
    ),

    new Paragraph({ text: 'Cláusulas ausentes', heading: HeadingLevel.HEADING_2 }),
    ...analysis.missingClauses.map(
      (clause) => new Paragraph({ text: `${clause.clause}: ${clause.whyItMatters} — Sugestão: ${clause.suggestion}` })
    ),

    new Paragraph({ text: 'Divergências em relação ao modelo aprovado', heading: HeadingLevel.HEADING_2 }),
    ...analysis.modelDivergences.map(
      (divergence) =>
        new Paragraph({
          text: `${divergence.topic}: ${divergence.difference} — Recomendação: ${divergence.recommendation}`,
        })
    ),

    new Paragraph({ text: 'Sugestões de ajuste (pendentes de validação humana)', heading: HeadingLevel.HEADING_2 }),
    ...analysis.suggestedAdjustments.map(
      (adjustment) =>
        new Paragraph({
          text: `${adjustment.clause}: ${adjustment.currentIssue} — Sugestão: ${adjustment.suggestedText}`,
        })
    ),

    new Paragraph({ text: 'Checklist para validação humana', heading: HeadingLevel.HEADING_2 }),
    ...analysis.humanValidationChecklist.map((item) => new Paragraph({ text: `[ ] ${item.item}` })),

    new Paragraph({ text: analysis.mandatoryDisclaimer }),
  ]

  const doc = new DocxDocument({ sections: [{ children: paragraphs }] })
  return Packer.toBuffer(doc)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/generateReport.test.ts`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/generateReport.ts tests/lib/generateReport.test.ts
git commit -m "feat: add PDF and DOCX report generation"
```

---

### Task 8: RiskBadge component

**Files:**
- Create: `components/RiskBadge.tsx`
- Test: `tests/components/RiskBadge.test.tsx`

**Interfaces:**
- Consumes: `RiskLevel` from `@/types/contract` (Task 2).
- Produces: `RiskBadge({ level: RiskLevel })` JSX component, rendering a `data-testid="risk-badge"` element. Used by `components/AnalysisResult.tsx` (Task 11).

- [ ] **Step 1: Write the failing test**

Create `tests/components/RiskBadge.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RiskBadge } from '@/components/RiskBadge'

describe('RiskBadge', () => {
  it('renders the label for baixo risk', () => {
    render(<RiskBadge level="baixo" />)
    expect(screen.getByTestId('risk-badge')).toHaveTextContent('Risco Baixo')
  })

  it('renders the label for alto risk', () => {
    render(<RiskBadge level="alto" />)
    expect(screen.getByTestId('risk-badge')).toHaveTextContent('Risco Alto')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/RiskBadge.test.tsx`
Expected: FAIL with a module-not-found error for `@/components/RiskBadge`.

- [ ] **Step 3: Write the implementation**

Create `components/RiskBadge.tsx`:

```tsx
import type { RiskLevel } from '@/types/contract'

const RISK_STYLES: Record<RiskLevel, string> = {
  baixo: 'bg-green-100 text-green-800 border-green-300',
  medio: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  alto: 'bg-red-100 text-red-800 border-red-300',
}

const RISK_LABELS: Record<RiskLevel, string> = {
  baixo: 'Risco Baixo',
  medio: 'Risco Médio',
  alto: 'Risco Alto',
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span
      data-testid="risk-badge"
      className={`inline-block rounded-full border px-3 py-1 text-sm font-medium ${RISK_STYLES[level]}`}
    >
      {RISK_LABELS[level]}
    </span>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/components/RiskBadge.test.tsx`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/RiskBadge.tsx tests/components/RiskBadge.test.tsx
git commit -m "feat: add RiskBadge component"
```

---

### Task 9: SuggestionList component

**Files:**
- Create: `components/SuggestionList.tsx`
- Test: `tests/components/SuggestionList.test.tsx`

**Interfaces:**
- Consumes: `SuggestedAdjustment` from `@/types/contract` (Task 2).
- Produces: `SuggestionList({ suggestions: SuggestedAdjustment[] })`. Used by `components/AnalysisResult.tsx` (Task 11).

- [ ] **Step 1: Write the failing test**

Create `tests/components/SuggestionList.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SuggestionList } from '@/components/SuggestionList'

describe('SuggestionList', () => {
  it('renders a message when there are no suggestions', () => {
    render(<SuggestionList suggestions={[]} />)
    expect(screen.getByText('Nenhuma sugestão de ajuste identificada.')).toBeInTheDocument()
  })

  it('renders each suggestion with the pending validation notice', () => {
    render(
      <SuggestionList
        suggestions={[
          { clause: 'Foro', currentIssue: 'Ausente', suggestedText: 'Adicionar foro de SP.', requiresHumanValidation: true },
        ]}
      />
    )
    expect(screen.getByText('Foro')).toBeInTheDocument()
    expect(screen.getByText('Pendente de validação humana')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/SuggestionList.test.tsx`
Expected: FAIL with a module-not-found error for `@/components/SuggestionList`.

- [ ] **Step 3: Write the implementation**

Create `components/SuggestionList.tsx`:

```tsx
import type { SuggestedAdjustment } from '@/types/contract'

export function SuggestionList({ suggestions }: { suggestions: SuggestedAdjustment[] }) {
  if (suggestions.length === 0) {
    return <p className="text-sm text-gray-500">Nenhuma sugestão de ajuste identificada.</p>
  }

  return (
    <ul className="space-y-3" data-testid="suggestion-list">
      {suggestions.map((suggestion, index) => (
        <li key={index} className="rounded border border-gray-200 p-3">
          <p className="font-medium">{suggestion.clause}</p>
          <p className="text-sm text-gray-600">{suggestion.currentIssue}</p>
          <p className="mt-1 text-sm">{suggestion.suggestedText}</p>
          <p className="mt-1 text-xs font-semibold text-amber-700">Pendente de validação humana</p>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/components/SuggestionList.test.tsx`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/SuggestionList.tsx tests/components/SuggestionList.test.tsx
git commit -m "feat: add SuggestionList component"
```

---

### Task 10: HumanValidationChecklist component

**Files:**
- Create: `components/HumanValidationChecklist.tsx`
- Test: `tests/components/HumanValidationChecklist.test.tsx`

**Interfaces:**
- Consumes: `ChecklistItem` from `@/types/contract` (Task 2).
- Produces: `HumanValidationChecklist({ items: ChecklistItem[] })`. Used by `components/AnalysisResult.tsx` (Task 11).

- [ ] **Step 1: Write the failing test**

Create `tests/components/HumanValidationChecklist.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HumanValidationChecklist } from '@/components/HumanValidationChecklist'

describe('HumanValidationChecklist', () => {
  it('renders one checklist entry per item', () => {
    render(
      <HumanValidationChecklist
        items={[
          { item: 'Revisar cláusula de confidencialidade', status: 'pending' },
          { item: 'Revisar valor do contrato', status: 'pending' },
        ]}
      />
    )
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
    expect(screen.getByText('Revisar cláusula de confidencialidade')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/HumanValidationChecklist.test.tsx`
Expected: FAIL with a module-not-found error for `@/components/HumanValidationChecklist`.

- [ ] **Step 3: Write the implementation**

Create `components/HumanValidationChecklist.tsx`:

```tsx
import type { ChecklistItem } from '@/types/contract'

export function HumanValidationChecklist({ items }: { items: ChecklistItem[] }) {
  return (
    <ul className="space-y-2" data-testid="human-validation-checklist">
      {items.map((item, index) => (
        <li key={index} className="flex items-center gap-2 text-sm">
          <input type="checkbox" disabled className="h-4 w-4" />
          <span>{item.item}</span>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/components/HumanValidationChecklist.test.tsx`
Expected: 1 test PASS.

- [ ] **Step 5: Commit**

```bash
git add components/HumanValidationChecklist.tsx tests/components/HumanValidationChecklist.test.tsx
git commit -m "feat: add HumanValidationChecklist component"
```

---

### Task 11: AnalysisResult component

**Files:**
- Create: `components/AnalysisResult.tsx`
- Test: `tests/components/AnalysisResult.test.tsx`

**Interfaces:**
- Consumes: `AnalysisResult` (aliased as `AnalysisResultType` to avoid a name clash with this component) and `AnalysisMeta` from `@/types/contract` (Task 2); `RiskBadge` (Task 8); `SuggestionList` (Task 9); `HumanValidationChecklist` (Task 10).
- Produces: `AnalysisResult({ analysis: AnalysisResultType, meta: AnalysisMeta })` JSX component rendering `data-testid="analysis-result"`. Used by `app/page.tsx` (Task 15).

- [ ] **Step 1: Write the failing test**

Create `tests/components/AnalysisResult.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AnalysisResult } from '@/components/AnalysisResult'
import type { AnalysisResult as AnalysisResultType, AnalysisMeta } from '@/types/contract'

const analysis: AnalysisResultType = {
  executiveSummary: 'Resumo executivo de teste.',
  contractType: 'NDA',
  mainData: {
    parties: ['Empresa A', 'Empresa B'],
    object: 'Confidencialidade',
    term: '2 anos',
    value: 'N/A',
    paymentTerms: 'N/A',
    penalties: 'Multa de R$10.000',
    termination: '30 dias de aviso',
    jurisdiction: 'São Paulo/SP',
    mainObligations: ['Não divulgar informações'],
  },
  generalRisk: 'alto',
  criticalPoints: [{ title: 'Prazo indefinido', riskLevel: 'alto', description: 'desc', recommendation: 'rec' }],
  missingClauses: [{ clause: 'LGPD', whyItMatters: 'importa', suggestion: 'adicionar' }],
  modelDivergences: [],
  suggestedAdjustments: [],
  humanValidationChecklist: [{ item: 'Revisar cláusula X', status: 'pending' }],
  mandatoryDisclaimer:
    'Esta análise foi gerada por IA e deve ser validada por um profissional jurídico antes de qualquer decisão ou uso formal.',
}

const meta: AnalysisMeta = { contractName: 'NDA Fornecedor X', contractType: 'NDA', analyzedAt: '2026-07-02T10:00:00.000Z' }

describe('AnalysisResult', () => {
  it('renders contract name, risk badge and the mandatory disclaimer', () => {
    render(<AnalysisResult analysis={analysis} meta={meta} />)
    expect(screen.getByText('NDA Fornecedor X')).toBeInTheDocument()
    expect(screen.getByTestId('risk-badge')).toHaveTextContent('Risco Alto')
    expect(screen.getByText(/validado por um profissional jurídico/)).toBeInTheDocument()
  })

  it('renders the human validation checklist items', () => {
    render(<AnalysisResult analysis={analysis} meta={meta} />)
    expect(screen.getByText('Revisar cláusula X')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/AnalysisResult.test.tsx`
Expected: FAIL with a module-not-found error for `@/components/AnalysisResult`.

- [ ] **Step 3: Write the implementation**

Create `components/AnalysisResult.tsx`:

```tsx
import type { AnalysisResult as AnalysisResultType, AnalysisMeta } from '@/types/contract'
import { RiskBadge } from './RiskBadge'
import { SuggestionList } from './SuggestionList'
import { HumanValidationChecklist } from './HumanValidationChecklist'

export function AnalysisResult({ analysis, meta }: { analysis: AnalysisResultType; meta: AnalysisMeta }) {
  return (
    <div className="space-y-6" data-testid="analysis-result">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{meta.contractName}</h2>
        <RiskBadge level={analysis.generalRisk} />
      </div>

      <section>
        <h3 className="font-medium">Resumo executivo</h3>
        <p className="text-sm text-gray-700">{analysis.executiveSummary}</p>
      </section>

      <section>
        <h3 className="font-medium">Dados principais</h3>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-gray-500">Partes</dt>
          <dd>{analysis.mainData.parties.join(', ')}</dd>
          <dt className="text-gray-500">Objeto</dt>
          <dd>{analysis.mainData.object}</dd>
          <dt className="text-gray-500">Prazo</dt>
          <dd>{analysis.mainData.term}</dd>
          <dt className="text-gray-500">Valor</dt>
          <dd>{analysis.mainData.value}</dd>
          <dt className="text-gray-500">Forma de pagamento</dt>
          <dd>{analysis.mainData.paymentTerms}</dd>
          <dt className="text-gray-500">Multas</dt>
          <dd>{analysis.mainData.penalties}</dd>
          <dt className="text-gray-500">Rescisão</dt>
          <dd>{analysis.mainData.termination}</dd>
          <dt className="text-gray-500">Foro</dt>
          <dd>{analysis.mainData.jurisdiction}</dd>
        </dl>
      </section>

      <section>
        <h3 className="font-medium">Pontos críticos</h3>
        <ul className="space-y-2 text-sm">
          {analysis.criticalPoints.map((point, index) => (
            <li key={index} className="rounded border border-gray-200 p-2">
              <span className="font-medium">{point.title}</span> — {point.description}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="font-medium">Cláusulas ausentes</h3>
        <ul className="space-y-2 text-sm">
          {analysis.missingClauses.map((clause, index) => (
            <li key={index} className="rounded border border-gray-200 p-2">
              <span className="font-medium">{clause.clause}</span> — {clause.whyItMatters}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="font-medium">Divergências em relação ao modelo aprovado</h3>
        <ul className="space-y-2 text-sm">
          {analysis.modelDivergences.map((divergence, index) => (
            <li key={index} className="rounded border border-gray-200 p-2">
              <span className="font-medium">{divergence.topic}</span> — {divergence.difference}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="font-medium">Sugestões de ajuste</h3>
        <SuggestionList suggestions={analysis.suggestedAdjustments} />
      </section>

      <section>
        <h3 className="font-medium">Checklist para validação humana</h3>
        <HumanValidationChecklist items={analysis.humanValidationChecklist} />
      </section>

      <p className="rounded bg-amber-50 p-3 text-sm font-medium text-amber-800">{analysis.mandatoryDisclaimer}</p>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/components/AnalysisResult.test.tsx`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/AnalysisResult.tsx tests/components/AnalysisResult.test.tsx
git commit -m "feat: add AnalysisResult component"
```

---

### Task 12: ContractUploadForm component

**Files:**
- Create: `components/ContractUploadForm.tsx`
- Test: `tests/components/ContractUploadForm.test.tsx`

**Interfaces:**
- Consumes: `CONTRACT_TYPES` from `@/types/contract` (Task 2).
- Produces: `ContractUploadFormProps`, `ContractUploadForm({ onSubmit: (formData: FormData) => void, isSubmitting: boolean, errorMessage?: string })`. `onSubmit` receives a `FormData` with keys `contractName`, `contractType`, `observations`, `contractFile`, `modelFile`. Used by `app/page.tsx` (Task 15).

- [ ] **Step 1: Write the failing test**

Create `tests/components/ContractUploadForm.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContractUploadForm } from '@/components/ContractUploadForm'

function makeFile(name: string, type: string) {
  return new File(['conteúdo'], name, { type })
}

describe('ContractUploadForm', () => {
  it('calls onSubmit with the filled fields and files', async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn()

    render(<ContractUploadForm onSubmit={handleSubmit} isSubmitting={false} />)

    await user.type(screen.getByLabelText('Nome do contrato'), 'NDA Fornecedor X')
    await user.selectOptions(screen.getByLabelText('Tipo do contrato'), 'NDA')
    await user.upload(screen.getByLabelText(/Contrato a ser analisado/), makeFile('contrato.pdf', 'application/pdf'))
    await user.upload(screen.getByLabelText(/Modelo aprovado/), makeFile('modelo.pdf', 'application/pdf'))
    await user.click(screen.getByRole('button', { name: 'Analisar contrato' }))

    expect(handleSubmit).toHaveBeenCalledOnce()
    const formData = handleSubmit.mock.calls[0][0] as FormData
    expect(formData.get('contractName')).toBe('NDA Fornecedor X')
    expect(formData.get('contractType')).toBe('NDA')
    expect((formData.get('contractFile') as File).name).toBe('contrato.pdf')
    expect((formData.get('modelFile') as File).name).toBe('modelo.pdf')
  })

  it('disables the submit button and shows loading label while submitting', () => {
    render(<ContractUploadForm onSubmit={vi.fn()} isSubmitting={true} />)
    expect(screen.getByRole('button', { name: 'Analisando...' })).toBeDisabled()
  })

  it('renders the error message when provided', () => {
    render(<ContractUploadForm onSubmit={vi.fn()} isSubmitting={false} errorMessage="Arquivo inválido." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Arquivo inválido.')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/ContractUploadForm.test.tsx`
Expected: FAIL with a module-not-found error for `@/components/ContractUploadForm`.

- [ ] **Step 3: Write the implementation**

Create `components/ContractUploadForm.tsx`:

```tsx
'use client'

import { useState, type FormEvent } from 'react'
import { CONTRACT_TYPES } from '@/types/contract'

export interface ContractUploadFormProps {
  onSubmit: (formData: FormData) => void
  isSubmitting: boolean
  errorMessage?: string
}

export function ContractUploadForm({ onSubmit, isSubmitting, errorMessage }: ContractUploadFormProps) {
  const [contractName, setContractName] = useState('')
  const [contractType, setContractType] = useState<string>(CONTRACT_TYPES[0])
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [observations, setObservations] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData()
    formData.set('contractName', contractName)
    formData.set('contractType', contractType)
    formData.set('observations', observations)
    if (contractFile) formData.set('contractFile', contractFile)
    if (modelFile) formData.set('modelFile', modelFile)

    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="contract-upload-form">
      <div>
        <label htmlFor="contractName" className="block text-sm font-medium">
          Nome do contrato
        </label>
        <input
          id="contractName"
          type="text"
          required
          value={contractName}
          onChange={(e) => setContractName(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 p-2"
        />
      </div>

      <div>
        <label htmlFor="contractType" className="block text-sm font-medium">
          Tipo do contrato
        </label>
        <select
          id="contractType"
          value={contractType}
          onChange={(e) => setContractType(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 p-2"
        >
          {CONTRACT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="contractFile" className="block text-sm font-medium">
          Contrato a ser analisado (PDF ou DOCX)
        </label>
        <input
          id="contractFile"
          type="file"
          accept=".pdf,.docx"
          required
          onChange={(e) => setContractFile(e.target.files?.[0] ?? null)}
          className="mt-1 w-full"
        />
      </div>

      <div>
        <label htmlFor="modelFile" className="block text-sm font-medium">
          Modelo aprovado de referência (PDF ou DOCX)
        </label>
        <input
          id="modelFile"
          type="file"
          accept=".pdf,.docx"
          required
          onChange={(e) => setModelFile(e.target.files?.[0] ?? null)}
          className="mt-1 w-full"
        />
      </div>

      <div>
        <label htmlFor="observations" className="block text-sm font-medium">
          Observações (opcional)
        </label>
        <textarea
          id="observations"
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 p-2"
          rows={3}
        />
      </div>

      {errorMessage && (
        <p role="alert" className="text-sm text-red-600">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {isSubmitting ? 'Analisando...' : 'Analisar contrato'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/components/ContractUploadForm.test.tsx`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/ContractUploadForm.tsx tests/components/ContractUploadForm.test.tsx
git commit -m "feat: add ContractUploadForm component"
```

---

### Task 13: `/api/analyze-contract` route

**Files:**
- Create: `app/api/analyze-contract/route.ts`
- Test: `tests/app/api/analyze-contract.test.ts`

**Interfaces:**
- Consumes: `validateUploadedFile` (Task 3); `extractTextFromPdf`, `PdfTextExtractionError` (Task 4); `extractTextFromDocx`, `DocxTextExtractionError` (Task 5); `analyzeContract`, `AiAnalysisError` (Task 6); `CONTRACT_TYPES`, `ContractType` (Task 2).
- Produces: `POST(request: Request): Promise<Response>`. Success response body: `{ analysis: AnalysisResult, meta: { contractName: string, contractType: ContractType, analyzedAt: string } }`. Error response body: `{ error: string, code: string }`. Used by `app/page.tsx` (Task 15).

- [ ] **Step 1: Write the failing test**

Create `tests/app/api/analyze-contract.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/openaiContractAnalysis', async () => {
  const actual = await vi.importActual<typeof import('@/lib/openaiContractAnalysis')>(
    '@/lib/openaiContractAnalysis'
  )
  return {
    ...actual,
    analyzeContract: vi.fn(),
  }
})

import { POST } from '@/app/api/analyze-contract/route'
import { analyzeContract } from '@/lib/openaiContractAnalysis'
import { Document, Packer, Paragraph } from 'docx'

async function buildDocxFile(name: string, text: string): Promise<File> {
  const doc = new Document({ sections: [{ children: [new Paragraph(text)] }] })
  const buffer = await Packer.toBuffer(doc)
  return new File([buffer], name, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}

const validAnalysis = {
  executiveSummary: 'Resumo.',
  contractType: 'NDA',
  mainData: {
    parties: ['A', 'B'],
    object: 'obj',
    term: '1 ano',
    value: 'N/A',
    paymentTerms: 'N/A',
    penalties: 'multa',
    termination: 'rescisão',
    jurisdiction: 'SP',
    mainObligations: ['obrigação'],
  },
  generalRisk: 'baixo',
  criticalPoints: [],
  missingClauses: [],
  modelDivergences: [],
  suggestedAdjustments: [],
  humanValidationChecklist: [],
  mandatoryDisclaimer:
    'Esta análise foi gerada por IA e deve ser validada por um profissional jurídico antes de qualquer decisão ou uso formal.',
}

describe('POST /api/analyze-contract', () => {
  beforeEach(() => {
    vi.mocked(analyzeContract).mockReset()
  })

  it('returns 400 when contract name is missing', async () => {
    const formData = new FormData()
    formData.set('contractType', 'NDA')
    const request = new Request('http://localhost/api/analyze-contract', { method: 'POST', body: formData })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.code).toBe('CONTRACT_NAME_MISSING')
  })

  it('returns 422 when text extraction fails', async () => {
    const contractFile = await buildDocxFile('contrato.docx', '')
    const modelFile = await buildDocxFile(
      'modelo.docx',
      'Texto do modelo com conteúdo suficiente para passar na extração.'
    )

    const formData = new FormData()
    formData.set('contractName', 'Contrato Teste')
    formData.set('contractType', 'NDA')
    formData.set('contractFile', contractFile)
    formData.set('modelFile', modelFile)

    const request = new Request('http://localhost/api/analyze-contract', { method: 'POST', body: formData })
    const response = await POST(request)
    expect(response.status).toBe(422)
    const body = await response.json()
    expect(body.code).toBe('TEXT_EXTRACTION_FAILED')
  })

  it('returns the analysis and meta when everything succeeds', async () => {
    vi.mocked(analyzeContract).mockResolvedValue(validAnalysis as any)

    const contractFile = await buildDocxFile(
      'contrato.docx',
      'Texto do contrato com conteúdo suficiente para passar na extração.'
    )
    const modelFile = await buildDocxFile(
      'modelo.docx',
      'Texto do modelo com conteúdo suficiente para passar na extração.'
    )

    const formData = new FormData()
    formData.set('contractName', 'Contrato Teste')
    formData.set('contractType', 'NDA')
    formData.set('contractFile', contractFile)
    formData.set('modelFile', modelFile)

    const request = new Request('http://localhost/api/analyze-contract', { method: 'POST', body: formData })
    const response = await POST(request)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.analysis.generalRisk).toBe('baixo')
    expect(body.meta.contractName).toBe('Contrato Teste')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/app/api/analyze-contract.test.ts`
Expected: FAIL with a module-not-found error for `@/app/api/analyze-contract/route`.

- [ ] **Step 3: Write the implementation**

Create `app/api/analyze-contract/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { validateUploadedFile } from '@/lib/validation'
import { extractTextFromPdf, PdfTextExtractionError } from '@/lib/extractTextFromPdf'
import { extractTextFromDocx, DocxTextExtractionError } from '@/lib/extractTextFromDocx'
import { analyzeContract, AiAnalysisError } from '@/lib/openaiContractAnalysis'
import { CONTRACT_TYPES, type ContractType } from '@/types/contract'

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const isDocx = file.name.toLowerCase().endsWith('.docx')
  return isDocx ? extractTextFromDocx(buffer) : extractTextFromPdf(buffer)
}

export async function POST(request: Request) {
  const formData = await request.formData()

  const contractName = String(formData.get('contractName') ?? '').trim()
  const contractTypeRaw = String(formData.get('contractType') ?? '')
  const observations = String(formData.get('observations') ?? '')
  const contractFile = formData.get('contractFile') as File | null
  const modelFile = formData.get('modelFile') as File | null

  if (!contractName) {
    return NextResponse.json(
      { error: 'Informe o nome do contrato.', code: 'CONTRACT_NAME_MISSING' },
      { status: 400 }
    )
  }

  if (!CONTRACT_TYPES.includes(contractTypeRaw as ContractType)) {
    return NextResponse.json(
      { error: 'Tipo de contrato inválido.', code: 'INVALID_CONTRACT_TYPE' },
      { status: 400 }
    )
  }
  const contractType = contractTypeRaw as ContractType

  const contractValidation = validateUploadedFile(contractFile, 'contrato')
  if (!contractValidation.valid) {
    return NextResponse.json(
      { error: contractValidation.error.message, code: contractValidation.error.code },
      { status: 400 }
    )
  }

  const modelValidation = validateUploadedFile(modelFile, 'modelo aprovado')
  if (!modelValidation.valid) {
    return NextResponse.json(
      { error: modelValidation.error.message, code: modelValidation.error.code },
      { status: 400 }
    )
  }

  let contractText: string
  let modelText: string
  try {
    contractText = await extractText(contractFile as File)
    modelText = await extractText(modelFile as File)
  } catch (error) {
    if (error instanceof PdfTextExtractionError || error instanceof DocxTextExtractionError) {
      return NextResponse.json({ error: error.message, code: 'TEXT_EXTRACTION_FAILED' }, { status: 422 })
    }
    throw error
  }

  const startedAt = Date.now()
  try {
    const analysis = await analyzeContract({ contractText, modelText, contractType, observations })

    console.log(
      JSON.stringify({
        event: 'contract_analysis_succeeded',
        contractType,
        generalRisk: analysis.generalRisk,
        durationMs: Date.now() - startedAt,
      })
    )

    return NextResponse.json({
      analysis,
      meta: {
        contractName,
        contractType,
        analyzedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.log(
      JSON.stringify({
        event: 'contract_analysis_failed',
        contractType,
        durationMs: Date.now() - startedAt,
      })
    )

    if (error instanceof AiAnalysisError) {
      return NextResponse.json(
        { error: 'Não foi possível gerar a análise no momento. Tente novamente.', code: 'AI_ANALYSIS_FAILED' },
        { status: 502 }
      )
    }
    throw error
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/app/api/analyze-contract.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/analyze-contract/route.ts tests/app/api/analyze-contract.test.ts
git commit -m "feat: add analyze-contract API route"
```

---

### Task 14: `/api/export-report` route

**Files:**
- Create: `app/api/export-report/route.ts`
- Test: `tests/app/api/export-report.test.ts`

**Interfaces:**
- Consumes: `AnalysisResultSchema`, `CONTRACT_TYPES`, `ContractType` from `@/types/contract` (Task 2); `generateReportPdf`, `generateReportDocx` from `@/lib/generateReport` (Task 7).
- Produces: `POST(request: Request): Promise<Response>`. Expects query string `?format=pdf|docx` and a JSON body `{ analysis: AnalysisResult, meta: AnalysisMeta }`; returns the binary report with `Content-Type` and `Content-Disposition: attachment` headers. Used by `app/page.tsx` (Task 15).

- [ ] **Step 1: Write the failing test**

Create `tests/app/api/export-report.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { POST } from '@/app/api/export-report/route'

const analysis = {
  executiveSummary: 'Resumo.',
  contractType: 'NDA',
  mainData: {
    parties: ['A', 'B'],
    object: 'obj',
    term: '1 ano',
    value: 'N/A',
    paymentTerms: 'N/A',
    penalties: 'multa',
    termination: 'rescisão',
    jurisdiction: 'SP',
    mainObligations: ['obrigação'],
  },
  generalRisk: 'baixo',
  criticalPoints: [],
  missingClauses: [],
  modelDivergences: [],
  suggestedAdjustments: [],
  humanValidationChecklist: [],
  mandatoryDisclaimer:
    'Esta análise foi gerada por IA e deve ser validada por um profissional jurídico antes de qualquer decisão ou uso formal.',
}

const meta = { contractName: 'NDA Fornecedor X', contractType: 'NDA', analyzedAt: '2026-07-02T10:00:00.000Z' }

describe('POST /api/export-report', () => {
  it('returns 400 for an invalid format', async () => {
    const request = new Request('http://localhost/api/export-report?format=txt', {
      method: 'POST',
      body: JSON.stringify({ analysis, meta }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('returns a PDF buffer with the correct headers', async () => {
    const request = new Request('http://localhost/api/export-report?format=pdf', {
      method: 'POST',
      body: JSON.stringify({ analysis, meta }),
    })
    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    const buffer = Buffer.from(await response.arrayBuffer())
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('returns a DOCX buffer with the correct headers', async () => {
    const request = new Request('http://localhost/api/export-report?format=docx', {
      method: 'POST',
      body: JSON.stringify({ analysis, meta }),
    })
    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
  })

  it('returns 400 when the analysis payload does not match the schema', async () => {
    const request = new Request('http://localhost/api/export-report?format=pdf', {
      method: 'POST',
      body: JSON.stringify({ analysis: { foo: 'bar' }, meta }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/app/api/export-report.test.ts`
Expected: FAIL with a module-not-found error for `@/app/api/export-report/route`.

- [ ] **Step 3: Write the implementation**

Create `app/api/export-report/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { AnalysisResultSchema, CONTRACT_TYPES, type ContractType } from '@/types/contract'
import { generateReportPdf, generateReportDocx } from '@/lib/generateReport'

const CONTENT_TYPES = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const

export async function POST(request: Request) {
  const url = new URL(request.url)
  const format = url.searchParams.get('format')

  if (format !== 'pdf' && format !== 'docx') {
    return NextResponse.json({ error: 'Formato de exportação inválido.', code: 'INVALID_FORMAT' }, { status: 400 })
  }

  const body = await request.json()
  const analysisResult = AnalysisResultSchema.safeParse(body.analysis)

  if (!analysisResult.success) {
    return NextResponse.json({ error: 'Dados da análise inválidos.', code: 'INVALID_ANALYSIS' }, { status: 400 })
  }

  const meta = body.meta
  if (
    !meta ||
    typeof meta.contractName !== 'string' ||
    !CONTRACT_TYPES.includes(meta.contractType as ContractType) ||
    typeof meta.analyzedAt !== 'string'
  ) {
    return NextResponse.json({ error: 'Metadados do relatório inválidos.', code: 'INVALID_META' }, { status: 400 })
  }

  const buffer =
    format === 'pdf'
      ? await generateReportPdf(analysisResult.data, meta)
      : await generateReportDocx(analysisResult.data, meta)

  const fileName = `relatorio-${meta.contractName.replace(/[^a-zA-Z0-9-_]+/g, '_')}.${format}`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': CONTENT_TYPES[format],
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/app/api/export-report.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/export-report/route.ts tests/app/api/export-report.test.ts
git commit -m "feat: add export-report API route"
```

---

### Task 15: Main page — wire form, result and export

**Files:**
- Modify: `app/page.tsx` (replace the `create-next-app` default content)
- Test: `tests/app/page.test.tsx`

**Interfaces:**
- Consumes: `ContractUploadForm` (Task 12); `AnalysisResult` component (Task 11); `AnalysisResult` type and `AnalysisMeta` from `@/types/contract` (aliased to avoid the name clash, Task 2); calls `fetch('/api/analyze-contract')` (Task 13) and `fetch('/api/export-report?format=...')` (Task 14) at runtime.
- Produces: default export `Home()` page component. No other module depends on this file.

- [ ] **Step 1: Write the failing test**

Create `tests/app/page.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from '@/app/page'

function makeFile(name: string, type: string) {
  return new File(['conteúdo'], name, { type })
}

const analysis = {
  executiveSummary: 'Resumo.',
  contractType: 'NDA',
  mainData: {
    parties: ['A', 'B'],
    object: 'obj',
    term: '1 ano',
    value: 'N/A',
    paymentTerms: 'N/A',
    penalties: 'multa',
    termination: 'rescisão',
    jurisdiction: 'SP',
    mainObligations: ['obrigação'],
  },
  generalRisk: 'baixo',
  criticalPoints: [],
  missingClauses: [],
  modelDivergences: [],
  suggestedAdjustments: [],
  humanValidationChecklist: [],
  mandatoryDisclaimer:
    'Esta análise foi gerada por IA e deve ser validada por um profissional jurídico antes de qualquer decisão ou uso formal.',
}

const meta = { contractName: 'NDA Fornecedor X', contractType: 'NDA', analyzedAt: '2026-07-02T10:00:00.000Z' }

describe('Home page', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the analysis result after a successful submission', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ analysis, meta }),
      })
    )

    render(<Home />)

    await user.type(screen.getByLabelText('Nome do contrato'), 'NDA Fornecedor X')
    await user.upload(screen.getByLabelText(/Contrato a ser analisado/), makeFile('contrato.pdf', 'application/pdf'))
    await user.upload(screen.getByLabelText(/Modelo aprovado/), makeFile('modelo.pdf', 'application/pdf'))
    await user.click(screen.getByRole('button', { name: 'Analisar contrato' }))

    await waitFor(() => {
      expect(screen.getByTestId('analysis-result')).toBeInTheDocument()
    })
  })

  it('shows an error message when the API returns an error', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: 'Não foi possível extrair o texto deste arquivo.',
          code: 'TEXT_EXTRACTION_FAILED',
        }),
      })
    )

    render(<Home />)

    await user.type(screen.getByLabelText('Nome do contrato'), 'NDA Fornecedor X')
    await user.upload(screen.getByLabelText(/Contrato a ser analisado/), makeFile('contrato.pdf', 'application/pdf'))
    await user.upload(screen.getByLabelText(/Modelo aprovado/), makeFile('modelo.pdf', 'application/pdf'))
    await user.click(screen.getByRole('button', { name: 'Analisar contrato' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível extrair o texto deste arquivo.')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/app/page.test.tsx`
Expected: FAIL — either a compile error (if `app/page.tsx` still has the default `create-next-app` markup that doesn't expose the expected labels/roles) or a timeout waiting for `analysis-result`/`alert`.

- [ ] **Step 3: Write the implementation**

Replace the contents of `app/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { ContractUploadForm } from '@/components/ContractUploadForm'
import { AnalysisResult } from '@/components/AnalysisResult'
import type { AnalysisResult as AnalysisResultType, AnalysisMeta } from '@/types/contract'

interface AnalyzeResponse {
  analysis: AnalysisResultType
  meta: AnalysisMeta
}

export default function Home() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'docx' | null>(null)

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    setErrorMessage(undefined)
    setResult(null)

    try {
      const response = await fetch('/api/analyze-contract', { method: 'POST', body: formData })
      const body = await response.json()

      if (!response.ok) {
        setErrorMessage(body.error ?? 'Ocorreu um erro ao analisar o contrato.')
        return
      }

      setResult(body)
    } catch {
      setErrorMessage('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleExport(format: 'pdf' | 'docx') {
    if (!result) return
    setExportingFormat(format)

    try {
      const response = await fetch(`/api/export-report?format=${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      })

      if (!response.ok) {
        setErrorMessage('Não foi possível exportar o relatório. Tente novamente.')
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `relatorio-${result.meta.contractName}.${format}`
      link.click()
      window.URL.revokeObjectURL(url)
    } finally {
      setExportingFormat(null)
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-8">
      <h1 className="text-2xl font-bold">Analisar contrato</h1>

      <ContractUploadForm onSubmit={handleSubmit} isSubmitting={isSubmitting} errorMessage={errorMessage} />

      {result && (
        <div className="space-y-4 border-t pt-8">
          <AnalysisResult analysis={result.analysis} meta={result.meta} />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleExport('pdf')}
              disabled={exportingFormat !== null}
              className="rounded bg-gray-800 px-4 py-2 text-white disabled:opacity-50"
            >
              {exportingFormat === 'pdf' ? 'Exportando...' : 'Exportar PDF'}
            </button>
            <button
              type="button"
              onClick={() => handleExport('docx')}
              disabled={exportingFormat !== null}
              className="rounded bg-gray-800 px-4 py-2 text-white disabled:opacity-50"
            >
              {exportingFormat === 'docx' ? 'Exportando...' : 'Exportar DOCX'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/app/page.test.tsx`
Expected: 2 tests PASS.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all test files across all previous tasks PASS.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx tests/app/page.test.tsx
git commit -m "feat: wire upload form, analysis result and export on the main page"
```

---

### Task 16: Manual verification and README

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: nothing new — this task validates the whole system end-to-end and documents it.
- Produces: no new code. Final deliverable is the running MVP plus documentation.

- [ ] **Step 1: Write the README**

Replace the contents of `README.md`:

```markdown
# contract-review-service (LexGuard)

Ferramenta interna para análise preliminar de contratos com IA. Recebe um contrato e um modelo aprovado, e devolve um relatório estruturado (resumo, riscos, cláusulas ausentes, divergências e sugestões), exportável em PDF e DOCX.

A IA nunca aprova juridicamente um contrato, nunca declara que ele está correto e nunca reescreve o contrato original. Toda sugestão é apresentada como pendente de validação humana.

## Instalação

\`\`\`bash
npm install
\`\`\`

## Variáveis de ambiente

Copie \`.env.example\` para \`.env\` e preencha:

\`\`\`
OPENAI_API_KEY=       # obrigatória
OPENAI_MODEL=gpt-4o   # opcional, default gpt-4o
MAX_FILE_SIZE_MB=10   # opcional, default 10
\`\`\`

## Rodando localmente

\`\`\`bash
npm run dev
\`\`\`

Acesse http://localhost:3000.

## Testes

\`\`\`bash
npm test
\`\`\`

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
```

- [ ] **Step 2: Run the full test suite one more time**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 3: Manual verification in the browser**

Run: `npm run dev`, then in a browser at `http://localhost:3000`:
1. Confirm the form renders with all fields from the spec (nome, tipo, upload contrato, upload modelo, observações).
2. Upload a real PDF with selectable text as the contract and a real DOCX as the model, pick a contract type, click "Analisar contrato".
3. Confirm a loading state appears, then either the structured result (with the mandatory disclaimer visible) or a clear error message.
4. If an `OPENAI_API_KEY` is configured, confirm the exported PDF and DOCX both download and contain the disclaimer.
5. Upload a PDF made only of a scanned image (no selectable text) and confirm the exact message "Não foi possível extrair o texto deste arquivo. Envie um PDF com texto selecionável ou um arquivo DOCX." is shown.
6. Confirm the terminal running `npm run dev` never logs the contract text or the raw OpenAI response — only the `contract_analysis_succeeded`/`contract_analysis_failed` JSON lines.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add setup, usage and Sprint 1 delivery notes"
```

---

## Self-Review Notes

- **Spec coverage:** upload form (Task 12/15), PDF/DOCX extraction with the exact error message (Tasks 4/5), OpenAI call with the exact system prompt and JSON schema (Tasks 2/6), structured result screen with every required section (Task 11), PDF+DOCX export with the mandatory disclaimer (Tasks 7/14), file size/extension validation (Task 3), no persistence/no overwrite of the original file (architecture-wide — files are only ever read into memory), sanitized logs (Task 13), friendly error handling for invalid files and failed extraction (Tasks 3, 4, 5, 13, 15).
- **Type consistency:** `AnalysisResult` (type) is consistently aliased to `AnalysisResultType` wherever the `AnalysisResult` component is also in scope (Tasks 11, 15) to avoid a name collision; verified the same alias is used in both places.
- **Scope:** matches the Sprint 1 acceptance criteria only; nothing from the "not in this version" list (login, dashboard, workflow, history, vector DB, collaborative editing, e-signature, legal system integration, auto-approval, auto-rewrite) is included.
