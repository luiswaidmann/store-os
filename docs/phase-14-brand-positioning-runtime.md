# Phase 14 — Brand Positioning Runtime

**Status**: Implemented — executable n8n workflow created.
**Date**: 2026-03-21
**Scope**: `build-brand-positioning` subworkflow + orchestrator extension through Phase 3 Complete.

---

## What Was Built

Phase 14 adds the brand positioning LLM synthesis step to the executable runtime chain:

```
resolve-runtime-config
  → intake-store-input
  → import-shopify-data
  → build-store-profile          [Phase 12]
  → build-market-intelligence    [Phase 13]
  → build-brand-positioning      [Phase 14 — new]
```

### New files

| File | Purpose |
|---|---|
| `workflows/n8n/build-brand-positioning.n8n.json` | Executable n8n subworkflow — brand positioning synthesis |
| `docs/phase-14-brand-positioning-runtime.md` | This document |

### Modified files

| File | Change |
|---|---|
| `workflows/n8n/orchestrate-phase1.n8n.json` | Updated Phase 2 Complete to forward data; 5 new nodes added through Phase 3 Complete |

---

## build-brand-positioning Workflow

### Node structure

| # | Node | Type | Purpose |
|---|---|---|---|
| 1 | Subworkflow Trigger | executeWorkflowTrigger | Receives input from orchestrator |
| 2 | Validate and Extract Brand Signals | Code | Validates inputs; extracts and classifies intake brand signals as DIRECT vs HINT |
| 3 | Build LLM Prompt | Code | Assembles structured prompt with direct constraints and synthesis instructions |
| 4 | LLM Synthesis: Brand Positioning | OpenAI (chat, gpt-4o) | Calls OpenAI; temp=0.3, max_tokens=1500 |
| 5 | Parse Merge Enforce and Write | Code | Parses LLM JSON; enforces direct fields; merges forbidden_impressions; validates; writes artifact |

### Input contract

```json
{
  "project_id": "string",
  "store_profile": { "store_id", "vertical", "price_positioning", "primary_market", "store_type", ... },
  "market_intelligence": { "audience_segments", "core_problems", "purchase_motivators", "trust_factors", "competitor_types", "positioning_goals", ... },
  "normalized_intake_payload": { "brand_role", "tone_of_voice", "trust_style", "conversion_style", "objection_handling_style", "must_feel_like", "must_not_feel_like", ... },
  "runtime_config": { "llm_model", "ajv_schema_path", "project_root", "cloud_mode", ... }
}
```

### Output contract

```json
{
  "project_id": "string",
  "artifact_name": "brand-positioning",
  "artifact_path": "string | null",
  "brand_positioning": { ... },
  "runtime_config": { ... },
  "status": "SUCCESS",
  "cloud_mode": "boolean",
  "cloud_warnings": ["string"],
  "notes": []
}
```

---

## Direct Field Enforcement

Intake-provided brand preferences are treated as hard user decisions and must not be overridden by LLM synthesis. The workflow enforces these after LLM synthesis (Node 5):

| Intake field | Maps to schema field | Treatment |
|---|---|---|
| `brand_role` | `brand_role` | DIRECT — if non-null, override LLM value |
| `tone_of_voice` | `tone_of_voice.style` | DIRECT — maps flat enum to nested `.style` sub-field |
| `trust_style` | `trust_style.proof_mode` | DIRECT — maps flat enum to nested `.proof_mode` sub-field |
| `conversion_style` | `conversion_style.cta_style` | DIRECT — maps flat enum to nested `.cta_style` sub-field |
| `objection_handling_style` | `objection_handling_style` | DIRECT — if non-null, override LLM value |
| `must_not_feel_like` + `forbidden_styles` | `forbidden_impressions` | MERGED into LLM-generated forbidden_impressions array |

LLM synthesizes all other fields: `value_proposition`, `positioning_statement`, `differentiators`, `brand_traits`, `tone_of_voice.clarity_level`, `tone_of_voice.emotional_intensity`, `trust_style.reassurance_level`, `conversion_style.sales_pressure`, optional hint fields.

---

## Cloud Compatibility

### What runs in both modes

- Input validation and brand signal extraction (Node 2)
- LLM prompt assembly (Node 3)
- OpenAI API call (Node 4)
- JSON parsing, direct-field enforcement, forbidden_impressions merge, inline enum/structure validation (Node 5)

### What is skipped in cloud mode

| Skipped | Reason | Impact |
|---|---|---|
| AJV schema validation | No local schema file access in n8n Cloud | Replaced by inline enum + structure checks in Node 5 |
| Artifact write (`brand-positioning.json`) | No filesystem in n8n Cloud | `brand_positioning` returned inline in output; `artifact_path` is `null` |
| Checkpoint update | No filesystem in n8n Cloud | No checkpoint state updated |

In cloud mode, `brand_positioning` is carried forward inline through the orchestrator chain and is visible in the `Phase 3 Complete` output.

---

## Orchestrator Changes

### Updated: Phase 2 Complete

Now carries `store_profile`, `normalized_intake_payload`, `runtime_config`, and `market_intelligence` forward to Phase 3. Previously Phase 2 Complete was a terminal node.

`market_intelligence` flows inline in both cloud and self-hosted modes (directly from the `build-market-intelligence` subworkflow output).

### New nodes added

| ID suffix | Node name | Purpose |
|---|---|---|
| 000000000019 | Prepare Brand Positioning Input | Bridge node — assembles subworkflow input |
| 000000000020 | Run build-brand-positioning | executeWorkflow node |
| 000000000021 | Brand Positioning Success? | IF check on status == SUCCESS |
| 000000000022 | Halt - Brand Positioning Failed | Error halt node |
| 000000000023 | Phase 3 Complete | Terminal summary node; carries `brand_positioning` forward |

---

## Setup Steps

### n8n Cloud (smoke test)

1. Import `workflows/n8n/build-brand-positioning.n8n.json` into n8n Cloud.
2. In the `LLM Synthesis: Brand Positioning` node, replace `REPLACE_WITH_N8N_OPENAI_CREDENTIAL_ID` with your OpenAI credential ID (found in n8n > Settings > Credentials > OpenAI credential URL).
3. Note the workflow ID from the URL.
4. Import `workflows/n8n/orchestrate-phase1.n8n.json` (or update the existing orchestrator).
5. In the `Run build-brand-positioning` node, replace `REPLACE_WITH_BUILD_BRAND_POSITIONING_WORKFLOW_ID` with the workflow ID from step 3.
6. Trigger the orchestrator with the usual smoke-test payload. The chain now runs through Phase 3 Complete.

### Self-hosted

1. Same workflow import steps as above.
2. Ensure `STORE_OS_AJV_SCHEMA_PATH` points to the `schemas/` directory containing `brand-positioning.schema.json`.
3. Ensure `ajv@8` is installed in n8n's node_modules (`npm install ajv` in the n8n directory).
4. `STORE_OS_PROJECT_ROOT` must exist and be writable — `brand-positioning.json` is written to `{project_root}/{project_id}/brand-positioning.json`.

---

## Known Assumptions

- `market_intelligence` always flows inline from the orchestrator in both modes. The subworkflow does not read it from disk directly.
- Inline validation (enum checks, required fields) runs in both modes. Full AJV validation is self-hosted only.
- All LLM outputs are synthesis-based planning hypotheses. The `notes` field in `brand_positioning` explicitly labels this with an evidence boundary message.
- `build-competitor-clusters` is the documented next workflow but is not yet implemented.

## What Remains Partial / Cloud-Limited

| Item | Status |
|---|---|
| AJV schema validation | Self-hosted only — cloud uses inline checks |
| Artifact persistence | Self-hosted only — cloud returns inline |
| Checkpoint update | Self-hosted only |
| `build-competitor-clusters` | Not yet implemented |
| Downstream consumers (design-system, product-content, collection-content, pattern-manifest) | Out of scope for Phase 2 |
| Human review gate enforcement | Controlled by `manual_review_required` in intake — not enforced at this workflow level |

## Confirmed execution status

Phase 14 is now merged to `main` and has been successfully smoke-tested in n8n Cloud as the next executable runtime stage after `build-market-intelligence`.

Confirmed cloud execution chain:

- `resolve-runtime-config`
- `intake-store-input`
- `import-shopify-data`
- `build-store-profile`
- `build-market-intelligence`
- `build-brand-positioning`

Confirmed cloud-mode outcome:

- `store_profile` is returned inline
- `market_intelligence` is returned inline
- `brand_positioning` is returned inline
- `cloud_mode: true`
- no disk artifacts are written in cloud mode
- expected cloud warnings about missing persistence / local validation remain acceptable

Observed completion message pattern:

> Phase 3 chain completed (cloud mode) for project: <project_id> | No artifacts were written to disk. brand_positioning is available in this output. | Next: build-competitor-clusters (Phase 4+ — not yet implemented).

Notes:

- `build-brand-positioning` requires `store_profile` and `market_intelligence` as upstream inputs
- testing the workflow in isolation with incomplete input will fail by design
- the correct validation path is end-to-end execution through `orchestrate-phase1`
- the cloud smoke-test path remains preserved
- the self-hosted persistence path remains conceptually open and is not replaced by the cloud-mode implementation
