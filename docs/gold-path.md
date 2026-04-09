# Gold Path — Definitive Reference

## What is the Gold Path?

The gold path is the single official end-to-end execution chain in store-os. It takes a minimal input payload, runs 15 sequential subworkflow calls through the orchestrator, and produces a fully configured Shopify store with products, pages, navigation, and theme sections written to a persistent draft theme.

```
INPUT (golden-input.json)
  │
  ▼
orchestrate-phase1 (webhook or manual trigger)
  │
  ├─ resolve-runtime-config (inline Code node)
  ├─ validate-orchestrate-input
  ├─ respond-to-webhook (HTTP 202)
  │
  ├─ 1.  intake-store-input         → normalized_intake_payload
  ├─ 2.  import-shopify-data        → shopify_import
  ├─ 3.  build-store-profile        → store_profile           (Phase 1)
  ├─ 4.  build-market-intelligence  → market_intelligence     (Phase 2, LLM)
  ├─ 5.  build-brand-positioning    → brand_positioning       (Phase 3, LLM)
  ├─ 6.  build-competitor-clusters  → competitor_clusters     (Phase 4, LLM)
  ├─ 7.  build-strategy-synthesis   → strategy_synthesis      (Phase 5, LLM)
  ├─ 8.  build-offer-architecture   → offer_architecture      (Phase 6a, LLM)
  ├─ 9.  build-content-strategy     → content_strategy        (Phase 6b, LLM)
  ├─ 10. build-gtm-plan            → gtm_plan                (Phase 6c, LLM)
  ├─ 11. build-store-blueprint      → store_blueprint         (Phase 7A, LLM)
  ├─ 12. build-shopify-catalog      → shopify_catalog_deployment    (Phase 7B.1, Shopify writes)
  ├─ 13. build-shopify-pages-nav    → shopify_pages_nav_deployment  (Phase 7B.2, Shopify writes)
  ├─ 14. build-theme-rules          → theme_rules             (Phase 10, deterministic)
  ├─ 15. build-shopify-theme        → shopify_theme_deployment      (Phase 7B.3, Shopify writes)
  │
  ▼
PHASE_7B3_COMPLETE (all 13 artifacts returned inline)
```

## Workflow IDs

All IDs are canonical and tracked in `workflows/n8n/workflow-ids.json`.

| # | Workflow | n8n ID | Trigger |
|---|---------|--------|---------|
| — | orchestrate-phase1 | `SCRLaQ9jFVo12zNR` | webhook + manual |
| 1 | intake-store-input | `0k7UOXQww8hkavdc` | executeWorkflowTrigger |
| 2 | import-shopify-data | `z5ERPSJ9hibBbu70` | executeWorkflowTrigger |
| 3 | build-store-profile | `5Lc1BPZljbIAkuPI` | executeWorkflowTrigger |
| 4 | build-market-intelligence | `YAZ26MzB1Z6TMfZ8` | executeWorkflowTrigger |
| 5 | build-brand-positioning | `eUXnAlZ0gmv6qOhL` | executeWorkflowTrigger |
| 6 | build-competitor-clusters | `jaCEHCKyJHesH1w6` | executeWorkflowTrigger |
| 7 | build-strategy-synthesis | `OLwntMMSgSElgwmU` | executeWorkflowTrigger |
| 8 | build-offer-architecture | `aEkB4Bwp8pN57JB9` | executeWorkflowTrigger |
| 9 | build-content-strategy | `O4KhaCgA0itCazMu` | executeWorkflowTrigger |
| 10 | build-gtm-plan | `8aCUkx6RlfdklCBH` | executeWorkflowTrigger |
| 11 | build-store-blueprint | `j1JVNqqyidlKUIHX` | executeWorkflowTrigger |
| 12 | build-shopify-catalog | `oZE0Z9fb4ojnKiDd` | executeWorkflowTrigger |
| 13 | build-shopify-pages-navigation | `LADq8PuMRuswIxJa` | executeWorkflowTrigger |
| 14 | build-theme-rules | `KzFBogj7kusXQqlp` | executeWorkflowTrigger |
| 15 | build-shopify-theme | `QG5ezHb3qKjKcvvn` | executeWorkflowTrigger |

### Standalone (not yet in orchestrator chain)

| Workflow | n8n ID | Purpose |
|---------|--------|---------|
| build-media-assets | `krR10um8F1pT0miQ` | Phase 9 — image generation (DALL-E-3) |
| build-image-grounding | `s5aWmVZcerBgc6kM` | Phase 12 — Gemini Vision grounding |
| resolve-runtime-config | `pKr1kcFlwSqFMkGm` | Legacy standalone (config is inline in orchestrator) |

## Failure Semantics

| Phase | Success Criteria | On Failure |
|-------|-----------------|------------|
| 1–7A (steps 1–11) | `status == "SUCCESS"` | Chain halts, throws error |
| 7B.1 (step 12) | `status != "PHASE_7B1_FAILED"` | PARTIAL proceeds forward |
| 7B.2 (step 13) | `status != "PHASE_7B2_FAILED"` | PARTIAL proceeds forward |
| 10 (step 14) | `continueOnFail: true` | Chain continues, theme falls back to blueprint sections |
| 7B.3 (step 15) | `status != "PHASE_7B3_FAILED"` | DRY_RUN/BLOCKED/PARTIAL proceed forward |

**Known risk:** Phases 7B.1–7B.3 use `!= FAILED` instead of `== COMPLETE`. This means PARTIAL deployments are treated as success by the orchestrator. The caller must inspect `shopify_*_deployment.status` for actual deployment results.

## Theme Target

- **Theme ID:** `194584281428`
- **Theme Name:** `store-os // system-draft`
- **Role:** `unpublished` (draft — production theme never modified)
- **Configured in:** `test-data/golden-input.json`, `workflows/n8n/workflow-ids.json`

Safety model in `build-shopify-theme`:
1. Explicit `shopify_theme_id` → use that theme (warns if role=main)
2. Else auto-select most recent unpublished theme
3. Else `PHASE_7B3_BLOCKED` (refuses to auto-target active theme)

All writes require `allow_theme_writes: true`. Default is dry-run.

## How to Run

```bash
# Full gold path (async, recommended)
node scripts/run-orchestrator.js --input test-data/golden-input.json

# Deploy a workflow from repo to n8n
node scripts/deploy-workflow.js <workflow-name>

# Poll a running execution
node scripts/poll-execution.js <execution_id>

# Inspect run history
node scripts/inspect-run.js --latest
```

## Shopify API Configuration

- **API version:** `2026-01`
- **Credential:** `shopifyOAuth2Api` — `CO1JGlTR5RJ9Cs6x`
- **Shop:** `8zw111-cj.myshopify.com`
- **Propagation:** `runtime_config.shopify_shop_url` and `runtime_config.shopify_api_version` (no `$env` dependencies)

## What is NOT on the Gold Path

- `resolve-runtime-config` standalone workflow (legacy — config is inline in orchestrator)
- `build-media-assets` (Phase 9 — validated standalone, not yet in orchestrator)
- `build-image-grounding` (Phase 12 — validated standalone, not yet in orchestrator)
- Any `_test-*` or `ST-*` workflows (archived or legacy)
- `validate-*.js` scripts (dev utilities, not production orchestration)
