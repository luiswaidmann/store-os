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

- [ ] `schemas/phase-6/offer-architecture.schema.json` ✓ (created)
- [ ] `schemas/phase-6/content-strategy.schema.json` ✓ (created)
- [ ] `schemas/phase-6/gtm-plan.schema.json` ✓ (created)
- [ ] `workflows/contracts/build-offer-architecture.contract.json`
- [ ] `workflows/contracts/build-content-strategy.contract.json`
- [ ] `workflows/contracts/build-gtm-plan.contract.json`
- [ ] `workflows/n8n/build-offer-architecture.n8n.json`
- [ ] `workflows/n8n/build-content-strategy.n8n.json`
- [ ] `workflows/n8n/build-gtm-plan.n8n.json`
- [ ] Extend `orchestrate-phase1` with Phase 6 nodes (+15 nodes)
- [ ] Update `workflow-ids.json` with 3 new IDs
- [ ] Update `docs/runtime-status.md`
