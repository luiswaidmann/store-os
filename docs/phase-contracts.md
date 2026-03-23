# Phase Contracts

## Overview

Each phase in the store-os execution chain has a contract file in `workflows/contracts/`. Contracts are JSON documents that describe:

- What inputs are required
- What outputs are produced
- What error codes can be thrown
- How cloud mode changes behavior
- What new optional enrichments were added in Phase 16

Contract files are reference documentation for implementers and reviewers. They do not affect runtime behavior directly — they document the expected runtime behavior.

---

## Contract File Format

Every contract file follows the `store-os-runtime-contract` format:

```json
{
  "_meta": {
    "format": "store-os-runtime-contract",
    "version": "1.0",
    "phase_id": "...",
    "category": "...",
    "cloud_compatibility": "FULL | PARTIAL",
    "description": "..."
  },
  "phase_id": "...",
  "upstream_dependencies": [],
  "required_inputs": {},
  "output_contract": {},
  "validation_errors": [],
  "cloud_behavior": {}
}
```

---

## Phase Summary Table

| Phase ID | Category | Cloud Compat | Upstream Deps | Output Artifact | New Optional Fields (Phase 16) |
|---|---|---|---|---|---|
| resolve-runtime-config | runtime-infrastructure | FULL | none | runtime_config (inline) | — |
| intake-store-input | data-intake | FULL | resolve-runtime-config | normalized_intake_payload (inline) | — |
| build-store-profile | planning | PARTIAL | intake-store-input, import-shopify-data | store-profile.json | assortment_shape, target_audience_hypotheses, value_proposition_hint, brand_voice_hint, ux_merchandising_maturity, open_questions |
| build-market-intelligence | planning | PARTIAL | build-store-profile, intake-store-input | market-intelligence.json | market_hypotheses, trend_signals, seasonality_hints, price_band_logic, risk_flags, opportunity_flags, competition_surface, adjacent_market_hints, unknown_states |
| build-brand-positioning | planning | PARTIAL | build-store-profile, build-market-intelligence, intake-store-input | brand-positioning.json | emotional_benefits, functional_benefits, reason_to_believe, messaging_pillars, anti_positioning, confidence_basis |
| build-competitor-clusters | planning | PARTIAL | build-market-intelligence, intake-store-input, build-store-profile | competitor-clusters.json (array) | competitor_type_classification, price_tier, brand_style, product_breadth, trust_signals_used, strategic_summary |
| build-strategy-synthesis | planning | PARTIAL | build-competitor-clusters, build-brand-positioning, build-market-intelligence, build-store-profile | strategy-synthesis.json | moat_hypotheses, messaging_priorities, offer_implications, gtm_implications, confidence_notes, unknown_states |

---

## Phase Contract Details

### resolve-runtime-config

**Cloud compatibility**: FULL

**Required inputs**: environment variables

| Env Var | Required | Description |
|---|---|---|
| `STORE_OS_OPENAI_CREDENTIAL_NAME` | Yes | n8n OpenAI credential name |
| `STORE_OS_SHOPIFY_CREDENTIAL_NAME` | Yes | n8n Shopify credential name |
| `STORE_OS_ENV` | Yes | `dev \| staging \| production \| cloud-smoke` |
| `STORE_OS_PROJECT_ROOT` | Self-hosted | Absolute path to projects root |
| `STORE_OS_LLM_MODEL` | Yes | LLM model ID, e.g. `gpt-4o` |
| `STORE_OS_MAX_PRODUCTS` | No | Default: 250 |
| `STORE_OS_MAX_COLLECTIONS` | No | Default: 50 |

**Error codes**: `MISSING_ENV_VAR`, `INVALID_ENV_VALUE`, `CREDENTIAL_RESOLUTION_FAILED`

**Contract file**: `workflows/contracts/resolve-runtime-config.contract.json`

---

### intake-store-input

**Cloud compatibility**: FULL

**Required input fields** (from trigger input):

`project_id`, `primary_market`, `primary_language`, `primary_currency`, `vertical`, `store_type`, `business_model`, `price_positioning`, `publish_mode`

**Key normalizations**:
- `target_markets` defaults to `[primary_market]`
- `languages` defaults to `[primary_language]`
- `currencies` defaults to `[primary_currency]`
- `competitor_urls` defaults to `[]`

**Error codes**: `MISSING_REQUIRED_FIELD`, `INVALID_ENUM_VALUE`, `INVALID_PROJECT_ID_FORMAT`

**Contract file**: `workflows/contracts/intake-store-input.contract.json`

---

### build-store-profile

**Cloud compatibility**: PARTIAL

**Required inputs**: `project_id`, `normalized_intake_payload`, `runtime_config`, `shopify_import` (inline in cloud mode)

**Key field derivations**:
- `catalog_type`: from `active_product_count` (0→small-curated, 1→single-product, ≤15→small-curated, ≤200→broad, >200→mixed)
- `assortment_shape`: from `active_product_count` (1→single-hero, ≤5→tight-specialist, ≤50→curated-multi, >50→broad-generalist)
- `operating_mode`: mapped from `publish_mode`
- `brand_maturity`: defaults to `new`

**New optional outputs**: `assortment_shape`, `target_audience_hypotheses`, `value_proposition_hint`, `brand_voice_hint`, `ux_merchandising_maturity`, `open_questions`

**Error codes**: `MISSING_RUNTIME_CONFIG`, `MISSING_ARTIFACT`, `PROJECT_ID_MISMATCH`, `SCHEMA_VIOLATION`, `PARSE_ERROR`, `CLOUD_MODE_ERROR`

**Cloud skips**: AJV validation, disk write, checkpoint, execution log

**Contract file**: `workflows/contracts/build-store-profile.contract.json`

---

### build-market-intelligence

**Cloud compatibility**: PARTIAL

**Required inputs**: `store_profile` (with vertical, price_positioning, primary_market, store_type, catalog_type), `normalized_intake_payload`, `runtime_config`

**Optional inputs**: `shopify_import` (catalog context — degrades gracefully if absent)

**Synthesis boundary**: LLM from internal signals only. No external research, no crawling.

**New optional outputs**: `market_hypotheses`, `trend_signals`, `seasonality_hints`, `price_band_logic`, `risk_flags`, `opportunity_flags`, `competition_surface`, `adjacent_market_hints`, `unknown_states`

**Error codes**: `MISSING_ARTIFACT`, `MISSING_RUNTIME_CONFIG`, `LLM_PARSE_ERROR`, `SCHEMA_VIOLATION`

**Contract file**: `workflows/contracts/build-market-intelligence.contract.json`

---

### build-brand-positioning

**Cloud compatibility**: PARTIAL

**Required inputs**: `store_profile`, `market_intelligence`, `normalized_intake_payload`, `runtime_config`

**Direct vs synthesized split**:
- **Direct** (user decisions, enforced post-LLM): `brand_role`, `tone_of_voice.style`, `trust_style.proof_mode`, `conversion_style.cta_style`, `objection_handling_style`
- **Synthesized** (LLM-generated): everything else

**New optional outputs**: `emotional_benefits`, `functional_benefits`, `reason_to_believe`, `messaging_pillars`, `anti_positioning`, `confidence_basis` (computed in code, not LLM-generated)

**Error codes**: `MISSING_ARTIFACT`, `LLM_PARSE_ERROR`, `SCHEMA_VIOLATION`

**Contract file**: `workflows/contracts/build-brand-positioning.contract.json`

---

### build-competitor-clusters

**Cloud compatibility**: PARTIAL

**Required inputs**: `store_profile`, `market_intelligence`, `normalized_intake_payload`, `runtime_config`

**Operating modes**:
- `url-seeded`: ≥2 `competitor_urls` → LLM groups into 2-4 clusters using only provided URLs
- `hybrid`: 1 URL → 1 URL-seeded cluster + 1-2 archetype clusters (ARCHETYPE-PLACEHOLDER)
- `archetype`: 0 URLs → 2-3 pure archetype clusters (all ARCHETYPE-PLACEHOLDER)

**New optional outputs per cluster**: `competitor_type_classification`, `price_tier`, `brand_style`, `product_breadth`, `trust_signals_used`, `strategic_summary`

**Error codes**: `MISSING_ARTIFACT`, `LLM_PARSE_ERROR`, `LLM_ARRAY_PARSE_ERROR`, `SCHEMA_VIOLATION`

**Contract file**: `workflows/contracts/build-competitor-clusters.contract.json`

---

### build-strategy-synthesis

**Cloud compatibility**: PARTIAL

**Required inputs**: `store_profile` (with vertical, price_positioning, store_type, catalog_type), `market_intelligence` (with market_category, core_problems, positioning_goals), `brand_positioning` (with brand_role, value_proposition, differentiators), `competitor_clusters` (non-empty array), `normalized_intake_payload`, `runtime_config`

**Synthesis scope**: Cross-artifact synthesis. All four upstream planning artifacts are summarized and passed to the LLM, which produces a single strategic synthesis object with cross-cutting conclusions.

**Required output fields**: `strategic_summary`, `growth_thesis` (with `statement`, `rationale`), `positioning_focus` (with `primary_angle`, `rationale`), `opportunity_priorities` (array, min 1), `risk_priorities` (array, min 1), `validation_questions` (array, min 1)

**Optional output fields**: `moat_hypotheses`, `messaging_priorities`, `offer_implications`, `gtm_implications`, `confidence_notes`, `unknown_states`

**Evidence boundary**: LLM inference from internal signals only. No external research, no crawling, no competitive intelligence APIs. All outputs are planning hypotheses requiring human review.

**Error codes**: `MISSING_ARTIFACT`, `MISSING_RUNTIME_CONFIG`, `LLM_PARSE_ERROR`, `SCHEMA_VIOLATION`

**Cloud skips**: AJV validation, disk write (strategy-synthesis.json)

**Downstream consumers**: `build-offer-architecture`, `build-content-strategy`, `build-gtm-plan` (all Phase 6+ — not yet implemented)

**Contract file**: `workflows/contracts/build-strategy-synthesis.contract.json`

---

## How to Read a Contract File

Contract files are reference documents, not executable code. When reading a contract:

1. **`_meta.cloud_compatibility`**: `FULL` means the phase runs identically in cloud and self-hosted. `PARTIAL` means some steps are skipped in cloud mode.
2. **`upstream_dependencies`**: phases that must have completed before this phase runs.
3. **`required_inputs`**: what the phase expects to receive. Missing required inputs will throw a `fatal` error.
4. **`output_contract`**: what the phase produces. New optional fields are listed separately.
5. **`validation_errors`**: error codes this phase can throw, with severity and description.
6. **`cloud_behavior`**: what is skipped or changed in n8n Cloud mode.

## How to Extend Contracts

When adding a new feature to an existing phase:

1. Add new optional fields to `output_contract.{artifact}.new_optional_fields`
2. Add any new error codes to `validation_errors`
3. Update `cloud_behavior` if cloud behavior changes
4. Increment the contract `_meta.version` (currently always `1.0` — reserved for future tooling)

When adding a new phase entirely, create a new contract file following the pattern above. See `docs/extension-guide.md` for the full checklist.
