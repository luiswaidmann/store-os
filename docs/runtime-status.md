# store-os runtime status

## Current confirmed repo state

Branch baseline:

- `feature/phase-16-strategy-synthesis-runtime` (in progress — pending PR to `main`)

Latest commits (unmerged, branch tip):

- `04c4bf3` fix: align brand-positioning direct-field enums with golden-input and validate node
- `c254936` feat: webhook trigger, auth hardening, input validation, observability, Phase 6 schemas

Latest confirmed merge on `main` relevant to executable runtime progression:

- `633c80d` Merge pull request #10 from `feature/runtime-hardening-artifact-contracts` (Phase 16 hardening)

Recent runtime progression merges (on `main`):

- `eff416f` Merge pull request #9 from `feature/phase-15-competitor-clusters-runtime`
- `e25fe42` Merge pull request #8 from `feature/phase-14-brand-positioning-runtime`
- `35c8d51` Merge pull request #7 from `feature/phase-13-market-intelligence-runtime`
- `4a37e26` Merge pull request #6 from `feature/phase-12-cloud-aggregation-fix`
- `1f54815` Merge pull request #5 from `feature/phase-12-cloud-config-fix`
- `0404ef5` Merge pull request #4 from `feature/phase-12-cloud-hardening`
- `8ad40d5` Merge pull request #3 from `feature/phase-12-executable-foundation`

## Last confirmed end-to-end smoke test

**Phase 7B.1 smoke test: PENDING** — `build-shopify-catalog` deployed 2026-04-07, live run against `8zw111-cj.myshopify.com` not yet executed.

**Phase 7A confirmed:**
**Date:** 2026-04-07
**Method:** `node scripts/run-orchestrator.js --input test-data/golden-input.json` (async model + persistence)
**Input:** `test-data/golden-input.json` (project: `suppliedtech`)
**Result:** `PHASE_7A_COMPLETE` — n8n execution 14380, status: success, ~108s — cloud mode
**Async response:** HTTP 202 returned in ~2s; CLI polled to completion; persisted to `outputs/runs/14380.json`
**Chain:** All Phase 1–7A nodes succeeded (Webhook Trigger → Respond to Webhook → … → Phase 7A Complete)
**Artifacts returned:** `store_profile`, `market_intelligence`, `brand_positioning`, `competitor_clusters`, `strategy_synthesis`, `offer_architecture`, `content_strategy`, `gtm_plan`, `store_blueprint`
**Store blueprint highlights:**
- Blueprint narrative: "SuppliedTech is a specialist store offering high-quality tech accessories tailored for SMEs at competitive prices."
- Products: 3 | Collections: 2 | Pages: 3 | Theme sections: 4 | Assets: 3

Previous confirmed test (Phase 6c):
**Date:** 2026-04-07 | **Result:** `PHASE_6C_COMPLETE` — HTTP 200, ~83-99s

Previous confirmed test (Phase 6b):
**Date:** 2026-04-07 | **Result:** `PHASE_6B_COMPLETE` — HTTP 200, ~81-104s

Previous confirmed test (Phase 6a):
**Date:** 2026-04-07 | **Result:** `PHASE_6A_COMPLETE` — HTTP 200, ~77s

Previous confirmed test (Phase 5):
**Date:** 2026-04-07 | **Result:** `PHASE_5_COMPLETE` — HTTP 200, ~90s

## Current confirmed executable chain

The currently confirmed n8n execution path (Phase 7A — 2026-04-07) is:

- `resolve-runtime-config`
- `intake-store-input`
- `import-shopify-data`
- `build-store-profile`
- `build-market-intelligence`
- `build-brand-positioning`
- `build-competitor-clusters`
- `build-strategy-synthesis` (Phase 16)
- `build-offer-architecture` (Phase 6a)
- `build-content-strategy` (Phase 6b)
- `build-gtm-plan` (Phase 6c)
- `build-store-blueprint` (Phase 7A)
- `build-shopify-catalog` ← **NEW** (Phase 7B.1, `feature/phase-7b1-shopify-catalog`)

**Async model:** Chains run ~117s+. The webhook returns HTTP 202 within ~2s with an `execution_id`. The CLI polls `GET /api/v1/executions/{id}` until `finished: true`. Cloudflare's 100s timeout is no longer hit. See `docs/async-execution-model.md`.

## Current confirmed inline outputs

The chain currently returns these runtime artifacts inline in cloud mode:

- `store_profile`
- `market_intelligence`
- `brand_positioning`
- `competitor_clusters`
- `strategy_synthesis`
- `offer_architecture`
- `content_strategy`
- `gtm_plan`
- `store_blueprint`
- `shopify_catalog_deployment` ← **NEW** (Phase 7B.1)

## Runtime Hardening (Phase 16)

Branch: `feature/runtime-hardening-artifact-contracts`

Phase 16 added a contract layer, runtime envelope, enriched schemas, gold path example, and documentation. No new execution phases were added — this phase hardened the existing Phase 1 chain.

### What was added

**New schemas** (`schemas/runtime/`):
- `runtime-envelope.schema.json` — standard envelope wrapper for all workflow outputs
- `validation-result.schema.json` — structured validation result with machine-readable error codes
- `artifact-metadata.schema.json` — artifact identity and provenance metadata (`_meta` field)

**Enriched artifact schemas** (additive, backward-compatible):
- `schemas/store-profile.schema.json` — new optional fields: `assortment_shape`, `target_audience_hypotheses`, `value_proposition_hint`, `brand_voice_hint`, `ux_merchandising_maturity`, `open_questions`, `_meta`
- `schemas/market-intelligence.schema.json` — new optional fields: `market_hypotheses`, `trend_signals`, `seasonality_hints`, `price_band_logic`, `risk_flags`, `opportunity_flags`, `competition_surface`, `adjacent_market_hints`, `unknown_states`, `_meta`
- `schemas/brand-positioning.schema.json` — new optional fields: `emotional_benefits`, `functional_benefits`, `reason_to_believe`, `messaging_pillars`, `anti_positioning`, `confidence_basis`, `_meta`
- `schemas/competitor-cluster.schema.json` — new optional cluster fields: `competitor_type_classification`, `price_tier`, `brand_style`, `product_breadth`, `trust_signals_used`, `strategic_summary`; new competitor_examples item fields: `competitor_type_classification`, `price_tier`, `brand_style_note`

**Contract files** (`workflows/contracts/`):
- `_runtime-envelope.contract.json` — cross-chain envelope spec
- `resolve-runtime-config.contract.json`
- `intake-store-input.contract.json`
- `build-store-profile.contract.json`
- `build-market-intelligence.contract.json`
- `build-brand-positioning.contract.json`
- `build-competitor-clusters.contract.json`

**Enhanced n8n workflows** (additive, backward-compatible):
- `build-store-profile.n8n.json` — added runtime envelope; new optional enrichments (assortment_shape, target_audience_hypotheses, value_proposition_hint, brand_voice_hint, ux_merchandising_maturity, open_questions)
- `build-market-intelligence.n8n.json` — added runtime envelope; expanded LLM prompt to request new optional fields (market_hypotheses, trend_signals, etc.)
- `build-brand-positioning.n8n.json` — added runtime envelope; expanded LLM prompt for emotional_benefits, functional_benefits, reason_to_believe, messaging_pillars, anti_positioning; added confidence_basis (computed in code)
- `build-competitor-clusters.n8n.json` — added runtime envelope; expanded cluster prompt schema for new optional cluster fields

**Gold path example**: `workflows/examples/gold-path-example.json`

**Documentation**:
- `docs/runtime-envelope.md`
- `docs/artifact-model.md`
- `docs/validation-model.md`
- `docs/phase-contracts.md`
- `docs/execution-semantics.md`
- `docs/extension-guide.md`

### Backward compatibility

All changes are additive. No existing output keys were removed or renamed. Cloud smoke-test compatibility is preserved — the cloud-mode detection pattern (`let cloudMode = false; try { require('fs'); } catch (_e) { cloudMode = true; }`) remains intact in all modified workflows.

## Current cloud strategy

n8n Cloud is currently used as a smoke-test and orchestration validation path.

Accepted cloud limitations:

- no real filesystem access
- no normal `process.env` dependency
- no disk artifact persistence
- no checkpoint files on disk
- no AJV / local schema validation through file paths

These limitations are currently acceptable because cloud mode is being used to validate runtime wiring and phase execution.

## Self-hosted strategy

Self-hosted remains the intended fuller operational target path for later phases, especially where persistence, local validation, or filesystem-backed checkpointing becomes important.

No self-hosted migration is currently required for the next implementation step.

## Current setup assumptions in n8n

The repo intentionally keeps `REPLACE_WITH_*` placeholders for:

- workflow IDs in orchestrators
- credential IDs in importable workflow JSON files

Manual n8n setup remains expected for:

- workflow import
- credential binding
- workflow ID replacement
- cloud smoke-test trigger input execution

## Strategy Synthesis (Phase 16 — feature/phase-16-strategy-synthesis-runtime)

Branch: `feature/phase-16-strategy-synthesis-runtime`

This phase adds the first cross-artifact synthesis phase to the chain: `build-strategy-synthesis`.

### What was added

**New artifact schema**: `schemas/strategy-synthesis.schema.json`
- Required fields: `strategic_summary`, `growth_thesis`, `positioning_focus`, `opportunity_priorities`, `risk_priorities`, `validation_questions`
- Optional fields: `moat_hypotheses`, `messaging_priorities`, `offer_implications`, `gtm_implications`, `confidence_notes`, `unknown_states`

**New contract**: `workflows/contracts/build-strategy-synthesis.contract.json`

**New n8n workflow**: `workflows/n8n/build-strategy-synthesis.n8n.json`
- 5-node pattern: Subworkflow Trigger → Validate Upstream Inputs → Build LLM Synthesis Prompt → LLM Synthesis: Strategy → Parse Validate Write
- Inline validation always runs (both modes)
- AJV validation and disk write: self-hosted only

**Updated orchestrator**: `workflows/n8n/orchestrate-phase1.n8n.json`
- 5 new nodes added after Phase 4 Complete: Prepare Strategy Synthesis Input, Run build-strategy-synthesis, Strategy Synthesis Success?, Halt - Strategy Synthesis Failed, Phase 5 Complete
- Phase 4 Complete updated to carry `normalized_intake_payload` forward and point to Phase 5

**Updated gold path**: `workflows/examples/gold-path-example.json`
- Added `build-strategy-synthesis` to chain, expected_minimum_outputs, acceptance_criteria, and smoke_test_checklist

**Updated documentation**: `docs/phase-contracts.md`, `docs/runtime-status.md`, `docs/phase-16-strategy-synthesis-runtime.md`

### Synthesis scope

`build-strategy-synthesis` consumes all four upstream planning artifacts and produces a single strategic synthesis that is the primary input for downstream phases (build-offer-architecture, build-content-strategy, build-gtm-plan).

### Backward compatibility

All changes are additive. No existing output keys were removed or renamed. Cloud smoke-test compatibility preserved.

## System Hardening & Operationalization (post-Phase 16)

Branch: `feature/phase-16-strategy-synthesis-runtime`

These changes harden the system for production use and establish the API-ready interface.

### What was added

**Webhook trigger** (`orchestrate-phase1`):
- Webhook Trigger node added alongside Manual Trigger (both feed into same chain)
- Webhook URL: `POST https://luwai.app.n8n.cloud/webhook/orchestrate-phase1`
- All 8 workflows activated in n8n

**Webhook auth hardening**:
- Bearer token check in `Resolve Runtime Config` node
- Token: `STORE_OS_API_TOKEN` (n8n env var or `smoke_test_config`)
- Manual Trigger path: auth skipped (backward compatible)
- Webhook path: token required if `STORE_OS_API_TOKEN` is set

**Input validation** (`Validate Orchestrate Input` node):
- Inserted between `Resolve Runtime Config` and `Run intake-store-input`
- Validates required fields, enum values, project_id format, competitor_urls
- Returns `VALIDATION_ERROR` with structured error list on failure
- New enum: `brand_style` (`minimal`, `bold`, `editorial`, `playful`, `premium`, `technical`, `other`)

**Input contract schema**: `schemas/runtime/orchestrate-input.schema.json`

**Golden test input**: `test-data/golden-input.json`

**Observability** — Phase 5 Complete now returns:
- `execution_id` (from `$execution.id`)
- `started_at`, `completed_at`, `duration_ms`
- `phase_receipt` (completion status per phase)
- `output_summary` (enriched metrics)

**Deploy automation** (`scripts/deploy-workflow.js`):
- One-command deploy: `node scripts/deploy-workflow.js <workflow-name>`
- Substitutes all `REPLACE_WITH_*` placeholders from `workflow-ids.json`
- Strips n8n read-only fields (`id`, `active`, `_meta`) before PUT
- Requires: `N8N_BASE_URL`, `N8N_API_KEY` in `.env`

**API CLI wrapper** (`scripts/run-orchestrator.js`):
- Sends POST to webhook with auth header
- Loads payload from JSON file
- Prints clean structured summary
- Usage: `node scripts/run-orchestrator.js --input test-data/golden-input.json`

**Workflow ID manifest** (`workflows/n8n/workflow-ids.json`):
- Maps all 9 workflow names to live n8n IDs
- Tracks credential placeholder locations
- Documents `build-brand-positioning` canonical ID (`eUXnAlZ0gmv6qOhL`)

**Phase 6 preparation**:
- `schemas/phase-6/offer-architecture.schema.json`
- `schemas/phase-6/content-strategy.schema.json`
- `schemas/phase-6/gtm-plan.schema.json`
- `docs/phase-6-architecture.md`

---

## How to call the system

### Via CLI wrapper (async — recommended)

```bash
# Set in .env: N8N_BASE_URL, N8N_API_KEY, (optional) STORE_OS_API_TOKEN
node scripts/run-orchestrator.js --input test-data/golden-input.json
# → returns HTTP 202 with execution_id in ~2s, then polls until PHASE_7A_COMPLETE
# → persists result to outputs/runs/{execution_id}.json automatically

# Trigger only — get execution_id, do not poll:
node scripts/run-orchestrator.js --input test-data/golden-input.json --no-poll

# Poll a previously-started execution:
node scripts/run-orchestrator.js --execution-id <id>
# Or use the standalone poller:
node scripts/poll-execution.js <execution_id>

# Dry run (validate payload locally, no request):
node scripts/run-orchestrator.js --input test-data/golden-input.json --dry-run

# Silent (output raw JSON only):
node scripts/run-orchestrator.js --input test-data/golden-input.json --silent
```

### Inspect persisted run history

```bash
node scripts/inspect-run.js --list                          # all runs
node scripts/inspect-run.js --latest                        # most recent run
node scripts/inspect-run.js --project suppliedtech --latest # latest for project
node scripts/inspect-run.js 14380                           # specific run
node scripts/inspect-run.js 14380 --json                    # raw JSON
```

See `docs/execution-persistence.md` for full persistence documentation.

### Via webhook (direct)

```bash
curl -X POST https://luwai.app.n8n.cloud/webhook/orchestrate-phase1 \
  -H "Authorization: Bearer <STORE_OS_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d @test-data/golden-input.json
# Returns HTTP 202 { execution_id, status: "started", ... }
# Poll: GET https://luwai.app.n8n.cloud/api/v1/executions/<execution_id>?includeData=true
```

### Via Manual Trigger (n8n UI)

Open `orchestrate-phase1` in n8n, paste input JSON, Execute.
Auth check is skipped for manual trigger runs.

### Deploy a workflow from repo to n8n

```bash
node scripts/deploy-workflow.js orchestrate-phase1
node scripts/deploy-workflow.js build-strategy-synthesis
```

---

## System Architecture (text diagram)

```
INPUT LAYER
  Webhook POST  ──→  Authorization: Bearer <STORE_OS_API_TOKEN>
  Manual Trigger ──→ (no auth required)
  Payload: { intake_payload: {...}, smoke_test_config: {...} }
      │
      ▼
orchestrate-phase1
  Resolve Runtime Config     ← validates env vars + auth token
      │
  Prepare Async Response     ← assembles execution_id + tracking info
      │
  Respond to Webhook         ← HTTP 202 sent here (~2s) — caller unblocked
      │                         execution continues asynchronously
  Validate Orchestrate Input ← fast-fail schema check
      │
  ┌── PHASE CHAIN ────────────────────────────────────────┐
  │  intake-store-input → import-shopify-data             │
  │  build-store-profile          (Phase 1)               │
  │  build-market-intelligence    (Phase 2)               │
  │  build-brand-positioning      (Phase 3)               │
  │  build-competitor-clusters    (Phase 4)               │
  │  build-strategy-synthesis     (Phase 5)               │
  │  build-offer-architecture     (Phase 6a)              │
  │  build-content-strategy       (Phase 6b)              │
  │  build-gtm-plan               (Phase 6c)              │
  │  build-store-blueprint        (Phase 7A) ← TERMINAL   │
  └───────────────────────────────────────────────────────┘
      │
  Phase 7A Complete → returns inline artifacts + metadata

CALLER FLOW (async)
  1. POST webhook → HTTP 202 { execution_id, status: "started" }  (~2s)
  2. Poll GET /api/v1/executions/{id}?includeData=true  (every 5s)
  3. finished: true → extract result from Phase 7A Complete node

OUTPUT (extracted from execution data)
  status, execution_id, completed_at
  next_phase (Phase 7B — Shopify API deployment)
  store_profile, market_intelligence, brand_positioning,
  competitor_clusters, strategy_synthesis,
  offer_architecture, content_strategy, gtm_plan,
  store_blueprint (all inline in cloud mode)
```

---

## Input contract alignment

The following `intake_payload` fields are validated at two layers:

| Field | Validated in orchestrator | Enforced in subworkflow |
|---|---|---|
| `vertical` | `Validate Orchestrate Input` (enum) | `build-store-profile` |
| `price_positioning` | `Validate Orchestrate Input` (enum) | `build-store-profile` |
| `brand_style` | `Validate Orchestrate Input` (enum) | `build-brand-positioning` |
| `brand_role` | `Validate Orchestrate Input` (enum) | `build-brand-positioning` (DIRECT field) |
| `tone_of_voice` | `Validate Orchestrate Input` (enum) | `build-brand-positioning` (DIRECT field) |
| `trust_style` | `Validate Orchestrate Input` (enum) | `build-brand-positioning` (DIRECT field) |
| `conversion_style` | `Validate Orchestrate Input` (enum) | `build-brand-positioning` (DIRECT field) |

DIRECT fields are passed through verbatim and override any LLM-generated values.

## Confirmed next planned runtime step

Next feature branch: **Phase 7B — Store Build (Shopify API)**

- `build-shopify-products` — create/update products and variants from store_blueprint
- `build-shopify-collections` — create/update smart and custom collections
- `build-shopify-pages` — publish About, FAQ, Contact pages
- `build-shopify-navigation` — deploy menus
- `build-shopify-theme` — configure and publish theme sections

Phase 7A is **COMPLETE** — `build-store-blueprint` is deployed, activated, and end-to-end confirmed (n8n execution status: success). Cloud timeout limitation documented.

Phase 6 is **COMPLETE** — all three Phase 6 subworkflows (`build-offer-architecture`, `build-content-strategy`, `build-gtm-plan`) are deployed, activated, and end-to-end confirmed.

See `docs/phase-7-architecture.md` for Phase 7A/7B architecture and cloud timeout mitigation plan.

---

## Operational notes

**Deploy automation:**
```bash
node scripts/deploy-workflow.js orchestrate-phase1
```
Reads `workflows/n8n/workflow-ids.json`, substitutes placeholders, calls n8n REST API.
Requires: `N8N_BASE_URL`, `N8N_API_KEY` in `.env`.

**Auth token setup:**
1. Set `STORE_OS_API_TOKEN` in n8n Settings > Variables
2. Add `STORE_OS_API_TOKEN=<your-token>` to `.env`
3. All webhook calls must include `Authorization: Bearer <token>`

**Always distinguish:**
- **repo** = source of truth for workflow logic and JSON
- **n8n** = execution layer only

A successful git push does NOT update n8n. Always run `deploy-workflow.js` after pushing workflow JSON changes.
