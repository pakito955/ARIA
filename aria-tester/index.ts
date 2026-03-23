/**
 * ARIA Testing Agent
 * ─────────────────
 * AI-powered agent that autonomously tests the ARIA application.
 *
 * Usage:
 *   cd aria-tester
 *   npm install
 *   ANTHROPIC_API_KEY=sk-... ARIA_TOKEN=<your-token> npm test
 *
 * Environment variables:
 *   ANTHROPIC_API_KEY  — required
 *   APP_URL            — default: http://localhost:3000
 *   ARIA_TOKEN         — Bearer token from Settings > Extension Tokens (optional but recommended)
 *   QUICK_MODE         — set to "true" to skip TypeScript/lint checks
 */

import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, existsSync, writeFileSync, readdirSync, statSync } from 'fs'
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Config ────────────────────────────────────────────────────────────────────

const APP_URL    = process.env.APP_URL    ?? 'http://localhost:3000'
const TOKEN      = process.env.ARIA_TOKEN ?? ''
const APP_DIR    = path.resolve(__dirname, '..')
const QUICK_MODE = process.env.QUICK_MODE === 'true'
const MODEL      = process.env.MODEL ?? 'claude-opus-4-6'

// ─── Tool definitions ──────────────────────────────────────────────────────────

const tools: Anthropic.Tool[] = [
  {
    name: 'http_request',
    description:
      'Make an HTTP request to the running ARIA app. Use to test API endpoints for correct status codes, response shapes, and auth enforcement.',
    input_schema: {
      type: 'object' as const,
      properties: {
        method:        { type: 'string', enum: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'], description: 'HTTP method' },
        path:          { type: 'string', description: 'Path e.g. /api/stats or /api/emails' },
        body:          { type: 'object', description: 'JSON body for POST/PATCH/PUT' },
        query:         { type: 'object', description: 'Query string params as key-value object' },
        authenticated: { type: 'boolean', description: 'Send Bearer token header (default true). Set false to test 401 enforcement.' },
        note:          { type: 'string', description: 'What you are testing with this request' },
      },
      required: ['method', 'path'],
    },
  },
  {
    name: 'read_source',
    description: 'Read a source file from the ARIA codebase to understand the implementation before testing.',
    input_schema: {
      type: 'object' as const,
      properties: {
        filepath: { type: 'string', description: 'Path relative to app root e.g. src/app/api/stats/route.ts' },
      },
      required: ['filepath'],
    },
  },
  {
    name: 'list_routes',
    description: 'List all API route files in the application.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'run_typecheck',
    description: 'Run TypeScript compiler check (tsc --noEmit) to find type errors.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'run_lint',
    description: 'Run ESLint to find code quality issues.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'write_report',
    description: 'Write the final test report as a Markdown file. Call this when all testing is complete.',
    input_schema: {
      type: 'object' as const,
      properties: {
        content: { type: 'string', description: 'Full Markdown report content' },
      },
      required: ['content'],
    },
  },
]

// ─── Tool execution ────────────────────────────────────────────────────────────

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {

    case 'http_request': {
      const {
        method,
        path: apiPath,
        body,
        query,
        authenticated = true,
        note,
      } = input as {
        method: string
        path: string
        body?: Record<string, unknown>
        query?: Record<string, string>
        authenticated?: boolean
        note?: string
      }

      let url = `${APP_URL}${apiPath}`
      if (query && Object.keys(query).length > 0) {
        url += '?' + new URLSearchParams(query).toString()
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (authenticated && TOKEN) {
        headers['Authorization'] = `Bearer ${TOKEN}`
      }

      if (note) console.log(`   📋 ${note}`)

      try {
        const res = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        })

        const text = await res.text()
        let parsed: unknown = text
        try { parsed = JSON.parse(text) } catch { /* keep raw */ }

        // Truncate large responses
        const bodyStr = JSON.stringify(parsed, null, 2)
        const truncated = bodyStr.length > 2000
          ? bodyStr.slice(0, 2000) + '\n... (truncated)'
          : bodyStr

        return JSON.stringify({ status: res.status, statusText: res.statusText, body: truncated }, null, 2)
      } catch (err) {
        return JSON.stringify({ error: `Network error: ${String(err)}`, url })
      }
    }

    case 'read_source': {
      const { filepath } = input as { filepath: string }
      const fullPath = path.join(APP_DIR, filepath)
      if (!existsSync(fullPath)) return `❌ File not found: ${filepath}`
      try {
        const content = readFileSync(fullPath, 'utf-8')
        // Truncate very large files
        if (content.length > 6000) {
          return content.slice(0, 6000) + '\n\n... (file truncated at 6000 chars)'
        }
        return content
      } catch (err) {
        return `❌ Error reading file: ${String(err)}`
      }
    }

    case 'list_routes': {
      const apiDir = path.join(APP_DIR, 'src/app/api')
      const routes: string[] = []

      function walk(dir: string, prefix = '') {
        const entries = readdirSync(dir)
        for (const entry of entries) {
          const fullPath = path.join(dir, entry)
          const stat = statSync(fullPath)
          if (stat.isDirectory()) {
            walk(fullPath, `${prefix}/${entry}`)
          } else if (entry === 'route.ts' || entry === 'route.js') {
            // Read to find exported HTTP methods
            try {
              const src = readFileSync(fullPath, 'utf-8')
              const methods = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
                .filter(m => src.includes(`export async function ${m}`) || src.includes(`export function ${m}`))
              routes.push(`${prefix} [${methods.join(', ')}]`)
            } catch {
              routes.push(`${prefix} [unknown]`)
            }
          }
        }
      }

      walk(apiDir)
      return routes.sort().join('\n')
    }

    case 'run_typecheck': {
      if (QUICK_MODE) return '⏭️  Skipped (QUICK_MODE=true)'
      console.log('   ⏳ Running tsc --noEmit (may take 30s)...')
      try {
        execSync('npx tsc --noEmit', { cwd: APP_DIR, encoding: 'utf-8', timeout: 120_000 })
        return '✅ TypeScript: no errors'
      } catch (err) {
        const e = err as { stdout?: string; stderr?: string }
        const out = (e.stdout ?? '') + (e.stderr ?? '')
        // Truncate
        return out.length > 4000 ? out.slice(0, 4000) + '\n... (truncated)' : out
      }
    }

    case 'run_lint': {
      if (QUICK_MODE) return '⏭️  Skipped (QUICK_MODE=true)'
      console.log('   ⏳ Running next lint...')
      try {
        const out = execSync('npx next lint 2>&1', { cwd: APP_DIR, encoding: 'utf-8', timeout: 120_000 })
        return out || '✅ ESLint: no errors'
      } catch (err) {
        const e = err as { stdout?: string; stderr?: string }
        const out = (e.stdout ?? '') + (e.stderr ?? '')
        return out.length > 4000 ? out.slice(0, 4000) + '\n... (truncated)' : out
      }
    }

    case 'write_report': {
      const { content } = input as { content: string }
      const reportPath = path.join(APP_DIR, 'TEST_REPORT.md')
      writeFileSync(reportPath, content, 'utf-8')
      return `✅ Report saved to: ${reportPath}`
    }

    default:
      return `❌ Unknown tool: ${name}`
  }
}

// ─── Agent loop ────────────────────────────────────────────────────────────────

async function runAgent() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║          ARIA Application Testing Agent          ║')
  console.log('╚══════════════════════════════════════════════════╝')
  console.log(`\n📡 App URL  : ${APP_URL}`)
  console.log(`🔑 Auth     : ${TOKEN ? '✓ Bearer token set' : '✗ No token — only unauth tests'}`)
  console.log(`🤖 Model    : ${MODEL}`)
  console.log(`⚡ Quick    : ${QUICK_MODE ? 'yes (skip tsc/lint)' : 'no'}`)
  console.log()

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not set')
    process.exit(1)
  }

  const client = new Anthropic()

  const systemPrompt = `You are a senior QA engineer performing a comprehensive automated test of the ARIA email assistant application.

App URL: ${APP_URL}
Auth: ${TOKEN ? `Bearer token available — use it for authenticated tests` : `No Bearer token — only test unauthenticated behavior`}

## Your testing methodology:

1. **Discovery** — Call list_routes to get all API routes. Then read a few key route source files to understand expected behavior.

2. **Security tests** — For EVERY route, test that unauthenticated requests (authenticated=false) return 401. This is critical.

3. **Functional tests** — For each major route, send valid authenticated requests and verify the response structure is correct (right status code, expected fields in response).

4. **Error handling tests** — Send invalid inputs (wrong types, missing required fields) and verify 400 responses.

5. **Static analysis** — Run TypeScript check and linting.

6. **Report** — Write a comprehensive TEST_REPORT.md with:
   - Executive summary (pass/fail counts)
   - ✅/❌ result for each test
   - Detailed findings for any bugs
   - Security issues (missing auth checks)
   - Code quality issues from tsc/lint
   - Recommendations

## Important:
- Be thorough but efficient. Group similar tests.
- For routes that require specific IDs (like /api/emails/[id]), use a placeholder ID like "test-id-123" and note that a 404 is expected.
- Focus on finding REAL bugs, not hypothetical ones.
- The app uses Next.js 15 App Router with Prisma ORM and NextAuth.
- Always finish by calling write_report with your complete findings.`

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: 'Begin comprehensive testing of the ARIA application. Be systematic and thorough.',
    },
  ]

  const MAX_TURNS = 60
  let turn = 0

  while (turn < MAX_TURNS) {
    turn++
    console.log(`\n${'─'.repeat(50)}`)
    console.log(`Turn ${turn}/${MAX_TURNS}`)

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8096,
      system: systemPrompt,
      tools,
      messages,
    })

    // Print text output
    for (const block of response.content) {
      if (block.type === 'text' && block.text.trim()) {
        console.log('\n' + block.text)
      }
    }

    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason === 'end_turn') {
      console.log('\n\n✅ Agent finished.')
      break
    }

    if (response.stop_reason !== 'tool_use') {
      console.log(`\n⚠️  Unexpected stop_reason: ${response.stop_reason}`)
      break
    }

    // Execute tools
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )

    const results: Anthropic.ToolResultBlockParam[] = []

    for (const toolUse of toolUseBlocks) {
      const inputPreview = JSON.stringify(toolUse.input).slice(0, 120)
      console.log(`\n🔧 ${toolUse.name}(${inputPreview}${inputPreview.length >= 120 ? '...' : ''})`)

      const result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>)

      const preview = result.slice(0, 300)
      console.log(`   ↳ ${preview}${result.length > 300 ? '...' : ''}`)

      results.push({ type: 'tool_result', tool_use_id: toolUse.id, content: result })
    }

    messages.push({ role: 'user', content: results })
  }

  if (turn >= MAX_TURNS) {
    console.log('\n⚠️  Max turns reached — agent stopped.')
  }

  // Check if report was written
  const reportPath = path.join(APP_DIR, 'TEST_REPORT.md')
  if (existsSync(reportPath)) {
    console.log(`\n📄 Report saved: ${reportPath}`)
  } else {
    console.log('\n⚠️  No report was written. Check agent output above.')
  }
}

runAgent().catch((err) => {
  console.error('\n❌ Fatal error:', err)
  process.exit(1)
})
