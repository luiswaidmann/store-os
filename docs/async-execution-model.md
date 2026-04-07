# Async Execution Model

## Status

**ACTIVE** — deployed to `orchestrate-phase1` (n8n workflow `SCRLaQ9jFVo12zNR`).
Confirmed: execution 14361 — HTTP 202 in ~2s → `PHASE_7A_COMPLETE` polled at ~117s.

Branch: `feature/async-execution-model`

---

## Problem Solved

The full Phase 1–7A chain runs for ~117 seconds. Cloudflare (n8n Cloud's CDN) enforces a **100-second HTTP timeout** on webhook connections. Under the previous synchronous model, callers would receive **HTTP 524** before the chain completed.

The n8n execution itself always completed successfully — but the caller had no way to receive the result.

---

## Solution: Respond-to-Webhook + API Polling

The orchestrator now uses n8n's `responseMode: "responseNode"` pattern:

```
Webhook Trigger
    → Resolve Runtime Config         (env vars + auth)
    → Prepare Async Response          (assemble execution_id + metadata)
    → Respond to Webhook              ← HTTP 202 sent here (~2s)
    → Validate Orchestrate Input      (fast-fail schema check)
    → [full phase chain]
    → Phase 7A Complete
```

Key points:
- `responseMode: "responseNode"` on the Webhook Trigger node — n8n sends the HTTP response when "Respond to Webhook" is hit, not at workflow completion
- "Prepare Async Response" passes through the original runtime config (so downstream nodes receive the correct input) **and** embeds `_async_response` with `execution_id` + tracking info
- "Respond to Webhook" uses `$json._async_response` as the HTTP body, leaving the runtime config intact for downstream nodes
- The full chain runs asynchronously after the 202 is sent

---

## Caller Lifecycle

### 1. Trigger

```bash
POST /webhook/orchestrate-phase1
Content-Type: application/json
Authorization: Bearer <STORE_OS_API_TOKEN>

{ ...intake_payload... }
```

**Response (within ~2s):**
```json
{
  "execution_id": "14361",
  "status": "started",
  "project_id": "suppliedtech",
  "started_at": "2026-04-07T12:14:03.906Z",
  "message": "Run started asynchronously. Poll /api/v1/executions/14361 for status and results.",
  "tracking": {
    "poll_interval_seconds": 5,
    "terminal_statuses": ["PHASE_7A_COMPLETE", ...],
    "api_endpoint": "GET /api/v1/executions/14361?includeData=true",
    "result_field": "data.resultData.runData[lastNodeExecuted][0].data.main[0][0].json"
  }
}
```

### 2. Poll

```
GET /api/v1/executions/{execution_id}?includeData=true
X-N8N-API-KEY: <N8N_API_KEY>
```

Poll every 5 seconds. Check:
- `status: "error"` → execution failed
- `status: "success"` and `finished: true` → complete

### 3. Extract Result

From the completed execution:
```
data.resultData.runData["Phase 7A Complete"][0].data.main[0][0].json
```

The result is the full artifact chain:
`store_profile`, `market_intelligence`, `brand_positioning`, `competitor_clusters`, `strategy_synthesis`, `offer_architecture`, `content_strategy`, `gtm_plan`, `store_blueprint`

---

## CLI Usage

### Full run (trigger + poll)

```bash
node scripts/run-orchestrator.js --input test-data/golden-input.json
```

### Trigger only — get execution_id

```bash
node scripts/run-orchestrator.js --input test-data/golden-input.json --no-poll
# Execution started: 14361
# Poll with: node scripts/run-orchestrator.js --execution-id 14361
```

### Poll an existing execution

```bash
# Full CLI:
node scripts/run-orchestrator.js --execution-id 14361

# Lightweight standalone poller:
node scripts/poll-execution.js 14361
node scripts/poll-execution.js 14361 --json          # raw JSON output
node scripts/poll-execution.js 14361 --timeout 300000
```

### Environment variables required

| Variable | Purpose |
|---|---|
| `N8N_BASE_URL` | n8n instance URL (e.g. `https://luwai.app.n8n.cloud`) |
| `N8N_API_KEY` | n8n API key — used for polling `/api/v1/executions` |
| `STORE_OS_API_TOKEN` | Bearer token for webhook auth (optional if not set in n8n) |

---

## n8n Orchestrator Changes

**File:** `workflows/n8n/orchestrate-phase1.n8n.json`

| Change | Detail |
|---|---|
| Webhook Trigger `responseMode` | `"lastNode"` → `"responseNode"` |
| New node: `Prepare Async Response` | Code node — passes runtime config through + embeds `_async_response` |
| New node: `Respond to Webhook` | `n8n-nodes-base.respondToWebhook` — sends HTTP 202 using `$json._async_response` |
| Connection change | `Resolve Runtime Config → Prepare Async Response → Respond to Webhook → Validate Orchestrate Input` |
| Total nodes | 55 → 57 |

---

## Backward Compatibility

The CLI (`run-orchestrator.js`) detects legacy synchronous responses (where `status` is a terminal status string like `PHASE_7A_COMPLETE`) and handles them directly without polling. This means old synchronous n8n deployments continue to work.

---

## Persistence

Each completed run is automatically persisted to `outputs/runs/{execution_id}.json` by the CLI. This provides durable, repo-local storage that survives n8n API expiry.

See `docs/execution-persistence.md` for full details, read path, and record schema.

```bash
node scripts/inspect-run.js --latest
node scripts/inspect-run.js --list
node scripts/inspect-run.js <execution_id>
```

---

## Limitations

- n8n Cloud free tier: executions expire from the API after a short retention window. Poll promptly after triggering; results are permanently stored in `outputs/runs/` after polling.
- The n8n API key must have read access to executions.
- If the execution errors before "Respond to Webhook", the caller may receive an empty HTTP 200 (the default n8n error response for failed webhook workflows). In that case, check n8n execution logs directly.
