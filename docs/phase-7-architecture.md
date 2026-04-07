# Phase 7A — Store Blueprint Runtime

## Status

**EXECUTABLE.** `build-store-blueprint` is deployed, activated, and end-to-end confirmed.

Smoke test: `PHASE_7A_COMPLETE` — n8n execution 14361 — status: success — ~117s — cloud mode — async model
Async response: HTTP 202 in ~2s → CLI polled to completion. Cloudflare 100s timeout resolved.

---

## Phase 7A Overview

```
gtm_plan (Phase 6c output)
        │
        └──→ build-store-blueprint   → store_blueprint
                │
                └──→ Phase 7B: Store Build
                     (Shopify API deployment — NOT YET IMPLEMENTED)
```

---

## Input Dependencies

### build-store-blueprint

| Input field | Source phase | Required |
|---|---|---|
| `strategy_synthesis.growth_thesis` | Phase 5 | ✓ |
| `strategy_synthesis.positioning_focus` | Phase 5 | ✓ |
| `offer_architecture.core_offer` | Phase 6a | ✓ |
| `offer_architecture.pricing_logic` | Phase 6a | ✓ |
| `offer_architecture.bundle_opportunities` | Phase 6a | optional |
| `content_strategy.messaging_hierarchy` | Phase 6b | ✓ |
| `content_strategy.content_pillars` | Phase 6b | ✓ |
| `content_strategy.seo_content_plan` | Phase 6b | optional |
| `gtm_plan.gtm_narrative` | Phase 6c | ✓ |
| `gtm_plan.channel_strategy` | Phase 6c | ✓ |

---

## Expected Output: store_blueprint

Schema: `schemas/phase-7/store-blueprint.schema.json`

| Field | Description |
|---|---|
| `products` | 3-6 planned products with title, product_type, handle, price_range, tags, collections |
| `collections` | 2-4 Shopify collections with handle, title, SEO rationale, sort_order |
| `pages` | About, FAQ, Contact and other editorial pages with purpose and content direction |
| `navigation` | Main menu and footer menu with structured link items |
| `theme_sections` | Homepage and landing page section plan (hero, featured-collection, trust, etc.) |
| `assets` | Logo, favicon, hero-image and other required brand assets with specs |
| `blueprint_narrative` | Executive summary of the store structure |
| `open_questions` | Decisions requiring merchant input before build |

---

## Node Contract

### build-store-blueprint

```
Pattern: 5-node (Subworkflow Trigger → Validate Inputs → Build LLM Prompt → LLM Synthesis → Parse Validate Write)
Trigger: n8n-nodes-base.executeWorkflowTrigger
Input:   strategy_synthesis + offer_architecture + content_strategy + gtm_plan + runtime_config
Output:  store_blueprint (inline, cloud mode) | store-blueprint.json (self-hosted)
LLM:     gpt-4o (cloud + staging), temperature: 0.3, maxTokens: 4000
Cloud:   fully compatible (inline output, no AJV)
Deployed: j1JVNqqyidlKUIHX (activated 2026-04-07)
```

---

## Orchestrator Extension

`orchestrate-phase1` Phase 7A bridge nodes (5 nodes added; total: 55):

```
Phase 6c Complete
    │
    └── Prepare Store Blueprint Input
        └── Run build-store-blueprint
            └── Store Blueprint Success? (IF node)
                ├── [true]  Phase 7A Complete
                └── [false] Halt - Store Blueprint Failed
```

**Artifact forwarding:** `Prepare Store Blueprint Input` sources:
- `strategy_synthesis` from `$node['Phase 5 Complete']`
- `offer_architecture` from `$node['Phase 6a Complete']`
- `content_strategy` from `$node['Phase 6b Complete']`
- `gtm_plan` from `$input.first().json` (Phase 6c Complete)

**`Phase 7A Complete`** returns the full 9-artifact chain inline:
`store_profile`, `market_intelligence`, `brand_positioning`, `competitor_clusters`,
`strategy_synthesis`, `offer_architecture`, `content_strategy`, `gtm_plan`, `store_blueprint`

---

## Async Execution Model

**Previous issue:** The full Phase 1–7A chain runs for ~117s. Cloudflare enforces a 100s timeout on webhook HTTP responses, returning HTTP 524 before the response arrived.

**Resolution (feature/async-execution-model):** The orchestrator uses `responseMode: "responseNode"`. The execution path is:

```
Webhook Trigger → Resolve Runtime Config → Prepare Async Response
    → Respond to Webhook  ← HTTP 202 sent here (~2s)
    → Validate Orchestrate Input → … → Phase 7A Complete
```

The caller receives HTTP 202 with `{ execution_id, status: "started" }` within ~2 seconds. The full chain continues asynchronously. Results are retrieved by polling:

```
GET /api/v1/executions/{execution_id}?includeData=true
```

**CLI support:**
```bash
# Full run (trigger + poll until complete):
node scripts/run-orchestrator.js --input test-data/golden-input.json

# Trigger only:
node scripts/run-orchestrator.js --input test-data/golden-input.json --no-poll

# Poll a running execution:
node scripts/poll-execution.js <execution_id>
```

See `docs/async-execution-model.md` for full lifecycle documentation.

---

## Implementation Checklist

- [x] `schemas/phase-7/store-blueprint.schema.json` ✓
- [ ] `workflows/contracts/build-store-blueprint.contract.json`
- [x] `workflows/n8n/build-store-blueprint.n8n.json` ✓ **EXECUTABLE** (deployed: `j1JVNqqyidlKUIHX`, activated 2026-04-07)
- [x] Extend `orchestrate-phase1` with Phase 7A nodes (+5 nodes; total: 55)
- [x] `workflow-ids.json`: `build-store-blueprint` ID recorded (`j1JVNqqyidlKUIHX`)
- [x] `docs/runtime-status.md` updated
- [x] Cloud timeout resolved — async model deployed (`feature/async-execution-model`)
- [x] `scripts/run-orchestrator.js` updated — async trigger + poll
- [x] `scripts/poll-execution.js` added — standalone poller
- [x] `docs/async-execution-model.md` created

---

## Phase 7B Planned Scope (NOT YET IMPLEMENTED)

Phase 7B will consume `store_blueprint` and make live Shopify API calls:

- `build-shopify-products` — create/update products and variants
- `build-shopify-collections` — create/update smart and custom collections
- `build-shopify-pages` — publish About, FAQ, Contact pages
- `build-shopify-navigation` — deploy menus
- `build-shopify-theme` — configure and publish theme sections

Phase 7B requires Shopify credentials and a live store — out of scope for Phase 7A.
