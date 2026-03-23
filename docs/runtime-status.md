# store-os runtime status

## Current confirmed repo state

Branch baseline:

- `main`

Latest confirmed merge relevant to executable runtime progression:

- `633c80d` Merge pull request #10 from `feature/runtime-hardening-artifact-contracts` (Phase 16 hardening)

Recent runtime progression merges:

- `eff416f` Merge pull request #9 from `feature/phase-15-competitor-clusters-runtime`
- `e25fe42` Merge pull request #8 from `feature/phase-14-brand-positioning-runtime`
- `35c8d51` Merge pull request #7 from `feature/phase-13-market-intelligence-runtime`
- `4a37e26` Merge pull request #6 from `feature/phase-12-cloud-aggregation-fix`
- `1f54815` Merge pull request #5 from `feature/phase-12-cloud-config-fix`
- `0404ef5` Merge pull request #4 from `feature/phase-12-cloud-hardening`
- `8ad40d5` Merge pull request #3 from `feature/phase-12-executable-foundation`

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

## Confirmed next planned runtime step

Current in-progress branch:

- `feature/phase-16-strategy-synthesis-runtime` — strategy synthesis phase (this branch)

After merge, next likely steps (Phase 6+):

- `build-offer-architecture` — uses growth_thesis, offer_implications, moat_hypotheses
- `build-content-strategy` — uses messaging_priorities, gtm_implications, opportunity_priorities
- `build-gtm-plan` — uses gtm_implications, opportunity_priorities, validation_questions

## Operational warning

Always distinguish between:

- repo state
- n8n UI state

A successful merge to `main` does not update the n8n UI automatically. Imported workflows, credentials, and workflow-ID wiring must still be synchronized manually in n8n Cloud.
