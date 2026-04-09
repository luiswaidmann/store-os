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

**GOLD_PATH_PARTIAL — Schema Name Fix Validated (Execution 14888):**
**Date:** 2026-04-09
**Method:** `node scripts/run-orchestrator.js --input test-data/golden-input.json` (async)
**Terminal status:** `GOLD_PATH_PARTIAL` — theme fully complete, media absent (grounding/DALL-E skipped this run)
**Theme deployment:** PHASE_7B3_COMPLETE — 4 sections + 3 assets written to theme 194584281428, **0 errors**, **0 warnings**
**Schema names:** store-os: Hero (14), store-os: Value Prop (20), store-os: Products (18), store-os: Trust Signals (23) — all ≤ 25 chars ✓
**Sections written:** hero.liquid, value-prop.liquid, featured-collection.liquid, trust-social-proof.liquid
**Assets written:** logo-placeholder.svg, favicon-placeholder.svg, hero-placeholder.svg
**Runtime:** ~97s

**GOLD_PATH_PARTIAL — Storefront Assembly Validated (Execution 14854):**
**Date:** 2026-04-09
**Method:** `node scripts/run-orchestrator.js --input test-data/golden-input.json` (async)
**Terminal status:** `GOLD_PATH_PARTIAL` — theme fully complete, media partial (1 DALL-E image failed)
**Chain:** intake → analysis (7 LLM phases) → Shopify writes → theme-rules → grounding → media (8 DALL-E-3 images) → theme + storefront assembly
**Theme deployment:** PHASE_7B3_COMPLETE — 4 sections + 3 assets + 1 template written to theme 194584281428, 0 errors
**Storefront assembly:** `templates/index.json` written — homepage wired to 4 store-os sections in order
**Written files:** hero.liquid, value-prop.liquid, featured-collection.liquid, trust-social-proof.liquid, 3 SVG assets, templates/index.json
**CTA links:** Resolved to proper Shopify paths (/collections/handle, /pages/handle)
**Section settings:** Pre-populated from theme_rules (pattern: technical-b2b-specialist)
**Blocks:** Value-prop columns and trust signals pre-populated with placeholder content
**Media generation:** PHASE_9_PARTIAL — 8/15 generated, 1 failed (DALL-E intermittent), 6 skipped (optional)
**Runtime:** ~128s (n8n Cloud)

**GOLD_PATH_COMPLETE — Full End-to-End Validated (Execution 14820):**
**Date:** 2026-04-09
**Method:** `node scripts/run-orchestrator.js --input test-data/golden-input.json` (async)
**Terminal status:** `GOLD_PATH_COMPLETE` — all 17 subworkflow calls succeeded
**Chain:** intake → analysis (7 LLM phases) → Shopify writes (catalog, pages, nav) → theme-rules → media (9 DALL-E-3 images) → theme write
**Media generation:** PHASE_9_COMPLETE — 9/15 images generated (3 products × 3 required shots), 0 failed, 6 optional skipped
**Section→media mapping:** hero(6 assets), featured-collection(3), value-prop(3), trust-social-proof(3)
**Theme deployment:** PHASE_7B3_COMPLETE — 4 sections + 3 assets written to theme 194584281428
**Grounding:** Bypassed (no product images in Shopify — LLM-generated catalog). Text-only generation mode used.
**Hardened success criteria:** All Shopify phases now require == COMPLETE || == PARTIAL (was: != FAILED)
**Runtime:** ~126s (n8n Cloud)

**Persistent Draft Theme CONFIRMED — Theme System Locked:**
**Date:** 2026-04-09
**Theme ID:** `194584281428`
**Theme Name:** `store-os // system-draft`
**Theme Role:** `unpublished` (draft — NOT published, production theme NOT affected)
**Shop:** `8zw111-cj.myshopify.com`
**Created via:** Shopify Admin API POST /themes.json
**Persisted in:** `test-data/golden-input.json` (STORE_OS_SHOPIFY_THEME_ID), `workflows/n8n/workflow-ids.json` (persistent_theme)
**Write test 1:** 4 sections + 3 assets → PHASE_7B3_COMPLETE (hero, value-prop, featured-collection, trust-social-proof)
**Write test 2 (reuse check):** Same theme_id `194584281428` targeted, no new theme created
**Write test 3 (storefront assembly):** 4 sections + 3 assets + `templates/index.json` → PHASE_7B3_COMPLETE, homepage wired to 4 sections
**Safety:** Explicit shopify_theme_id always wins. Active production theme NOT modified.
**Files written to theme:** `sections/store-os-hero.liquid`, `sections/store-os-value-prop.liquid`, `sections/store-os-featured-collection.liquid`, `sections/store-os-trust-social-proof.liquid`, `assets/store-os-logo-placeholder.svg`, `assets/store-os-hero-placeholder.svg`, `assets/store-os-favicon-placeholder.svg`, `templates/index.json`

**Phase 12 CONFIRMED (COMPLETE) — Image Grounding Layer:**
**Date:** 2026-04-09
**Method:** Webhook wrapper → `build-media-assets` (ID: krR10um8F1pT0miQ) with `image_grounding` artifact
**Input:** 1-product payload (basswave-kabellose-kopfhorer) with real Shopify image + theme_rules (specialist-standard, 4-section stack) + image_grounding (Gemini 2.0 Flash)
**Result:** `PHASE_9_PROMPTS_ONLY` — all grounded prompts correct, all Phase 12 per-asset fields present
**Grounding model:** gemini-2.0-flash | **Grounding confidence:** 0.82
**Grounded prompts verified:** All 5 assets contain Gemini-derived physical descriptions (materials, shape, colors) instead of title-only descriptions
**Phase 12 per-asset fields verified:** generation_mode (grounded_generate) | grounding_source_type (shopify_product_image) | grounded_from_image | grounding_confidence | product_faithfulness_required
**Detail closeup focus areas:** earcup padding texture, headband adjustment mechanism, microphone boom detail, mint green color finish
**New workflow:** build-image-grounding (ID: s5aWmVZcerBgc6kM)
**New schema:** schemas/phase-12/image-grounding.schema.json
**Schema updated:** schemas/phase-9/media-generation.schema.json (added 5 Phase 12 per-asset fields)
**Doc:** docs/phase-12-architecture.md

**Phase 9 CONFIRMED (COMPLETE — LIVE GENERATION) — Media Runtime Operational:**
**Date:** 2026-04-09
**Method:** `validate-media-generation.js` → webhook wrapper → `build-media-assets` (ID: krR10um8F1pT0miQ)
**Input:** 1-product payload (industrial-sensor-v2) with `theme_rules` (pattern: technical-b2b-specialist, 4-section stack)
**Mode:** `full_generation` — allow_media_generation: true, model: dall-e-3
**Result:** `PHASE_9_COMPLETE` — 3 real images generated by DALL-E-3, downloaded, and persisted to local disk
**media_plan:** `derived_from_theme_rules: true` | `store_pattern: technical-b2b-specialist`
**Shot plan:** 5 shot types (3 required, 2 optional) | 3 generated (required+high, required+medium) | 2 skipped (optional)
**Generated images:**
- `hero_wide` (16:9, 1.9MB) → `outputs/media/.../hero-wide/industrial-sensor-v2-hero_wide.png`
- `studio_packshot` (1:1, 1.5MB) → `outputs/media/.../studio-packshot/industrial-sensor-v2-studio_packshot.png`
- `clean_feature` (4:5, 2.2MB) → `outputs/media/.../clean-feature/industrial-sensor-v2-clean_feature.png`
**Priority ordering verified:** hero_wide(high) → studio_packshot(high) → clean_feature(medium) | lifestyle_context(medium/optional) skipped | detail_closeup(low/optional) skipped
**Total runtime:** 56.8s (3 DALL-E-3 API calls + download)
**Artifact:** `outputs/runs/media-gen-*.json` — includes local_path, file_size_bytes, all Phase 11 fields
**Errors:** 0 | **Warnings:** 0

**Phase 11 CONFIRMED (PROMPTS_ONLY) — Theme-Driven Media Orchestration:**
**Date:** 2026-04-08
**Method:** Standalone sub-workflow test via webhook wrapper → `build-media-assets` (ID: krR10um8F1pT0miQ)
**Input:** 1-product payload (industrial-sensor-v2) with `theme_rules` (pattern: technical-b2b-specialist, 4-section stack)
**Result:** `PHASE_9_PROMPTS_ONLY` — execution successful — Phase 11 media_plan and per-asset fields all correct
**media_plan:** `derived_from_theme_rules: true` | `store_pattern: technical-b2b-specialist`
**Section coverage:** hero→[hero_wide, lifestyle_context] | value-prop→[clean_feature] | featured-collection→[studio_packshot] | trust-social-proof→[detail_closeup]
**Shot plan (priority-ordered):** high: hero_wide, studio_packshot | medium: lifestyle_context, clean_feature | low: detail_closeup
**required_shots: 3 | optional_shots: 2 | total: 5**
**Phase 11 per-asset fields verified:** source_section ✓ | priority ✓ | required ✓ | intended_usage ✓ | used_in_layout ✓ | derived_from_theme_rules ✓ | generation_needed ✓
**Generation batch ordering:** required+high first → required+medium → optional+high (low optional skipped)
**Prompts generated:** 5 (1 per shot type) | **Images generated:** 0 (prompts_only mode)
**Errors:** 0 | **Warnings:** 1 (expected: PROMPTS_ONLY)
**New schema:** schemas/phase-11/media-plan.schema.json
**Schema updated:** schemas/phase-9/media-generation.schema.json (added media_plan + 7 Phase 11 per-asset fields)

**Phase 10 CONFIRMED (COMPLETE) — Theme Rules Engine:**
**Date:** 2026-04-08
**Method:** Full orchestrator chain (execution 14747) — `build-theme-rules` runs between Phase 7B.2 Complete and `build-shopify-theme`
**Input:** `test-data/golden-input.json` (project: suppliedtech)
**Phase 10 result:** `PHASE_10_COMPLETE` — pattern classified, rules mapped, theme_rules passed to build-shopify-theme
**Chain result:** `PHASE_7B3_COMPLETE` — no regressions, sections_written: 4, assets_written: 3
**Pattern classified:** `technical-b2b-specialist` (brand_role=specialist + tone=technical-trustworthy)
**Section stack decided:** hero(1) → value-prop(2) → featured-collection(3) → trust-social-proof(4)
**Rules applied:** grid_columns=3, value_prop.column_count=4, trust.proof_mode=evidence-led, trust.block_count=4
**New workflows:** build-theme-rules (ID: KzFBogj7kusXQqlp)
**New nodes in orchestrator:** Prepare Theme Rules Input + Run build-theme-rules (continueOnFail)
**Execution time for theme rules:** ~180ms (no LLM calls, no external APIs)

**Phase 9 CONFIRMED (PROMPTS_ONLY) — Media Generation:**
**Date:** 2026-04-08
**Method:** Standalone sub-workflow test via webhook wrapper → `build-media-assets` (ID: krR10um8F1pT0miQ)
**Input:** 2-product test payload (heavy-duty-cable-ties, safety-goggles-pro) with mass-premium/specialist config
**Result:** `PHASE_9_PROMPTS_ONLY` — execution successful, ~1.9s — cloud mode
**Visual system derived:**
- Background: neutral-studio (mass-premium) | Lighting: soft-studio (technical-trustworthy)
- Framing: centered-subject (specialist) | Shadow: soft-drop (mass-premium)
- Mood: reliable, efficient, professional (from brand_traits)
**Shot taxonomy:** 5 fixed shot types applied to both products (10 total assets)
**Prompts generated:** 10 deterministic prompts (pure function of inputs)
**Images generated:** 0 (prompts_only mode — allow_media_generation: false)
**Shopify mapping:** studio_packshot→pos 1, clean_feature→pos 2, lifestyle_context→pos 3, hero_wide→collection_image
**Errors:** 0 | **Warnings:** 1 (expected: "PROMPTS_ONLY: allow_media_generation not set")
**n8n validation:** 0 errors, 12 warnings (all minor — typeVersion hints, error handling suggestions)
**Not yet integrated into orchestrator chain** — standalone sub-workflow, will be added in future phase

**Phase 7B.3 CONFIRMED (COMPLETE) — Theme Deployment:**
**Date:** 2026-04-08
**Method:** `node scripts/run-orchestrator.js --input test-data/golden-input.json` (async)
**Input:** `test-data/golden-input.json` (project: `suppliedtech`)
**Result:** `PHASE_7B3_COMPLETE` — n8n execution 14728, status: success, ~131s — cloud mode
**Shopify target:** `8zw111-cj.myshopify.com`
**Theme target:** ST Draft - 2026-03-22 (id: 193655701844, role: unpublished)
**Theme writes:** sections_written: 4 | assets_written: 3 | errors: 0 | warnings: 0
**Sections deployed:** store-os-hero, store-os-featured-collection, store-os-value-prop, store-os-trust-social-proof
**Assets deployed:** store-os-logo-placeholder.svg, store-os-favicon-placeholder.svg, store-os-hero-placeholder.svg
**Safety confirmed:**
- Active production theme (Main) was NOT modified
- No templates/*.json or config/settings_data.json were modified
- No existing theme files were deleted
- All keys prefixed `store-os-` to avoid Dawn section collisions
**Fixes applied during Phase 7B.3:**
- `orchestrate-phase1` Resolve Runtime Config: added `allow_theme_writes` and `shopify_theme_id` to runtimeConfig assembly
- `build-shopify-theme` schema name truncated to 25 chars max (Shopify limit)
- `build-shopify-theme` cta_link setting changed from `url` type to `text` (collection handles aren't valid URLs)
- `build-shopify-theme` Compile Summary: recovers metadata from Build Deployment Plan via `$()` reference (HTTP node replaces input JSON)
- `resolve-runtime-config` updated with `allow_theme_writes` and `shopify_theme_id` fields, `callerPolicy: "any"`
**Persisted:** `outputs/runs/14728.json`

**Full System Consistency Validation — PHASE_7B2_COMPLETE:**
**Date:** 2026-04-08
**Method:** `node scripts/run-orchestrator.js --input test-data/golden-input.json` (async)
**Input:** `test-data/golden-input.json` (project: `suppliedtech`)
**Result:** `PHASE_7B2_COMPLETE` — n8n execution 14604, status: success, ~104s — cloud mode
**Shopify target:** `8zw111-cj.myshopify.com`
**Shopify API version:** `2026-01` (aligned across golden-input, runtime_config, all workflows)
**Catalog:** products_created: 2 | products_updated: 1 | collections_updated: 2
**Pages:** pages_updated: 3 (no new creates — idempotent upsert confirmed)
**Navigation:** navigation_updated: 2 | errors: 0 (GraphQL Menu API)
**Fixes validated in this run:**
- `import-shopify-data` migrated from `$env.*` to `$json.runtime_config.*` — API version now propagates from golden-input through runtime_config
- Merge node fixed with `numberInputs: 4` for 4-branch parallel fetch
- All workflows on Shopify API 2026-01 (was 2025-01)
- All workflows on credential `CO1JGlTR5RJ9Cs6x` (shopifyOAuth2Api)
**Artifacts returned:** full 11-artifact chain
**Persisted:** `outputs/runs/14604.json`

**Phase 7B.2 CONFIRMED (COMPLETE) — post GraphQL migration:**
**Date:** 2026-04-08
**Result:** `PHASE_7B2_COMPLETE` — n8n execution 14587, ~127s — cloud mode
**Fix applied:** Migrated navigation from deprecated REST `link_lists` endpoint (removed in Shopify API 2025-04) to GraphQL Menu API. Updated credential from `edgLmgVntFGX6QYN` to `CO1JGlTR5RJ9Cs6x`.
**Persisted:** `outputs/runs/14587.json`

**Phase 7B.1 CONFIRMED:**
**Date:** 2026-04-07
**Method:** `node scripts/run-orchestrator.js --input test-data/golden-input.json` (async) + `node scripts/poll-execution.js 14430 --json`
**Input:** `test-data/golden-input.json` (project: `suppliedtech`)
**Result:** `PHASE_7B1_COMPLETE` — n8n execution 14430, status: success, ~101s — cloud mode
**Shopify target:** `8zw111-cj.myshopify.com`
**Shopify side effects:**
- products_created: 3 (tech-accessory-bundle, premium-headphones, wireless-keyboard-mouse-set)
- products_updated: 0
- collections_created: 2 (audio, peripherals)
- collections_updated: 1 (bundles — pre-existing handle)
- errors: 0 | warnings: 0
**Safety verified:** All new products created with `status: draft`; no deletes performed; idempotent handle-based upsert confirmed
**Artifacts returned:** full 10-artifact chain + `shopify_catalog_deployment`
**Persisted:** `outputs/runs/14430.json`

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

## Current confirmed executable chain (Gold Path)

The full n8n orchestrator execution chain (17 subworkflow calls, sequential):

1. `resolve-runtime-config` (inline Code node — not a subworkflow)
2. `intake-store-input` (Phase 1 — input normalization)
3. `import-shopify-data` (Phase 1 — Shopify API fetch)
4. `build-store-profile` (Phase 1 — profile synthesis)
5. `build-market-intelligence` (Phase 2 — LLM: gpt-4o)
6. `build-brand-positioning` (Phase 3 — LLM: gpt-4o)
7. `build-competitor-clusters` (Phase 4 — LLM: gpt-4o)
8. `build-strategy-synthesis` (Phase 5 — LLM: gpt-4o, cross-artifact)
9. `build-offer-architecture` (Phase 6a — LLM: gpt-4o)
10. `build-content-strategy` (Phase 6b — LLM: gpt-4o)
11. `build-gtm-plan` (Phase 6c — LLM: gpt-4o)
12. `build-store-blueprint` (Phase 7A — LLM: gpt-4o)
13. `build-shopify-catalog` (Phase 7B.1 — Shopify REST writes)
14. `build-shopify-pages-navigation` (Phase 7B.2 — Shopify REST + GraphQL writes)
15. `build-theme-rules` (Phase 10 — deterministic, `continueOnFail: true`)
16. `build-image-grounding` (Phase 12 — conditional: skipped when no product images)
17. `build-media-assets` (Phase 9 — DALL-E-3 image generation)
18. `build-shopify-theme` (Phase 7B.3 — Shopify Theme API writes) ← **TERMINAL**

**Failure semantics (hardened):**
- Phases 1–7A (steps 1–12): `status == "SUCCESS"` required, chain halts on failure
- Phase 7B.1 (step 13): `status == COMPLETE || == PARTIAL` required, FAILED halts chain
- Phase 7B.2 (step 14): `status == COMPLETE || == PARTIAL` required, FAILED halts chain
- Phase 10 (step 15): `continueOnFail: true` (optional — theme falls back to blueprint sections)
- Phase 12 (step 16): Conditional bypass — skipped when no product images; errors caught by normalize node
- Phase 9 (step 17): `status == COMPLETE || == PARTIAL` required, PROMPTS_ONLY and FAILED halt chain
- Phase 7B.3 (step 18): `status == COMPLETE || == PARTIAL` required, DRY_RUN/BLOCKED/FAILED halt chain

**Terminal status:** `GOLD_PATH_COMPLETE` (theme + media both fully succeeded) or `GOLD_PATH_PARTIAL` (theme or media had partial results).

**Async model:** Chains run ~130s+. The webhook returns HTTP 202 within ~2s with an `execution_id`. The CLI polls `GET /api/v1/executions/{id}` until `finished: true`. Cloudflare's 100s timeout is no longer hit. See `docs/async-execution-model.md`.

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
- `shopify_catalog_deployment` (Phase 7B.1)
- `shopify_pages_navigation_deployment` (Phase 7B.2)
- `theme_rules` (Phase 10 — when available)
- `image_grounding` (Phase 12 — when products have images)
- `media_generation` (Phase 9 — DALL-E-3 generation results)
- `section_media_map` (section→media asset mapping)
- `product_media_map` (product→media asset mapping)
- `shopify_theme_deployment` (Phase 7B.3 — includes templates_written, written_files)

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
  ┌── PHASE CHAIN ─────────────────────────────────────────────┐
  │  intake-store-input → import-shopify-data                  │
  │  build-store-profile            (Phase 1)                  │
  │  build-market-intelligence      (Phase 2)                  │
  │  build-brand-positioning        (Phase 3)                  │
  │  build-competitor-clusters      (Phase 4)                  │
  │  build-strategy-synthesis       (Phase 5)                  │
  │  build-offer-architecture       (Phase 6a)                 │
  │  build-content-strategy         (Phase 6b)                 │
  │  build-gtm-plan                 (Phase 6c)                 │
  │  build-store-blueprint          (Phase 7A)                 │
  │  build-shopify-catalog          (Phase 7B.1)               │
  │  build-shopify-pages-navigation (Phase 7B.2)               │
  │  build-theme-rules              (Phase 10, continueOnFail) │
  │  build-shopify-theme            (Phase 7B.3) ← TERMINAL   │
  └────────────────────────────────────────────────────────────┘
      │
  Phase 7B.3 Complete → returns inline artifacts + metadata

CALLER FLOW (async)
  1. POST webhook → HTTP 202 { execution_id, status: "started" }  (~2s)
  2. Poll GET /api/v1/executions/{id}?includeData=true  (every 5s)
  3. finished: true → extract result from Phase 7B.3 Complete node

OUTPUT (extracted from execution data)
  status, execution_id, completed_at
  store_profile, market_intelligence, brand_positioning,
  competitor_clusters, strategy_synthesis,
  offer_architecture, content_strategy, gtm_plan,
  store_blueprint, shopify_catalog_deployment,
  shopify_pages_navigation_deployment, theme_rules,
  shopify_theme_deployment (all inline in cloud mode)
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

Next: **Extend theme section types** — add `testimonial-carousel`, `announcement-bar`, `comparison-table` to the rules engine section model; integrate `reason_to_believe[]` into trust section block content; connect `media_placement_rules` to Phase 9 media generation.

Phase 10 is **COMPLETE** — `build-theme-rules` deployed (ID: KzFBogj7kusXQqlp), integrated into orchestrator chain, validated in execution 14747.

Phase 9 is **CONFIRMED (standalone)** — `build-media-assets` deployed (ID: krR10um8F1pT0miQ), prompts_only mode validated. Not yet integrated into orchestrator chain.

Phase 7B.3 is **COMPLETE** — `build-shopify-theme` deployed, theme sections + assets written to Shopify dev theme.

Phase 7B.2 is **COMPLETE** — `build-shopify-pages-navigation` deployed, navigation uses GraphQL Menu API (REST link_lists removed in Shopify 2025-04).

Phase 7B.1 is **COMPLETE** — `build-shopify-catalog` deployed, products + collections via REST Admin API.

Phase 7A is **COMPLETE** — `build-store-blueprint` deployed and confirmed.

Phase 6 is **COMPLETE** — all three Phase 6 subworkflows confirmed.

## Shopify API configuration

All Shopify-facing workflows use:
- **API version:** `2026-01` (configured via `runtime_config.shopify_api_version`, propagated from golden-input)
- **Credential:** `shopifyOAuth2Api` — `CO1JGlTR5RJ9Cs6x` ("Shopify SuppliedTech Admin")
- **Shop URL:** `runtime_config.shopify_shop_url` (no `$env` dependencies)

| Workflow | Shopify API | Notes |
|---|---|---|
| `import-shopify-data` | REST (GET shop, products, collections) | Migrated from `$env.*` to `runtime_config.*` (2026-04-08) |
| `build-shopify-catalog` | REST (GET/POST/PUT products, collections) | Upsert by handle, draft-only creates |
| `build-shopify-pages-navigation` | REST (pages) + GraphQL (menus) | Navigation migrated from REST link_lists to GraphQL Menu API (2026-04-08) |

See `docs/phase-7b-architecture.md` for full Phase 7B architecture.

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
