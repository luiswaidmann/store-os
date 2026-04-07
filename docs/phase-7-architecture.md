# Phase 7A — Store Blueprint Runtime

## Status

**EXECUTABLE.** `build-store-blueprint` is deployed, activated, and end-to-end confirmed.

Smoke test: `PHASE_7A_COMPLETE` — n8n execution status: success — ~128s — cloud mode
Note: Cloudflare webhook 100s timeout is hit for Phase 7A chains. The execution completes successfully in n8n (confirmed via API: `finished: True`). See Cloud Timeout Constraint below.

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

## Cloud Timeout Constraint

**Issue:** The full Phase 1–7A chain runs for ~120-130s. Cloudflare (n8n Cloud's CDN) enforces a 100s timeout on webhook HTTP responses, returning HTTP 524 before the response arrives.

**Impact:** The webhook caller receives a 524 error. The n8n execution itself **completes successfully** (`finished: True`, `status: success`).

**Current mitigation:** Verified via n8n API (`GET /api/v1/executions/{id}`) — `PHASE_7A_COMPLETE` confirmed in `lastNodeExecuted` and `Phase 7A Complete` output data.

**Future remedy:** Use n8n's "Respond to Webhook" node immediately after Phase 5/6 and continue Phase 7A in a background execution, or adopt a polling/callback model for Phase 7+.

---

## Implementation Checklist

- [x] `schemas/phase-7/store-blueprint.schema.json` ✓
- [ ] `workflows/contracts/build-store-blueprint.contract.json`
- [x] `workflows/n8n/build-store-blueprint.n8n.json` ✓ **EXECUTABLE** (deployed: `j1JVNqqyidlKUIHX`, activated 2026-04-07)
- [x] Extend `orchestrate-phase1` with Phase 7A nodes (+5 nodes; total: 55)
- [x] `workflow-ids.json`: `build-store-blueprint` ID recorded (`j1JVNqqyidlKUIHX`)
- [x] `docs/runtime-status.md` updated
- [ ] Cloud timeout resolved (Respond-to-Webhook pattern or polling model)

---

## Phase 7B Planned Scope (NOT YET IMPLEMENTED)

Phase 7B will consume `store_blueprint` and make live Shopify API calls:

- `build-shopify-products` — create/update products and variants
- `build-shopify-collections` — create/update smart and custom collections
- `build-shopify-pages` — publish About, FAQ, Contact pages
- `build-shopify-navigation` — deploy menus
- `build-shopify-theme` — configure and publish theme sections

Phase 7B requires Shopify credentials and a live store — out of scope for Phase 7A.
