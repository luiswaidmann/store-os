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

**Date:** 2026-04-07
**Method:** Webhook POST via `scripts/run-orchestrator.js`
**Input:** `test-data/golden-input.json` (project: `suppliedtech`)
**Result:** `PHASE_5_COMPLETE` — HTTP 200, ~90s, cloud mode
**Chain:** All 8 nodes succeeded (Webhook Trigger → Phase 5 Complete)
**Artifacts returned:** `store_profile`, `market_intelligence`, `brand_positioning`, `competitor_clusters`, `strategy_synthesis`

## Current confirmed executable chain

The currently confirmed n8n Cloud smoke-test path (post `feature/phase-16-strategy-synthesis-runtime`) is:

- `resolve-runtime-config`
- `intake-store-input`
- `import-shopify-data`
- `build-store-profile`
- `build-market-intelligence`
- `build-brand-positioning`
- `build-competitor-clusters`
- `build-strategy-synthesis` ← **NEW** (Phase 16, `feature/phase-16-strategy-synthesis-runtime`)

## Current confirmed inline outputs

The chain currently returns these runtime artifacts inline in cloud mode:

- `store_profile`
- `market_intelligence`
- `brand_positioning`
- `competitor_clusters`
- `strategy_synthesis` ← **NEW**

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

### Via webhook (API / programmatic)

```bash
curl -X POST https://luwai.app.n8n.cloud/webhook/orchestrate-phase1 \
  -H "Authorization: Bearer <STORE_OS_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d @test-data/golden-input.json
```

### Via CLI wrapper

```bash
# Set in .env: N8N_BASE_URL, STORE_OS_API_TOKEN
node scripts/run-orchestrator.js --input test-data/golden-input.json

# Dry run (validate payload locally, no request):
node scripts/run-orchestrator.js --input test-data/golden-input.json --dry-run

# Silent (output raw JSON only):
node scripts/run-orchestrator.js --input test-data/golden-input.json --silent
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
  Validate Orchestrate Input ← fast-fail schema check
      │
  ┌── PHASE CHAIN ────────────────────────────────────────┐
  │  intake-store-input → import-shopify-data             │
  │  build-store-profile          (Phase 1)               │
  │  build-market-intelligence    (Phase 2)               │
  │  build-brand-positioning      (Phase 3)               │
  │  build-competitor-clusters    (Phase 4)               │
  │  build-strategy-synthesis     (Phase 5) ← TERMINAL    │
  └───────────────────────────────────────────────────────┘
      │
  Phase 5 Complete → returns inline artifacts + metadata
      │
OUTPUT
  status, execution_id, started_at, completed_at, duration_ms
  phase_receipt (per-phase status)
  output_summary (opportunity/risk/moat counts)
  strategy_synthesis (full artifact inline)
  store_profile, market_intelligence, brand_positioning,
  competitor_clusters (all inline in cloud mode)
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

Next feature branch: **Phase 6 implementation**

- `build-offer-architecture` — uses `growth_thesis`, `offer_implications`, `moat_hypotheses`
- `build-content-strategy` — uses `messaging_priorities`, `positioning_focus`
- `build-gtm-plan` — uses `gtm_implications`, `opportunity_priorities`, `validation_questions`

See `docs/phase-6-architecture.md` for full input/output contracts and implementation checklist.

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
