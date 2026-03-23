# ARIA Testing Agent

AI-powered agent that autonomously tests the entire ARIA application using Claude.

## Setup

### 1. Install dependencies
```bash
cd aria-tester
npm install
```

### 2. Get a Bearer token
1. Start the app: `npm run dev` (in the main `aria-app` folder)
2. Go to `http://localhost:3000/dashboard/settings`
3. Scroll to **Extension Tokens** → Generate a new token
4. Copy the token

### 3. Run the agent
```bash
cd aria-tester

# Full test (includes TypeScript check + lint)
ANTHROPIC_API_KEY=sk-ant-... ARIA_TOKEN=<your-token> npm test

# Quick test (skips tsc/lint — faster)
ANTHROPIC_API_KEY=sk-ant-... ARIA_TOKEN=<your-token> npm run test:quick

# Custom app URL (if not localhost:3000)
ANTHROPIC_API_KEY=sk-ant-... ARIA_TOKEN=<your-token> APP_URL=https://your-app.com npm test
```

## What it tests

| Category | Tests |
|---|---|
| **Auth enforcement** | Every route returns 401 when called without token |
| **Functional** | All major endpoints return correct status + response shape |
| **Error handling** | Invalid inputs return 400, missing IDs return 404 |
| **TypeScript** | `tsc --noEmit` — finds type errors |
| **Linting** | `next lint` — finds code quality issues |

## Output

The agent prints progress to the console and writes a final **`TEST_REPORT.md`** in the app root with:
- Executive summary (pass/fail counts)
- ✅/❌ result for every test
- Bug details and security issues
- Recommendations

## Options

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | **Required** |
| `APP_URL` | `http://localhost:3000` | App base URL |
| `ARIA_TOKEN` | — | Bearer token for auth tests |
| `QUICK_MODE` | `false` | Skip tsc + lint |
| `MODEL` | `claude-opus-4-6` | Claude model to use |

> **Cost tip:** Set `MODEL=claude-sonnet-4-6` for faster and cheaper runs.
