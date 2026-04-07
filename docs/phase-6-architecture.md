# Phase 6 — Offer Architecture / Content Strategy / GTM Plan

## Status

**PLANNED — not yet implemented.**

Phase 5 (`build-strategy-synthesis`) is the current terminal phase.
Phase 6 extends the chain with three parallel synthesis phases that transform strategic intelligence into actionable build inputs.

---

## Phase 6 Overview

```
strategy_synthesis (Phase 5 output)
        │
        ├──→ build-offer-architecture   → offer_architecture
        ├──→ build-content-strategy     → content_strategy
        └──→ build-gtm-plan             → gtm_plan
                │
                └──→ Phase 7: Store Build
                     (design-system, section-plan, theme-deployment)
```

---

## Input Dependencies

All three Phase 6 subworkflows consume `strategy_synthesis` as primary input, with supporting context from upstream artifacts.

### build-offer-architecture

| Input field | Source phase | Required |
|---|---|---|
| `strategy_synthesis.growth_thesis` | Phase 5 | ✓ |
| `strategy_synthesis.offer_implications` | Phase 5 | ✓ |
| `strategy_synthesis.moat_hypotheses` | Phase 5 | optional |
| `strategy_synthesis.opportunity_priorities` | Phase 5 | ✓ |
| `strategy_synthesis.risk_priorities` | Phase 5 | optional |
| `brand_positioning.value_proposition` | Phase 3 | ✓ |
| `market_intelligence.price_band_logic` | Phase 2 | optional |
| `normalized_intake_payload.price_positioning` | Phase 1 | ✓ |
| `normalized_intake_payload.vertical` | Phase 1 | ✓ |

### build-content-strategy

| Input field | Source phase | Required |
|---|---|---|
| `strategy_synthesis.messaging_priorities` | Phase 5 | ✓ |
| `strategy_synthesis.positioning_focus` | Phase 5 | ✓ |
| `strategy_synthesis.validation_questions` | Phase 5 | optional |
| `offer_architecture.core_offer` | Phase 6a | ✓ |
| `offer_architecture.offer_narrative` | Phase 6a | ✓ |
| `brand_positioning.messaging_pillars` | Phase 3 | ✓ |
| `brand_positioning.emotional_benefits` | Phase 3 | optional |
| `market_intelligence.trend_signals` | Phase 2 | optional |
| `normalized_intake_payload.seo_goal` | Phase 1 | ✓ |
| `normalized_intake_payload.aeo_goal` | Phase 1 | optional |
| `normalized_intake_payload.faq_intensity` | Phase 1 | optional |

### build-gtm-plan

| Input field | Source phase | Required |
|---|---|---|
| `strategy_synthesis.gtm_implications` | Phase 5 | ✓ |
| `strategy_synthesis.opportunity_priorities` | Phase 5 | ✓ |
| `strategy_synthesis.validation_questions` | Phase 5 | optional |
| `offer_architecture.pricing_logic` | Phase 6a | ✓ |
| `offer_architecture.upsell_paths` | Phase 6a | optional |
| `content_strategy.channel_strategy` | Phase 6b | ✓ |
| `market_intelligence.competition_surface` | Phase 2 | optional |
| `normalized_intake_payload.primary_market` | Phase 1 | ✓ |
| `normalized_intake_payload.vertical` | Phase 1 | ✓ |

---

## Expected Outputs

### offer_architecture
Schema: `schemas/phase-6/offer-architecture.schema.json`

| Field | Description |
|---|---|
| `core_offer` | Primary offer definition (headline, value prop, target buyer) |
| `pricing_logic` | Tier, anchor strategy, bulk pricing, subscription model |
| `bundle_opportunities` | Recommended product bundle combinations |
| `upsell_paths` | Upsell and cross-sell flow definitions |
| `offer_narrative` | Synthesis paragraph for content/GTM use |
| `offer_gaps` | Gaps requiring merchant input |
| `validation_questions` | Open questions before launch |

### content_strategy
Schema: `schemas/phase-6/content-strategy.schema.json`

| Field | Description |
|---|---|
| `messaging_hierarchy` | Primary + supporting messages + proof statements |
| `content_pillars` | Topic clusters with content types and target keywords |
| `page_strategy` | Homepage, collection, product, blog direction |
| `seo_content_plan` | Keyword clusters, long-tail, featured snippet targets |
| `editorial_voice` | Tone, style rules, vocabulary dos/don'ts |

### gtm_plan
Schema: `schemas/phase-6/gtm-plan.schema.json`

| Field | Description |
|---|---|
| `launch_sequence` | Phase 1/2/3 launch plan with objectives and success metrics |
| `channel_strategy` | Prioritised channels (primary/secondary/exploratory) |
| `acquisition_priorities` | Top tactics with timelines and owners |
| `gtm_narrative` | Executive summary |
| `kpis` | Launch KPIs with targets and timeframes |

---

## Node Contracts

### build-offer-architecture
```
Pattern: 5-node (Subworkflow Trigger → Validate Inputs → Build LLM Prompt → LLM Synthesis → Parse Validate Write)
Trigger: n8n-nodes-base.executeWorkflow (from orchestrate-phase1)
Input:   strategy_synthesis + brand_positioning + market_intelligence + runtime_config
Output:  offer_architecture (inline, cloud mode) | offer-architecture.json (self-hosted)
LLM:     gpt-4o-mini (dev) / gpt-4o (staging+)
Cloud:   fully compatible (inline output, no AJV)
```

### build-content-strategy
```
Pattern: 5-node
Trigger: n8n-nodes-base.executeWorkflow
Input:   strategy_synthesis + offer_architecture + brand_positioning + runtime_config
Output:  content_strategy (inline) | content-strategy.json (self-hosted)
Cloud:   fully compatible
```

### build-gtm-plan
```
Pattern: 5-node
Trigger: n8n-nodes-base.executeWorkflow
Input:   strategy_synthesis + offer_architecture + content_strategy + runtime_config
Output:  gtm_plan (inline) | gtm-plan.json (self-hosted)
Cloud:   fully compatible
Note:    Must run after both build-offer-architecture AND build-content-strategy
```

---

## Orchestrator Extension

When Phase 6 is implemented, `orchestrate-phase1` must be extended with:

```
Phase 5 Complete
    │
    ├── Prepare Offer Architecture Input
    │   └── Run build-offer-architecture
    │       └── Offer Architecture Success? → Phase 6a Complete | Halt
    │
    ├── Prepare Content Strategy Input (after 6a)
    │   └── Run build-content-strategy
    │       └── Content Strategy Success? → Phase 6b Complete | Halt
    │
    └── Prepare GTM Plan Input (after 6a + 6b)
        └── Run build-gtm-plan
            └── GTM Plan Success? → Phase 6 Complete | Halt
```

**Bridge nodes required:**
- `Prepare Offer Architecture Input` — assemble input from Phase 5 output
- `Prepare Content Strategy Input` — add offer_architecture to chain
- `Prepare GTM Plan Input` — add content_strategy to chain

**New `workflow-ids.json` entries needed:**
- `build-offer-architecture`
- `build-content-strategy`
- `build-gtm-plan`

---

## Phase 6 → Phase 7 Handoff

Phase 7 (Store Build) receives the combined output of Phase 6:

```json
{
  "strategy_synthesis":   "...",
  "offer_architecture":   "...",
  "content_strategy":     "...",
  "gtm_plan":             "...",
  "brand_positioning":    "...",
  "runtime_config":       "..."
}
```

Phase 7 uses this to drive:
- `build-design-system` — visual identity tokens
- `build-section-plan` — homepage + PDP section structure
- `build-product-content` — AI-generated product descriptions
- `build-page-content` — editorial pages (About, FAQ, Blog)
- `build-deployment-manifest` — Shopify theme deployment manifest

---

## Implementation Checklist

- [x] `schemas/phase-6/offer-architecture.schema.json` ✓
- [x] `schemas/phase-6/content-strategy.schema.json` ✓
- [x] `schemas/phase-6/gtm-plan.schema.json` ✓
- [ ] `workflows/contracts/build-offer-architecture.contract.json`
- [ ] `workflows/contracts/build-content-strategy.contract.json`
- [ ] `workflows/contracts/build-gtm-plan.contract.json`
- [x] `workflows/n8n/build-offer-architecture.n8n.json` ✓ **EXECUTABLE** (deployed: `aEkB4Bwp8pN57JB9`, activated 2026-04-07)
- [x] `workflows/n8n/build-content-strategy.n8n.json` ✓ **EXECUTABLE** (deployed: `O4KhaCgA0itCazMu`, activated 2026-04-07)
- [x] `workflows/n8n/build-gtm-plan.n8n.json` ✓ **EXECUTABLE** (deployed: `8aCUkx6RlfdklCBH`, activated 2026-04-07)
- [x] Extend `orchestrate-phase1` with Phase 6a nodes (+5 nodes; total: 40)
- [x] Extend `orchestrate-phase1` with Phase 6b nodes (+5 nodes; total: 45)
- [x] Extend `orchestrate-phase1` with Phase 6c nodes (+5 nodes; total: 50)
- [x] `workflow-ids.json`: `build-offer-architecture` ID recorded
- [x] `workflow-ids.json`: `build-content-strategy` ID recorded
- [x] `workflow-ids.json`: `build-gtm-plan` ID recorded (`8aCUkx6RlfdklCBH`)
- [x] `docs/runtime-status.md` updated

## Phase 6a Status (2026-04-07)

**EXECUTABLE.** `build-offer-architecture` is deployed, activated, and end-to-end confirmed.

Smoke test: `PHASE_6A_COMPLETE` — HTTP 200 — ~77s — cloud mode
Offer: "Your one-stop shop for reliable tech accessories tailored for SMEs" | mass-premium | 1 bundle | 1 upsell path

## Phase 6b Status (2026-04-07)

**EXECUTABLE.** `build-content-strategy` is deployed, activated, and end-to-end confirmed.

Smoke test: `PHASE_6B_COMPLETE` — HTTP 200 — ~81-104s — cloud mode
Primary message: "SuppliedTech is your trusted partner for quality tech accessories tailored for SMEs."
Tone: Technical-trustworthy | Pillars: 2 | Keyword clusters: 2 | FAQ clusters: 2

## Phase 6c Status (2026-04-07)

**EXECUTABLE.** `build-gtm-plan` is deployed, activated, and end-to-end confirmed.

Smoke test: `PHASE_6C_COMPLETE` — HTTP 200 — ~83s — cloud mode
GTM narrative: "SuppliedTech's GTM plan focuses on positioning the store as the trusted partner for SMEs seeking high-quality tech solutions."
Launch phases: 3 | Channels: 2 (Organic Search/SEO, Email Marketing) | KPIs: 3

## Architecture Note: Artifact Forwarding Pattern

Subworkflows in store-os only return their immediate output artifact + runtime_config. They do NOT forward upstream artifacts. All Phase 6 bridge nodes must explicitly source upstream artifacts using `$node[...]` references:

| Bridge node | `offer_architecture` | `strategy_synthesis` | `brand_positioning` etc. |
|---|---|---|---|
| `Prepare Offer Architecture Input` | — | — | `$node['Prepare Strategy Synthesis Input']` |
| `Prepare Content Strategy Input` | `$node['Phase 6a Complete']` | `$node['Phase 5 Complete']` | `$node['Prepare Strategy Synthesis Input']` |
| `Prepare GTM Plan Input` (planned) | `$node['Phase 6a Complete']` | `$node['Phase 5 Complete']` | `$node['Prepare Strategy Synthesis Input']` + `$node['Phase 6b Complete']` for `content_strategy` |
