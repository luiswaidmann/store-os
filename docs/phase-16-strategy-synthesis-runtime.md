# Phase 16: build-strategy-synthesis Runtime

## Overview

`build-strategy-synthesis` is the first cross-artifact synthesis phase in the store-os execution chain. It consumes the four upstream planning artifacts (`store_profile`, `market_intelligence`, `brand_positioning`, `competitor_clusters`) and produces a single `strategy_synthesis` artifact that serves as the primary strategic input for all downstream planning phases.

**Branch**: `feature/phase-16-strategy-synthesis-runtime`

**Orchestrator position**: Phase 5 in `orchestrate-phase1` (after `build-competitor-clusters`)

---

## Purpose

Where prior phases each generate a specialized planning artifact in isolation, `build-strategy-synthesis` draws cross-cutting strategic conclusions across all four artifacts. It is designed to answer:

- What is the core growth hypothesis for this store?
- What is the primary positioning angle to pursue?
- Which opportunities should be prioritized, and why?
- Which risks need mitigation?
- What are the most important messages to communicate?
- What does this mean for offer architecture and GTM?
- What remains unknown and requires human validation?

The result is a single, handlungsleitend artifact that downstream phases (offer-architecture, content-strategy, gtm-plan) consume as their primary strategic context.

---

## Input Requirements

| Field | Source | Required | Notes |
|---|---|---|---|
| `store_profile` | build-store-profile | Yes | vertical, price_positioning, store_type, catalog_type required |
| `market_intelligence` | build-market-intelligence | Yes | market_category, core_problems, positioning_goals required |
| `brand_positioning` | build-brand-positioning | Yes | brand_role, value_proposition, differentiators required |
| `competitor_clusters` | build-competitor-clusters | Yes | Non-empty array |
| `normalized_intake_payload` | intake-store-input | Yes | For project context |
| `runtime_config` | resolve-runtime-config | Yes | |
| `project_id` | intake-store-input | Yes | |

---

## Output: `strategy_synthesis` Artifact

### Required fields

| Field | Type | Description |
|---|---|---|
| `strategic_summary` | string | 2-4 sentence synthesis of the strategic situation |
| `growth_thesis` | object | Core growth hypothesis (`statement`, `rationale`, optional `confidence`, `depends_on`) |
| `positioning_focus` | object | Primary positioning angle (`primary_angle`, `rationale`, optional `differentiating_from`, `supported_by`) |
| `opportunity_priorities` | array (min 1) | Prioritized opportunities with `source`, `priority`, optional `rationale`, `phase_implications` |
| `risk_priorities` | array (min 1) | Prioritized risks with `source`, `severity`, optional `mitigation_hint` |
| `validation_questions` | array (min 1) | Questions requiring human validation before acting on this synthesis |

### Optional fields

| Field | Type | Description |
|---|---|---|
| `moat_hypotheses` | array | Hypotheses about durable competitive advantage (`hypothesis`, `type`, `confidence`) |
| `messaging_priorities` | array | Priority messages by audience and channel |
| `offer_implications` | array | Product/offer strategy implications |
| `gtm_implications` | array | Go-to-market channel implications |
| `confidence_notes` | object | Overall synthesis confidence (`overall_level`, `primary_gaps`, `review_required`) |
| `unknown_states` | array | Unknown states carried forward from upstream phases |

### Enum values

**`opportunity_priorities[].source`** / **`risk_priorities[].source`**:
`market_intelligence` | `brand_positioning` | `competitor_clusters` | `store_profile` | `cross_signal`

**`opportunity_priorities[].priority`** / **`risk_priorities[].severity`**:
`high` | `medium` | `low`

**`growth_thesis.confidence`** / **`moat_hypotheses[].confidence`**:
`high` | `medium` | `low` | `speculative`

**`moat_hypotheses[].type`**:
`brand` | `catalog` | `customer-relationship` | `operations` | `content` | `pricing` | `expertise` | `mixed`

**`gtm_implications[].channel`**:
`seo` | `aeo` | `paid` | `social` | `email` | `content` | `partnerships` | `mixed`

**`confidence_notes.overall_level`**:
`high` | `medium` | `low` | `assumption-only`

---

## n8n Workflow Structure

**File**: `workflows/n8n/build-strategy-synthesis.n8n.json`

| Node | Type | Purpose |
|---|---|---|
| Subworkflow Trigger | executeWorkflowTrigger | Entry point when called from orchestrate-phase1 |
| Validate Upstream Inputs | Code | Checks all 4 artifacts present and well-formed. Propagates cloud_mode. |
| Build LLM Synthesis Prompt | Code | Assembles cross-artifact synthesis prompt. Extracts key signals from all 4 artifacts. |
| LLM Synthesis: Strategy | OpenAI | GPT-4o call. Temperature 0.3, maxTokens 4000. Returns JSON object. |
| Parse Validate Write | Code | Parses JSON, runs inline validation, AJV (self-hosted), writes artifact, builds envelope. |

### Node IDs

All nodes use the `h9c0d1e2-0009-0009-0009-*` ID namespace.

---

## Cloud Mode Behavior

| Step | Cloud | Self-hosted |
|---|---|---|
| Upstream validation | Runs | Runs |
| LLM prompt assembly | Runs | Runs |
| LLM synthesis | Runs | Runs |
| Inline validation (required fields + enums) | Runs | Runs |
| AJV schema validation | **Skipped** | Runs |
| Artifact write (strategy-synthesis.json) | **Skipped** | Runs |
| strategy_synthesis returned inline | Yes | Yes (also on disk) |

Cloud skips are logged as `cloud_warnings` in the output and in `envelope.status.warnings`.

---

## Orchestrator Integration

In `orchestrate-phase1.n8n.json`, Phase 5 consists of 5 new nodes:

1. **Prepare Strategy Synthesis Input** (node 29) — Bridge: assembles all 4 artifacts + normalized_intake_payload from Phase 4 output
2. **Run build-strategy-synthesis** (node 30) — executeWorkflow node (`REPLACE_WITH_BUILD_STRATEGY_SYNTHESIS_WORKFLOW_ID`)
3. **Strategy Synthesis Success?** (node 31) — IF check on `status == 'SUCCESS'`
4. **Halt - Strategy Synthesis Failed** (node 32) — throws `CHAIN_HALT` on failure
5. **Phase 5 Complete** (node 33) — terminal summary node, carries `strategy_synthesis` forward

**Phase 4 Complete** was updated to:
- Add `normalized_intake_payload` to the forwarded payload (needed by build-strategy-synthesis validate node)
- Update `next_phase` message to point to Phase 5

### Setup required (n8n Cloud)

After importing `build-strategy-synthesis.n8n.json` into n8n:

1. Copy the workflow ID from the n8n URL
2. In `orchestrate-phase1`, find node `Run build-strategy-synthesis`
3. Replace `REPLACE_WITH_BUILD_STRATEGY_SYNTHESIS_WORKFLOW_ID` with the actual ID
4. In `build-strategy-synthesis`, find node `LLM Synthesis: Strategy`
5. Replace `REPLACE_WITH_N8N_OPENAI_CREDENTIAL_ID` with your n8n OpenAI credential ID

---

## Evidence Boundary

All `strategy_synthesis` content is LLM inference from internal signals. Specifically:

- `strategic_summary`, `growth_thesis`, `positioning_focus` — synthesized from all 4 artifacts
- `opportunity_priorities` — source-tagged to the originating upstream artifact
- `risk_priorities` — source-tagged
- `moat_hypotheses` — highly speculative by nature; `confidence` field is required
- `validation_questions` — explicitly surfaces assumptions for human review

**Not permitted**: invented market data, traffic figures, revenue estimates, competitor metrics, events after LLM training cutoff.

---

## Validation

### Inline validation (always runs, both modes)

- All 6 required fields must be present and non-null
- `growth_thesis.statement` and `growth_thesis.rationale` must be non-empty strings
- `positioning_focus.primary_angle` and `positioning_focus.rationale` must be non-empty strings
- `opportunity_priorities`, `risk_priorities`, `validation_questions` must be non-empty arrays
- `growth_thesis.confidence`, `moat_hypotheses[].confidence` — enum check
- `opportunity_priorities[].source`, `risk_priorities[].source` — enum check
- `opportunity_priorities[].priority`, `risk_priorities[].severity` — enum check
- `moat_hypotheses[].type` — enum check
- `gtm_implications[].channel` — enum check

### AJV validation (self-hosted only)

- Full schema validation against `schemas/strategy-synthesis.schema.json`
- Validates all `additionalProperties: false` constraints

### Error codes

| Code | Severity | When |
|---|---|---|
| `MISSING_ARTIFACT` | fatal | Any of the 4 upstream artifacts missing or malformed |
| `MISSING_RUNTIME_CONFIG` | fatal | runtime_config absent |
| `LLM_PARSE_ERROR` | fatal | LLM response cannot be parsed as JSON object |
| `SCHEMA_VIOLATION` | fatal | Inline validation fails (required field, enum, or minItems violation) |

---

## Runtime Envelope

The output includes a `envelope` object following the standard pattern:

```json
{
  "runtime": { "run_id": "...", "phase_id": "build-strategy-synthesis", "cloud_mode": true, ... },
  "store": { "project_id": "...", "artifact_name": "strategy-synthesis", "artifact_path": null },
  "status": { "code": "SUCCESS", "fatal_errors": [], "warnings": ["AJV skipped..."], ... },
  "diagnostics": {
    "input_summary": { "vertical": "...", "market_category": "...", "brand_role": "...", "cluster_count": 2 },
    "output_summary": { "opportunity_count": 4, "risk_count": 3, "moat_hypothesis_count": 2, ... },
    "validation": { "schema_ref": "schemas/strategy-synthesis.schema.json", "result": "SKIPPED", ... },
    "lineage": { "upstream_phases": [...], "upstream_artifacts": [...] }
  }
}
```

---

## Downstream Phase Preparation

The following phases are the natural next steps after `build-strategy-synthesis`:

### build-offer-architecture (Phase 6 — not yet implemented)
- **Primary inputs from strategy_synthesis**: `growth_thesis`, `offer_implications`, `moat_hypotheses`, `opportunity_priorities` (filtered by `phase_implications: ["offer"]`)
- **Purpose**: Translates strategy into concrete product/assortment decisions

### build-content-strategy (Phase 6 — not yet implemented)
- **Primary inputs from strategy_synthesis**: `messaging_priorities`, `gtm_implications` (filtered by content channel), `opportunity_priorities` (filtered by `phase_implications: ["content", "seo", "aeo"]`)
- **Purpose**: Defines content topics, formats, and editorial direction

### build-gtm-plan (Phase 6 — not yet implemented)
- **Primary inputs from strategy_synthesis**: `gtm_implications`, `opportunity_priorities`, `risk_priorities`, `validation_questions`
- **Purpose**: Channel-specific go-to-market planning

---

## Smoke Test Path

For n8n Cloud smoke testing, use the gold path input from `workflows/examples/gold-path-example.json`:

**Key verification checklist for Phase 5:**

- `[ ]` `strategy_synthesis` object present in output
- `[ ]` `strategic_summary` is a non-empty string
- `[ ]` `growth_thesis.statement` and `.rationale` are non-empty strings
- `[ ]` `positioning_focus.primary_angle` is non-empty
- `[ ]` `opportunity_priorities` has ≥ 2 items
- `[ ]` `risk_priorities` has ≥ 2 items
- `[ ]` `validation_questions` has ≥ 3 items
- `[ ]` `status` is `'SUCCESS'`
- `[ ]` `envelope.status.code` is `'SUCCESS'`
- `[ ]` `cloud_mode` is `true`
- `[ ]` `envelope.diagnostics.output_summary.opportunity_count` matches array length

---

## Files Added/Modified

| File | Action |
|---|---|
| `schemas/strategy-synthesis.schema.json` | **New** |
| `workflows/contracts/build-strategy-synthesis.contract.json` | **New** |
| `workflows/n8n/build-strategy-synthesis.n8n.json` | **New** |
| `docs/phase-16-strategy-synthesis-runtime.md` | **New** (this file) |
| `workflows/n8n/orchestrate-phase1.n8n.json` | **Modified** — Phase 5 nodes + connections + Phase 4 Complete update + _meta update |
| `workflows/examples/gold-path-example.json` | **Modified** — added strategy_synthesis phase |
| `docs/phase-contracts.md` | **Modified** — added row + section |
| `docs/runtime-status.md` | **Modified** — updated chain, added phase section |
