# Gold Path — Definitive Reference

## What is the Gold Path?

The gold path is the single official end-to-end execution chain in store-os. It takes a minimal input payload, runs 17 sequential subworkflow calls through the orchestrator, and produces a fully configured Shopify store with products, pages, navigation, generated media, and theme sections written to a persistent draft theme.

A run is `GOLD_PATH_COMPLETE` only when:
- All analysis and strategy phases succeed
- Shopify catalog, pages, and navigation are written
- Media assets are generated (DALL-E-3, real images)
- Theme sections AND `templates/index.json` are written to the persistent draft theme
- Homepage is correctly assembled: sections wired in order, settings pre-populated
- CTA links use proper Shopify paths (`/collections/handle`, `/pages/handle`)
- Section→media and product→media mappings are confirmed

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
  ├─ 15. build-image-grounding      → image_grounding         (Phase 12, conditional on images)
  ├─ 16. build-media-assets         → media_generation        (Phase 9, DALL-E-3)
  ├─ 17. build-shopify-theme        → shopify_theme_deployment      (Phase 7B.3, Shopify writes)
  │
  ▼
GOLD_PATH_COMPLETE (all artifacts + media + mappings returned inline)
```

## Terminal Status

| Status | Meaning |
|--------|---------|
| `GOLD_PATH_COMPLETE` | Theme + media both fully succeeded |
| `GOLD_PATH_PARTIAL` | Theme or media had partial results (explicitly surfaced) |
| `PHASE_7B3_*` | Theme-specific status (DRY_RUN, BLOCKED, etc.) |

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
| 15 | build-image-grounding | `s5aWmVZcerBgc6kM` | executeWorkflowTrigger |
| 16 | build-media-assets | `krR10um8F1pT0miQ` | executeWorkflowTrigger |
| 17 | build-shopify-theme | `QG5ezHb3qKjKcvvn` | executeWorkflowTrigger |

### Not on gold path

| Workflow | n8n ID | Status |
|---------|--------|--------|
| resolve-runtime-config | `eTYCcPaj66bFYeXL` | Legacy standalone (config is inline in orchestrator) |

## Failure Semantics (Hardened)

| Phase | Success Criteria | On Failure |
|-------|-----------------|------------|
| 1–7A (steps 1–11) | `status == "SUCCESS"` | Chain halts, throws error |
| 7B.1 (step 12) | `status == COMPLETE \|\| PARTIAL` | FAILED halts chain |
| 7B.2 (step 13) | `status == COMPLETE \|\| PARTIAL` | FAILED halts chain |
| 10 (step 14) | `continueOnFail: true` | Chain continues, theme falls back to blueprint sections |
| 12 (step 15) | Conditional bypass | Skipped when no product images; errors caught by normalize node |
| 9 (step 16) | `status == COMPLETE \|\| PARTIAL` | PROMPTS_ONLY and FAILED halt chain |
| 7B.3 (step 17) | `status == COMPLETE \|\| PARTIAL` | DRY_RUN/BLOCKED/FAILED halt chain |

## Output Structure

The terminal node returns all artifacts plus:

```json
{
  "status": "GOLD_PATH_COMPLETE",
  "media_generation": {
    "status": "PHASE_9_COMPLETE",
    "mode": "full_generation",
    "images_generated": 9,
    "images_failed": 0,
    "images_skipped": 6,
    "total_assets": 15
  },
  "section_media_map": {
    "hero": [{ "asset_id": "...", "shot_type": "hero_wide", "status": "generated" }],
    "featured-collection": [{ "asset_id": "...", "shot_type": "studio_packshot", "status": "generated" }],
    "value-prop": [{ "asset_id": "...", "shot_type": "clean_feature", "status": "generated" }],
    "trust-social-proof": [{ "asset_id": "...", "shot_type": "detail_closeup", "status": "prompt_only" }]
  },
  "product_media_map": {
    "product-handle": [{ "asset_id": "...", "shot_type": "hero_wide", "status": "generated" }]
  },
  "shopify_theme_deployment": {
    "status": "PHASE_7B3_COMPLETE",
    "theme_id": "194584281428",
    "sections_written": 4,
    "assets_written": 3,
    "templates_written": 1,
    "written_files": [
      "sections/store-os-hero.liquid",
      "sections/store-os-value-prop.liquid",
      "sections/store-os-featured-collection.liquid",
      "sections/store-os-trust-social-proof.liquid",
      "assets/store-os-logo-placeholder.svg",
      "assets/store-os-favicon-placeholder.svg",
      "assets/store-os-hero-placeholder.svg",
      "templates/index.json"
    ]
  }
}
```

## Storefront Assembly Model

`build-shopify-theme` (Phase 7B.3) writes three categories of files to the draft theme:

### 1. Section Liquid Files (`sections/store-os-*.liquid`)
Each section is a complete Shopify OS 2.0 section with:
- HTML template using `{{ section.settings.* }}` variables
- Inline `{% schema %}` block with configurable settings and defaults
- Presets for theme editor discovery (add sections via editor)
- Block support for value-prop columns and trust signals

### 2. Homepage Template (`templates/index.json`)
This is the **critical wiring step**. Without it, sections exist but never appear on any page.
- References each section by type (`store-os-hero`, `store-os-featured-collection`, etc.)
- Pre-populates settings from theme_rules + blueprint hints
- Pre-populates blocks for value-prop and trust sections
- Controls section order deterministically from `section_stack`
- Binds generated media URLs where available

### 3. Asset Placeholders (`assets/store-os-*.svg`)
SVG placeholders for logo, favicon, and hero image (replaced by real assets in editor).

### Section Stack (determined by store pattern)
7 patterns × 4 section types → deterministic homepage layout:
- **hero** — background image, headline, CTA (always first)
- **featured-collection** — product grid from Shopify collection
- **value-prop** — column layout with configurable block count
- **trust-social-proof** — trust signals (evidence-led, social-proof-led, etc.)

### CTA Link Resolution
All CTA targets are resolved to proper Shopify paths:
- `collection-handle` → `/collections/collection-handle`
- `about` → `/pages/about`
- Already-prefixed paths (`/collections/...`, `http://...`) pass through unchanged

### Image Model Architecture
- **Generation:** DALL-E-3 (OpenAI) — photorealistic product images
- **Grounding:** Gemini 2.0 Flash (Google) — vision analysis of existing Shopify product images
- This is intentional dual-model architecture: Gemini understands, DALL-E generates
- Sequential pipeline: grounding → generation prompts → DALL-E renders

### What Shopify Renders
After a successful gold path run, the draft theme preview shows:
- **Homepage:** Hero section with CTA → featured collection grid → value prop columns → trust signals
- **Collection pages:** Default Dawn template (not yet customized)
- **Product pages:** Default Dawn template (not yet customized)
- **Navigation:** Main menu + footer menu with valid Shopify paths
- **Pages:** About, FAQ, etc. created with content (unpublished)

### What Remains on Dawn Defaults
- Collection/product/page templates (`templates/collection.json`, etc.)
- Layout file (`layout/theme.liquid`)
- CSS/JS assets (sections use inline styles)
- `config/settings_data.json` (global theme settings)

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

## Validated Runs

**Execution 14854 — 2026-04-09 — GOLD_PATH_PARTIAL (storefront assembly validated)**
- Theme deployment: PHASE_7B3_COMPLETE — 4 sections + 3 assets + templates/index.json, 0 errors
- Homepage template wired to 4 sections in deterministic order from theme_rules
- CTA links resolved to proper Shopify paths
- Section settings pre-populated, blocks pre-populated for value-prop and trust
- Media: 8/15 generated (1 DALL-E intermittent failure), 6 skipped
- Runtime: ~128s

**Execution 14820 — 2026-04-09 — GOLD_PATH_COMPLETE**
- 3 products × 5 shots = 15 media assets planned
- 9 images generated (DALL-E-3), 0 failed, 6 skipped (low-priority optional)
- 4 homepage sections mapped: hero, featured-collection, value-prop, trust-social-proof
- Theme: 4 sections + 3 assets written to theme 194584281428 (pre-storefront-assembly)
- Runtime: ~126s (17 subworkflow calls, 7 LLM calls, 9 DALL-E calls, 3 Shopify write phases)
