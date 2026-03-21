# Phase 13 — Market Intelligence Runtime

**Status**: Implemented — executable n8n workflow created.
**Date**: 2026-03-21
**Scope**: `build-market-intelligence` subworkflow + orchestrator extension through Phase 2 Complete.

---

## What Was Built

Phase 13 adds the first LLM synthesis step to the executable runtime chain:

```
resolve-runtime-config
  → intake-store-input
  → import-shopify-data
  → build-store-profile          [Phase 12]
  → build-market-intelligence    [Phase 13 — new]
```

### New files

| File | Purpose |
|---|---|
| `workflows/n8n/build-market-intelligence.n8n.json` | Executable n8n subworkflow — market intelligence synthesis |
| `docs/phase-13-market-intelligence-runtime.md` | This document |

### Modified files

| File | Change |
|---|---|
| `workflows/n8n/orchestrate-phase1.n8n.json` | Extended chain: Phase 1 Complete now passes forward data; 5 new nodes added through Phase 2 Complete |

---

## build-market-intelligence Workflow

### Node structure

| # | Node | Type | Purpose |
|---|---|---|---|
| 1 | Subworkflow Trigger | executeWorkflowTrigger | Receives input from orchestrator |
| 2 | Validate and Extract Signals | Code | Validates inputs; extracts bounded market signals |
| 3 | Build LLM Prompt | Code | Assembles structured prompt with evidence boundary |
| 4 | LLM Synthesis: Market Analysis | OpenAI (chat, gpt-4o) | Calls OpenAI; temp=0.3, max_tokens=2000 |
| 5 | Parse Normalize and Write | Code | Parses LLM JSON; validates structure; writes artifact |

### Input contract

```json
{
  "project_id": "string",
  "store_profile": { "store_id", "vertical", "price_positioning", "primary_market", "store_type", "catalog_type", ... },
  "normalized_intake_payload": { "seo_goal", "aeo_goal", "competitor_urls", ... },
  "runtime_config": { "llm_model", "ajv_schema_path", "project_root", "cloud_mode", ... },
  "shopify_import": "object — optional, provides catalog context"
}
```

### Output contract

```json
{
  "project_id": "string",
  "artifact_name": "market-intelligence",
  "artifact_path": "string | null",
  "market_intelligence": { ... },
  "runtime_config": { ... },
  "status": "SUCCESS",
  "cloud_mode": "boolean",
  "cloud_warnings": ["string"],
  "notes": ["string"]
}
```

---

## Cloud Compatibility

### What runs in both modes

| Component | Status |
|---|---|
| Input validation and signal extraction | Cloud-compatible |
| LLM prompt assembly | Cloud-compatible |
| OpenAI API call (via n8n credential) | Cloud-compatible |
| LLM response parsing and normalization | Cloud-compatible |
| Inline field validation (enum, required arrays, structure) | Cloud-compatible |

### Self-hosted only

| Component | Why |
|---|---|
| AJV schema validation against `market-intelligence.schema.json` | `require('fs')` and schema file access blocked in n8n Cloud |
| Atomic artifact write (`market-intelligence.json`) | No local filesystem in n8n Cloud |
| Quarantine on schema failure | No local filesystem in n8n Cloud |
| Checkpoint update | No local filesystem in n8n Cloud |

### Cloud fallback behavior

When `cloudMode` is true:
- `market_intelligence` is returned inline in the workflow output
- `artifact_path` is `null`
- `cloud_mode: true` and `cloud_warnings: [...]` are set in output
- A lightweight inline validation still runs (required fields, enum checks, structure) — AJV is skipped

### Data flow changes for cloud mode

In cloud mode, `shopify_import` (catalog context) is never written to disk. The orchestrator passes it inline:

1. `import-shopify-data` includes `shopify_import` in output when `cloudMode` is true
2. `orchestrate-phase1 — Phase 1 Complete` carries `shopify_import` forward alongside `store_profile` and `normalized_intake_payload`
3. `Prepare Market Intel Input` bridge node passes all three to `build-market-intelligence`
4. `build-market-intelligence — Validate and Extract Signals` reads `shopify_import` from the trigger input

---

## Orchestrator Changes (orchestrate-phase1)

Five new nodes were added after "Phase 1 Complete":

| Node | Purpose |
|---|---|
| Phase 1 Complete *(modified)* | Now passes `runtime_config`, `store_profile`, `normalized_intake_payload`, and `shopify_import` (cloud) forward |
| Prepare Market Intel Input | Bridge: assembles `build-market-intelligence` input payload |
| Run build-market-intelligence | Execute Workflow — calls the subworkflow |
| Market Intel Success? | IF node: routes on `status == SUCCESS` |
| Halt - Market Intel Failed | Halts chain on failure |
| Phase 2 Complete | Terminal node: assembles summary; carries `market_intelligence` inline in cloud mode |

### New `intakePayloadExample` smoke_test path

No changes needed to the existing intake payload example. The smoke_test_config remains the same — it carries through the chain. The OpenAI credential must be configured in n8n separately (not in `smoke_test_config`).

---

## Evidence Boundary

This workflow synthesizes from **internal signals only**:

- `store_profile.vertical`, `price_positioning`, `primary_market`, `catalog_type`, `brand_maturity`
- `intake.seo_goal`, `aeo_goal`, `knowledge_content_priority`, `faq_intensity`, `competitor_urls` (as labels only)
- `shopify_import.raw_products[*].product_type`, `.vendor`, `raw_collections[*].title` (if available)

**Not used** (not available in Phase 13):
- Live search volume data
- Real keyword research APIs
- Live competitor page analysis
- External market research data
- Google Search Console data

All outputs are labeled `SYNTHESIS-ONLY` in the `notes` field.

---

## Setup Steps

### n8n Cloud (smoke test)

1. Import all 5 n8n workflows (`intake-store-input`, `import-shopify-data`, `build-store-profile`, `build-market-intelligence`, `orchestrate-phase1`)
2. In `build-market-intelligence`: replace `REPLACE_WITH_N8N_OPENAI_CREDENTIAL_ID` with your OpenAI credential ID
3. In `orchestrate-phase1`: replace all 4 `REPLACE_WITH_*_WORKFLOW_ID` placeholders with actual workflow IDs
4. Configure Shopify API credential in n8n
5. Trigger `orchestrate-phase1` with the standard intake payload + `smoke_test_config`

### Self-hosted

Same as above, plus:
- Set `STORE_OS_AJV_SCHEMA_PATH` pointing to the `schemas/` directory
- Ensure `ajv@8` is available in n8n's `node_modules` (tries `ajv/dist/2020` first, falls back to `ajv`)
- `market-intelligence.json` will be written atomically to `{project_root}/{project_id}/market-intelligence.json`

---

## What Remains Partial

| Item | Status | Notes |
|---|---|---|
| AJV schema validation | Self-hosted only | Blocked in n8n Cloud (no fs access) |
| Artifact persistence | Self-hosted only | Blocked in n8n Cloud |
| Checkpoint update | Self-hosted only | Blocked in n8n Cloud |
| Dynamic model selection | Static (`gpt-4o`) | `chatModel` is hardcoded; update node if a different model is needed |
| build-brand-positioning | Not implemented | Phase 3+ |
| build-competitor-clusters | Not implemented | Phase 3+ |
| Pagination for large catalogs | Not implemented | `import-shopify-data` fetches max 250 products |

---

## Known Assumptions

1. OpenAI credential is configured in n8n with `openAiApi` credential type.
2. GPT-4o is the assumed model. Temperature 0.3 is set for deterministic structured output.
3. `shopify_import` is optional — the workflow degrades gracefully without catalog context (market_subcategories omitted).
4. `competitor_urls` from intake are used as archetype labeling hints only — not crawled.
5. All LLM outputs require human review before driving strategic decisions.
6. `media_opportunities` is intentionally not synthesized here — deferred to build-media-plan.
